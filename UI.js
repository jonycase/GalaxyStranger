// UI.js
import { StarBackground } from './Background.js';
import { GalaxyMap } from './GalaxyMap.js';

// Animation easing helper
function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// Global flag to prevent interaction during travel
let isTraveling = false;

export class UI {
    constructor(gameState, encounterManager) {
        this.gameState = gameState;
        this.encounterManager = encounterManager;

        // Camera properties
        this.camera = {
            x: 0,
            y: 0,
            zoom: 6,
            minZoom: 1,
            maxZoom: 15
        };

        // 1. Initialize Parallax Background
        this.background = new StarBackground({
            tileSize: 1024,
            baseColor: '#020205',
            nebulaDensity: 15
        });

        // 2. Initialize Galaxy Map (Big Map)
        this.bigMap = new GalaxyMap(
            gameState,
            () => { /* On Close Callback (optional) */ },
            (target) => { 
                // On Set Target Callback
                this.gameState.targetSystem = target;
                this.updateUI();
                this.showNotification(target ? `Destination Set: ${target.name}` : "Destination Cleared");
                this.scheduleUpdate();
            }
        );

        // Pools & Data Structures for Local View
        this.systemPool = [];
        this.namePool = [];
        this.activeSystems = new Map();
        this.systemMap = new Map();

        // DOM References
        this.galaxyCanvas = null;
        this.systemContainer = null;
        this.shipContainer = null;
        this.shipIndicatorEl = null;
        this.hudPointerEl = null;

        // State flags
        this.pendingUpdate = false;
        this.cameraControlsInitialized = false;

        // Bind animation frame to 'this'
        this._onAnimationFrame = this._onAnimationFrame.bind(this);

        // Global click blocker during travel
        document.addEventListener('click', (e) => {
            if (isTraveling && e.target.closest('button')) {
                this.showNotification("Cannot interact while traveling!");
                e.preventDefault();
                e.stopPropagation();
            }
        }, true);
        
        // Setup non-canvas event listeners (Buttons, Tabs)
        this.setupAppEventListeners();
    }

    setupCanvas() {
        this.galaxyCanvas = document.getElementById('galaxy-canvas');
        this.systemContainer = document.getElementById('system-container');
        this.shipContainer = document.getElementById('ship-container');

        if (!this.galaxyCanvas || !this.systemContainer || !this.shipContainer) return;

        // CRITICAL: Disable browser gestures on the canvas for custom pinch/zoom
        this.galaxyCanvas.style.touchAction = 'none';

        // Force initial resize calculation
        this.handleResize();

        // Cache systems for fast lookup
        this.systemMap.clear();
        this.gameState.galaxy.forEach(sys => this.systemMap.set(sys.id, sys));

        // Create DOM Pool
        this._createPool(Math.min(120, Math.max(40, Math.floor(this.gameState.galaxySize / 10))));

        // Create Ship Indicator
        this.shipContainer.innerHTML = '';
        const shipIndicator = document.createElement('div');
        shipIndicator.className = 'ship-indicator';
        shipIndicator.innerHTML = '<i class="fas fa-space-shuttle"></i>';
        this.shipIndicatorEl = shipIndicator;
        this.shipContainer.appendChild(this.shipIndicatorEl);

        // Create HUD Pointer Element
        // Remove existing if hot-reloading
        const existingHud = document.querySelector('.hud-pointer');
        if(existingHud) existingHud.remove();

        const hud = document.createElement('div');
        hud.className = 'hud-pointer';
        hud.style.display = 'none';
        hud.innerHTML = `
            <div class="hud-pointer-arrow"></div>
            <div class="hud-pointer-info"></div>
        `;
        document.querySelector('.map-container').appendChild(hud);
        this.hudPointerEl = hud;

        // Add "Open Map" button to Status Tab
        this.addMapButton();

        // Initial Camera Position
        this.centerCameraOnShip();
        
        // Setup Input Controls
        this.setupHoverInput();      // Tooltips
        this.setupCameraControls();  // Pan/Zoom/Click

        // Handle Window Resize
        window.addEventListener('resize', () => {
            this.handleResize();
            this.scheduleUpdate();
        });

        // Start Rendering Loop
        requestAnimationFrame(this._onAnimationFrame);
        
        // Cleanup old DOM elements
        Array.from(this.systemContainer.children).forEach(el => {
            if (el.id === 'map-center-btn') return;
            el.remove();
        });
        this.activeSystems.clear();
    }

    addMapButton() {
        const statusTab = document.querySelector('.status-tab');
        if (statusTab && !document.getElementById('btn-open-bigmap')) {
            const btn = document.createElement('button');
            btn.id = 'btn-open-bigmap';
            btn.className = 'btn';
            btn.style.width = '100%';
            btn.style.margin = '15px 0';
            btn.style.background = 'linear-gradient(90deg, #4a4a9a, #6a3a9a)';
            btn.style.border = '1px solid #88f';
            btn.style.fontWeight = 'bold';
            btn.style.boxShadow = '0 0 10px rgba(100, 80, 255, 0.5)';
            btn.innerHTML = '<i class="fas fa-map-marked-alt"></i> OPEN GALAXY MAP';
            
            btn.addEventListener('click', () => {
                this.bigMap.open();
            });

            // Insert before controls if possible, else append
            const controls = statusTab.querySelector('.mobile-controls');
            if(controls) {
                statusTab.insertBefore(btn, controls);
            } else {
                statusTab.appendChild(btn);
            }
        }
    }

    handleResize() {
        if (!this.galaxyCanvas) return;
        const displayWidth = this.galaxyCanvas.clientWidth;
        const displayHeight = this.galaxyCanvas.clientHeight;

        if (this.galaxyCanvas.width !== displayWidth || this.galaxyCanvas.height !== displayHeight) {
            this.galaxyCanvas.width = displayWidth;
            this.galaxyCanvas.height = displayHeight;
        }
    }

    // --- MAIN RENDER LOOP ---
    _onAnimationFrame(timestamp) {
        // 1. Draw Parallax Background
        if (this.galaxyCanvas) {
            const ctx = this.galaxyCanvas.getContext('2d');
            this.background.draw(
                ctx, 
                this.camera.x, 
                this.camera.y, 
                this.galaxyCanvas.width, 
                this.galaxyCanvas.height,
                timestamp
            );
        }

        // 2. Update Ship DOM Position
        this.updateShipPosition();

        // 3. Update HUD Pointer Arrow
        this.updateHudPointer();

        requestAnimationFrame(this._onAnimationFrame);
    }

    updateHudPointer() {
        if (!this.hudPointerEl || !this.gameState.targetSystem || !this.galaxyCanvas) {
            if(this.hudPointerEl) this.hudPointerEl.style.display = 'none';
            return;
        }

        const target = this.gameState.targetSystem;
        const ship = this.gameState.ship;
        const w = this.galaxyCanvas.width;
        const h = this.galaxyCanvas.height;

        // Calculate Angle
        const dx = target.x - ship.x;
        const dy = target.y - ship.y;
        const angle = Math.atan2(dy, dx);

        // Check Visibility on Screen
        const screenX = (target.x - this.camera.x) * this.camera.zoom + w / 2;
        const screenY = (target.y - this.camera.y) * this.camera.zoom + h / 2;
        const padding = 40; // Distance from edge

        const isOffScreen = 
            screenX < padding || screenX > w - padding || 
            screenY < padding || screenY > h - padding;

        if (!isOffScreen) {
            this.hudPointerEl.style.display = 'none';
            return;
        }

        this.hudPointerEl.style.display = 'flex';

        // Calculate Edge Intersection
        const cx = w / 2;
        const cy = h / 2;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        
        // Project from center to screen edge
        let tX = cos > 0 ? (w - padding * 2) / 2 : -(w - padding * 2) / 2;
        let tY = tX * (sin / cos);
        const verticalLimit = (h - padding * 2) / 2;
        
        // If Y intersection is out of bounds, clip to Top/Bottom
        if (Math.abs(tY) > verticalLimit) {
            tY = sin > 0 ? verticalLimit : -verticalLimit;
            tX = tY * (cos / sin);
        }

        const finalX = cx + tX;
        const finalY = cy + tY;

        // Apply Styles
        this.hudPointerEl.style.left = `${finalX}px`;
        this.hudPointerEl.style.top = `${finalY}px`;
        this.hudPointerEl.style.transform = `translate(-50%, -50%) rotate(${angle * (180/Math.PI)}deg)`;
        
        // Update Text
        const dist = this.gameState.calculateDistance(this.gameState.currentSystem, target);
        const info = this.hudPointerEl.querySelector('.hud-pointer-info');
        info.textContent = `${Math.round(dist)} LY`;
        // Counter-rotate text to keep it readable
        info.style.transform = `rotate(-${angle * (180/Math.PI)}deg)`;
    }

    // --- POOLING SYSTEM (Performance optimization) ---
    _createPool(size) {
        for (let i = 0; i < size; i++) {
            const dot = document.createElement('div');
            dot.className = 'system-dot';
            dot.style.pointerEvents = 'auto';
            const name = document.createElement('div');
            name.className = 'system-name';
            name.style.pointerEvents = 'none';
            this.systemPool.push(dot);
            this.namePool.push(name);
        }
    }

    _acquireElements() {
        if (this.systemPool.length === 0) this._createPool(20);
        const dot = this.systemPool.pop();
        const name = this.namePool.pop();

        // Reset DOM nodes
        if (dot) {
            dot.dataset.id = '';
            dot.className = 'system-dot';
            if (dot.parentNode) dot.parentNode.removeChild(dot);
            dot.style.pointerEvents = 'auto';
        }
        if (name) {
            name.textContent = '';
            name.className = 'system-name';
            if (name.parentNode) name.parentNode.removeChild(name);
            name.style.pointerEvents = 'none';
        }
        return { dot, name };
    }

    _releaseElements(pair) {
        if (!pair) return;
        const dot = pair.dot || pair.dotEl || null;
        const name = pair.name || pair.nameEl || null;

        try {
            if (dot && dot.parentNode) dot.parentNode.removeChild(dot);
            if (name && name.parentNode) name.parentNode.removeChild(name);
        } catch (e) { }

        if (dot) {
            dot.className = 'system-dot';
            dot.style = 'pointer-events: auto;'; // Reset inline styles
            this.systemPool.push(dot);
        }
        if (name) {
            name.className = 'system-name';
            name.textContent = '';
            name.style = 'pointer-events: none;';
            this.namePool.push(name);
        }
    }

    // --- LOCAL MAP RENDERING ---
    _getVisibleWorldRect(margin = 80) {
        const w = this.galaxyCanvas.width;
        const h = this.galaxyCanvas.height;
        const halfW = w / 2 / this.camera.zoom;
        const halfH = h / 2 / this.camera.zoom;
        return {
            left: this.camera.x - halfW - margin / this.camera.zoom,
            right: this.camera.x + halfW + margin / this.camera.zoom,
            top: this.camera.y - halfH - margin / this.camera.zoom,
            bottom: this.camera.y + halfH + margin / this.camera.zoom
        };
    }

    scheduleUpdate() {
        if (this.pendingUpdate) return;
        this.pendingUpdate = true;
        requestAnimationFrame(() => {
            this.pendingUpdate = false;
            this._updateView();
        });
    }

    _updateView() {
        if (!this.systemContainer || !this.galaxyCanvas) return;

        const rect = this._getVisibleWorldRect(120);
        const activeSet = this.activeSystems;
        const sysMap = this.systemMap;

        // 1. Cleanup out of view
        for (const [id, elements] of activeSet.entries()) {
            const sys = sysMap.get(id);
            if (!sys || (sys.x < rect.left || sys.x > rect.right || sys.y < rect.top || sys.y > rect.bottom)) {
                this._releaseElements(elements);
                activeSet.delete(id);
            }
        }

        // 2. Add in view
        for (let i = 0, len = this.gameState.galaxy.length; i < len; i++) {
            const sys = this.gameState.galaxy[i];
            if (sys.x >= rect.left && sys.x <= rect.right && sys.y >= rect.top && sys.y <= rect.bottom) {
                if (!activeSet.has(sys.id)) {
                    const { dot, name } = this._acquireElements();
                    dot.dataset.id = sys.id;
                    dot.style.backgroundColor = sys.discovered ? this._getEconomyColor(sys.economy) : '#666666';
                    name.textContent = sys.discovered ? sys.name : '???';
                    this.systemContainer.appendChild(dot);
                    this.systemContainer.appendChild(name);
                    activeSet.set(sys.id, { dotEl: dot, nameEl: name });
                }
            }
        }

        // 3. Render positions & styles
        for (const [id, elements] of activeSet.entries()) {
            const sys = sysMap.get(id);
            if (!sys) continue;
            const screenX = (sys.x - this.camera.x) * this.camera.zoom + this.galaxyCanvas.width / 2;
            const screenY = (sys.y - this.camera.y) * this.camera.zoom + this.galaxyCanvas.height / 2;

            const dotEl = elements.dotEl;
            const nameEl = elements.nameEl;

            dotEl.style.left = `${Math.round(screenX - 6)}px`;
            dotEl.style.top = `${Math.round(screenY - 6)}px`;
            nameEl.style.left = `${Math.round(screenX + 10)}px`;
            nameEl.style.top = `${Math.round(screenY - 25)}px`;

            const desiredColor = sys.discovered ? this._getEconomyColor(sys.economy) : '#666666';
            if (dotEl.style.backgroundColor !== desiredColor) dotEl.style.backgroundColor = desiredColor;

            // Selection & Target styles
            const isTarget = sys === this.gameState.targetSystem;
            const isCurrent = sys === this.gameState.currentSystem;

            dotEl.classList.toggle('selected-system', isCurrent);
            
            if(isTarget) {
                dotEl.style.boxShadow = '0 0 15px #ffff00, 0 0 25px #ffff00';
                dotEl.style.zIndex = 100;
            } else {
                dotEl.style.boxShadow = '0 0 10px currentColor';
                dotEl.style.zIndex = 2;
            }
        }

        this.updateShipPosition();
    }

    _getEconomyColor(economy) {
        switch (economy) {
            case 'unpopulated': return '#bf683f';
            case 'agricultural': return '#66cc66';
            case 'industrial': return '#cc6666';
            case 'tech': return '#6666cc';
            case 'mining': return '#cccc66';
            case 'trade': return '#cc66cc';
            case 'military': return '#cc6666';
            default: return '#aaaaaa';
        }
    }

    // --- CAMERA LOGIC ---
    centerCameraOnShip() {
        this.camera.x = this.gameState.ship.x;
        this.camera.y = this.gameState.ship.y;
        this.camera.zoom = 3.0;
        this.scheduleUpdate();
    }

    moveCamera(dx, dy) {
        this.camera.x += dx / this.camera.zoom;
        this.camera.y += dy / this.camera.zoom;
        this.scheduleUpdate();
    }

    setZoom(zoom) {
        this.camera.zoom = Math.max(this.camera.minZoom, Math.min(this.camera.maxZoom, zoom));
        this.scheduleUpdate();
    }

    updateShipPosition() {
        if (!this.shipIndicatorEl || !this.gameState.currentSystem || !this.galaxyCanvas) return;
        const screenX = (this.gameState.ship.x - this.camera.x) * this.camera.zoom + this.galaxyCanvas.width / 2;
        const screenY = (this.gameState.ship.y - this.camera.y) * this.camera.zoom + this.galaxyCanvas.height / 2;
        this.shipIndicatorEl.style.left = `${Math.round(screenX - 12)}px`;
        this.shipIndicatorEl.style.top = `${Math.round(screenY - 12)}px`;
        this.shipIndicatorEl.style.transform = `rotate(${this.gameState.ship.rotation}deg)`;
    }

    // --- INPUT & CONTROLS (Unified Touch/Mouse) ---
    
    setupHoverInput() {
        this.systemContainer.addEventListener('pointermove', (e) => {
            const target = e.target.closest('.system-dot');
            if (!target) {
                this.hideSystemInfo();
                return;
            }
            const systemId = parseInt(target.dataset.id, 10);
            const system = this.systemMap.get(systemId);
            if (system) {
                this.showSystemInfo(system, e.clientX, e.clientY);
            }
        });
        this.systemContainer.addEventListener('pointerleave', () => this.hideSystemInfo());
    }

    selectSystem(systemId) {
        const system = this.systemMap.get(systemId);
        if (system && system !== this.gameState.currentSystem) {
            this.gameState.targetSystem = system;
            this.updateUI();
            this.showNotification(`Target: ${system.discovered ? system.name : 'Unknown System'}`);
            this.scheduleUpdate();
        }
    }

    handleProximityClick(clientX, clientY, radius) {
        const rect = this.galaxyCanvas.getBoundingClientRect();
        const clickX = clientX - rect.left;
        const clickY = clientY - rect.top;

        let closestDist = radius;
        let closestId = null;

        for (const [id] of this.activeSystems) {
            const sys = this.systemMap.get(id);
            if (!sys) continue;

            const screenX = (sys.x - this.camera.x) * this.camera.zoom + this.galaxyCanvas.width / 2;
            const screenY = (sys.y - this.camera.y) * this.camera.zoom + this.galaxyCanvas.height / 2;

            const dist = Math.hypot(clickX - screenX, clickY - screenY);

            if (dist < closestDist) {
                closestDist = dist;
                closestId = id;
            }
        }

        if (closestId !== null) {
            this.selectSystem(closestId);
        }
    }

    setupCameraControls() {
        const container = document.querySelector('.map-container');
        if (!container || this.cameraControlsInitialized) return;
        this.cameraControlsInitialized = true;

        let isDragging = false;
        let startX = 0;
        let startY = 0;
        let lastTouchDistance = 0;
        let totalDragDistance = 0;

        // Handler for Tap
        const handleTap = (clientX, clientY, target) => {
            if (isTraveling) return;
            const dot = target.closest('.system-dot');
            if (dot) {
                this.selectSystem(parseInt(dot.dataset.id, 10));
                return;
            }
            this.handleProximityClick(clientX, clientY, 45);
        };

        // --- MOUSE ---
        container.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            totalDragDistance = 0;
            container.style.cursor = 'grabbing';
        });

        container.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            e.preventDefault();
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            totalDragDistance += Math.hypot(dx, dy);
            this.moveCamera(-dx, -dy);
            startX = e.clientX;
            startY = e.clientY;
            this.scheduleUpdate();
        });

        container.addEventListener('mouseup', (e) => {
            isDragging = false;
            container.style.cursor = 'grab';
            if (totalDragDistance < 10) {
                handleTap(e.clientX, e.clientY, e.target);
            }
        });
        container.addEventListener('mouseleave', () => { isDragging = false; container.style.cursor = 'grab'; });

        // --- TOUCH (Passive: False required for smooth pan/zoom) ---
        container.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                isDragging = true;
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
                totalDragDistance = 0;
            } else if (e.touches.length === 2) {
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                lastTouchDistance = Math.sqrt(dx * dx + dy * dy);
                isDragging = false;
            }
        }, { passive: false });

        container.addEventListener('touchmove', (e) => {
            if (e.cancelable) e.preventDefault();

            if (isDragging && e.touches.length === 1) {
                const dx = e.touches[0].clientX - startX;
                const dy = e.touches[0].clientY - startY;
                totalDragDistance += Math.hypot(dx, dy);
                this.moveCamera(-dx, -dy);
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
                this.scheduleUpdate();
            } else if (e.touches.length === 2) {
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (lastTouchDistance > 0) {
                    const diff = distance - lastTouchDistance;
                    this.setZoom(this.camera.zoom + (diff * 0.015));
                }
                lastTouchDistance = distance;
            }
        }, { passive: false });

        container.addEventListener('touchend', (e) => {
            if (isDragging && e.touches.length === 0) {
                isDragging = false;
                if (totalDragDistance < 10) {
                    const touch = e.changedTouches[0];
                    const target = document.elementFromPoint(touch.clientX, touch.clientY);
                    handleTap(touch.clientX, touch.clientY, target || e.target);
                }
            }
            if (e.touches.length === 0) {
                isDragging = false;
                lastTouchDistance = 0;
            }
        });

        // --- WHEEL ---
        container.addEventListener('wheel', (e) => {
            e.preventDefault();
            const zoomAmount = e.deltaY > 0 ? -0.1 : 0.1;
            this.setZoom(this.camera.zoom + zoomAmount);
        }, { passive: false });
        
        // Center Button
        const existingBtn = document.querySelector('.map-center-btn');
        if (existingBtn) existingBtn.remove();
        const centerBtn = document.createElement('div');
        centerBtn.className = 'map-center-btn';
        centerBtn.innerHTML = '<i class="fas fa-crosshairs"></i>';
        centerBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.centerCameraOnShip();
        });
        container.appendChild(centerBtn);
    }

    // --- APP EVENT LISTENERS ---
    setupAppEventListeners() {
        // Travel Button
        const travelBtn = document.getElementById('travel-btn');
        if (travelBtn) travelBtn.addEventListener('click', () => {
            if (isTraveling) { this.showNotification("Already traveling!"); return; }
            if (!this.gameState.targetSystem) { this.showNotification("Select a system!"); return; }
            
            const result = this.gameState.travelToSystem();
            if (!result.success) { this.showNotification(result.message); return; }
            
            isTraveling = true;
            document.querySelectorAll('button').forEach(btn => btn.disabled = true);
            document.querySelector('.ui-panel').classList.add('traveling');
            this.showNotification(result.message);
            
            const startTime = Date.now();
            const travelDuration = 2000 * this.gameState.calculateDistance(this.gameState.currentSystem, this.gameState.targetSystem);
            
            const animateTravel = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / travelDuration, 1);
                const easedProgress = easeInOutCubic(progress);
                this.gameState.ship.travelProgress = easedProgress;
                
                if (this.shipIndicatorEl) {
                    const startSys = this.gameState.currentSystem;
                    const endSys = this.gameState.targetSystem;
                    this.gameState.ship.x = startSys.x + (endSys.x - startSys.x) * easedProgress;
                    this.gameState.ship.y = startSys.y + (endSys.y - startSys.y) * easedProgress;
                    this.updateShipPosition();
                    this.shipIndicatorEl.style.transform = `rotate(${this.gameState.ship.rotation}deg)`;
                }
                
                if (progress < 1) {
                    requestAnimationFrame(animateTravel);
                } else {
                    isTraveling = false;
                    document.querySelectorAll('button').forEach(btn => btn.disabled = false);
                    document.querySelector('.ui-panel').classList.remove('traveling');
                    const result = this.gameState.completeTravel();
                    this.showNotification(result.message);
                    
                    if (!this.gameState.currentSystem.discovered) {
                        this.gameState.currentSystem.discovered = true;
                        this.scheduleUpdate();
                    }

                    // Random Encounters
                    let pirateChance = 0.4;
                    if (this.gameState.currentSystem.security === 'low') pirateChance = 0.5;
                    else if (this.gameState.currentSystem.security === 'high') pirateChance = 0.3;
                    
                    if (Math.random() < pirateChance) {
                        const encounter = this.encounterManager.getRandomEncounter();
                        this.encounterManager.startEncounter(encounter.type);
                    }
                    
                    this.updateUI();
                }
            };
            animateTravel();
        });

        // Other Buttons via Delegation
        document.addEventListener('click', (e) => {
            if (e.target.id === 'refuel-btn') {
                const result = this.gameState.refuelShip();
                this.showNotification(result.message);
                this.updateUI();
            }
            
            if (e.target.classList.contains('contract-button')) {
                const result = this.gameState.handleContract(e.target.dataset.contract);
                this.showNotification(result.message);
                this.updateUI();
            }
            
            if (e.target.classList.contains('combat-btn')) {
                const action = e.target.dataset.action;
                if (action) this.encounterManager.handleEncounterAction(action);
            }
            
            if (e.target.dataset.good) {
                const result = this.gameState.tradeItem(e.target.dataset.good, e.target.dataset.action);
                this.showNotification(result.message);
                this.updateUI();
            }
            
            if (e.target.dataset.upgrade) {
                const result = this.gameState.upgradeShip(e.target.dataset.upgrade);
                this.showNotification(result.message);
                this.updateUI();
            }
        });
        
        // Tabs
        const tabs = document.querySelectorAll('.tab');
        if (tabs && tabs.length > 0) {
            tabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                    document.querySelectorAll('.panel-section').forEach(section => section.style.display = 'none');
                    const tabName = tab.dataset.tab;
                    const activeTab = document.querySelector(`.${tabName}-tab`);
                    if (activeTab) activeTab.style.display = 'block';
                });
            });
        }
    }

    // --- UI HELPERS ---
    updateUI() {
        // Only update elements if they exist
        const el = (id) => document.getElementById(id);
        
        if (el('credits')) el('credits').textContent = this.gameState.credits.toLocaleString() + ' CR';
        if (el('fuel')) el('fuel').textContent = `${Math.round(this.gameState.fuel)}/${this.gameState.maxFuel}`;
        if (el('hull')) el('hull').textContent = this.gameState.ship.hull + '%';
        
        const cargoSpace = this.gameState.cargo.reduce((sum, item) => sum + item.quantity, 0);
        if (el('cargo-space')) el('cargo-space').textContent = `${cargoSpace}/${this.gameState.cargoCapacity}`;
        
        if (this.gameState.targetSystem) {
            if (el('target-system')) el('target-system').textContent = this.gameState.targetSystem.discovered ? 
                this.gameState.targetSystem.name : 'Unknown System';
            const distance = this.gameState.calculateDistance(this.gameState.currentSystem, this.gameState.targetSystem);
            if (el('distance')) el('distance').textContent = Math.round(distance * 10) / 10 + ' LY';
            if (el('fuel-cost')) el('fuel-cost').textContent = Math.ceil(distance);
        } else {
            if (el('target-system')) el('target-system').textContent = 'None';
            if (el('distance')) el('distance').textContent = '0 LY';
            if (el('fuel-cost')) el('fuel-cost').textContent = '0';
        }
        
        this.updateMarketUI();
        this.updateCargoUI();
        this.updateContractsList();
        this.updateSystemOverview();
        
        // Scan Button Logic
        const statusTab = document.querySelector('.status-tab');
        if (statusTab && this.gameState.ship.radar > 0 && !document.getElementById('scan-btn')) {
            const scanButton = document.createElement('button');
            scanButton.id = 'scan-btn';
            scanButton.className = 'btn mobile-btn';
            scanButton.innerHTML = '<i class="fas fa-satellite"></i> SCAN SYSTEMS';
            scanButton.style.marginTop = '10px';
            scanButton.style.width = '100%';
            
            const controls = statusTab.querySelector('.mobile-controls');
            if(controls) statusTab.insertBefore(scanButton, controls);
            else statusTab.appendChild(scanButton);

            scanButton.addEventListener('click', () => {
                const result = this.gameState.scanNearbySystems();
                this.showNotification(result.message);
                if (result.success) {
                    this.scheduleUpdate();
                    this.updateUI();
                }
            });
        }
    }

    updateMarketUI() {
        const marketContainer = document.querySelector('.market-grid');
        if (!marketContainer || !this.gameState.currentSystem) return;
        
        if (!this.gameState.currentSystem.hasMarket) {
            marketContainer.innerHTML = '<div class="no-market-message">Market not available in this system</div>';
            return;
        }
        
        marketContainer.innerHTML = `
            <div class="market-header">COMMODITY</div>
            <div class="market-header">BUY</div>
            <div class="market-header">SELL</div>
            <div class="market-header">STOCK</div>
            <div class="market-header">ACTIONS</div>
        `;
        
        this.gameState.goods.forEach(good => {
            const marketItem = this.gameState.currentSystem.market[good.id];
            if (!marketItem) return;
            const marketElement = document.createElement('div');
            marketElement.className = 'market-item';
            const illegalIndicator = marketItem.illegal ? '<i class="fas fa-exclamation-triangle" style="color: #ff6666;"></i> ' : '';
            const stockIndicator = marketItem.quantity > 0 ? 
                `<span style="color: #66ff99;">${marketItem.quantity}</span>` : 
                `<span style="color: #ff6666;">0</span>`;
            marketElement.innerHTML = `
                <span>${illegalIndicator}${marketItem.name}</span>
                <span>${marketItem.buyPrice} CR</span>
                <span>${marketItem.sellPrice} CR</span>
                <span>${stockIndicator}</span>
                <div style="display: flex; gap: 5px; justify-content: center;">
                    <button class="btn btn-buy" data-good="${good.id}" data-action="buy" ${marketItem.quantity <= 0 ? 'disabled' : ''}>BUY</button>
                    <button class="btn btn-sell" data-good="${good.id}" data-action="sell">SELL</button>
                </div>
            `;
            marketContainer.appendChild(marketElement);
        });
    }

    updateCargoUI() {
        const cargoContainer = document.getElementById('cargo-hold');
        if (!cargoContainer) return;
        cargoContainer.innerHTML = '';
        
        if (this.gameState.cargo.length === 0) {
            const emptyItem = document.createElement('div');
            emptyItem.className = 'cargo-item';
            emptyItem.innerHTML = '<span style="grid-column: 1 / span 3; text-align: center; color: #8888ff;">Cargo hold is empty</span>';
            cargoContainer.appendChild(emptyItem);
        } else {
            this.gameState.cargo.forEach(item => {
                const cargoItem = document.createElement('div');
                cargoItem.className = 'cargo-item';
                const illegalIndicator = item.illegal ? '<i class="fas fa-exclamation-triangle" style="color: #ff6666;"></i> ' : '';
                const marketItem = this.gameState.currentSystem.market?.[item.id];
                const canSell = this.gameState.currentSystem.hasMarket && marketItem;
                cargoItem.innerHTML = `
                    <span>${illegalIndicator}${item.name}</span>
                    <span>${item.quantity}</span>
                    <button class="btn btn-sell" data-good="${item.id}" data-action="sell-one" ${canSell ? '' : 'disabled'}>SELL</button>
                `;
                cargoContainer.appendChild(cargoItem);
            });
        }
    }

    updateSystemOverview() {
        // ... (Existing system overview logic)
        // Using abbreviated logic here to fit response, assumes standard DOM structure
        if(this.gameState.currentSystem) {
           const sys = this.gameState.currentSystem;
           const els = { 
               name: document.getElementById('current-system-name'),
               eco: document.getElementById('current-system-economy'),
               sec: document.getElementById('current-system-security')
           };
           if(els.name) els.name.textContent = sys.name;
           if(els.eco) els.eco.textContent = `Economy: ${sys.economy}`;
           if(els.sec) els.sec.textContent = `Security: ${sys.security}`;
        }
        
        const nearbySystems = document.getElementById('nearby-systems');
        if (nearbySystems && this.gameState.currentSystem) {
            nearbySystems.innerHTML = '';
            const nearby = this.gameState.galaxy.filter(s => {
                if (s === this.gameState.currentSystem) return false;
                const d = this.gameState.calculateDistance(this.gameState.currentSystem, s);
                return d <= 50 && s.discovered;
            }).sort((a, b) => {
                const dA = this.gameState.calculateDistance(this.gameState.currentSystem, a);
                const dB = this.gameState.calculateDistance(this.gameState.currentSystem, b);
                return dA - dB;
            });
            
            nearby.slice(0, 5).forEach(s => {
                const d = this.gameState.calculateDistance(this.gameState.currentSystem, s);
                const el = document.createElement('div');
                el.className = 'system-overview-item';
                el.innerHTML = `<div><strong>${s.name}</strong></div><div>${Math.round(d)} LY</div>`;
                nearbySystems.appendChild(el);
            });
        }
    }

    updateContractsList() {
        const contractsList = document.getElementById('contracts-list');
        if (!contractsList) return;
        contractsList.innerHTML = '';
        if (this.gameState.contracts.length === 0) {
            contractsList.innerHTML = '<div style="text-align: center; padding: 10px; color: #8888ff;">No contracts available</div>';
            return;
        }
        this.gameState.contracts.forEach(contract => {
            if (contract.completed) return;
            const contractEl = document.createElement('div');
            contractEl.className = 'contract-item';
            let buttonText = "Accept";
            if (contract.type === 'delivery') {
                if(contract.originSystem === this.gameState.currentSystem) buttonText = "Pick Up";
                else if(contract.targetSystem === this.gameState.currentSystem) buttonText = "Deliver";
            }
            contractEl.innerHTML = `
                <div class="contract-header">
                    <h3>${contract.name}</h3>
                    <div class="contract-reward">${contract.reward.toLocaleString()} CR</div>
                </div>
                <div class="contract-details">${contract.description}</div>
                <button class="btn contract-button" data-contract="${contract.id}">${buttonText}</button>
            `;
            contractsList.appendChild(contractEl);
        });
    }

    showNotification(message) {
        const notification = document.getElementById('notification');
        if (!notification) return;
        notification.textContent = message;
        notification.style.opacity = '1';
        notification.style.transform = 'translateX(-50%) translateY(0)';
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(-50%) translateY(-20px)';
        }, 3000);
    }

    showSystemInfo(system, clientX, clientY) {
        const panel = document.getElementById('system-info-panel');
        if (!panel) return;
        const screenX = (system.x - this.camera.x) * this.camera.zoom + this.galaxyCanvas.width / 2;
        const screenY = (system.y - this.camera.y) * this.camera.zoom + this.galaxyCanvas.height / 2;
        
        let content = `<h3>${system.discovered ? system.name : 'Unknown System'}</h3>`;
        if(system.discovered) {
            content += `<div class="stat"><span>Economy:</span><span class="stat-value">${system.economy}</span></div>`;
            content += `<div class="stat"><span>Security:</span><span class="stat-value">${system.security}</span></div>`;
        } else {
            content += `<div class="stat"><span>Status:</span><span class="stat-value">Undiscovered</span></div>`;
        }
        panel.innerHTML = content;
        panel.style.left = `${screenX + 10}px`;
        panel.style.top = `${screenY}px`;
        panel.style.opacity = '1';
    }

    hideSystemInfo() {
        const panel = document.getElementById('system-info-panel');
        if (panel) panel.style.opacity = '0';
    }
}