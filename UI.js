/* --- START OF FILE ui.js --- */

import { GalaxyMap } from './GalaxyMap.js';

// --- Helper: Easing function for smooth travel animation ---
function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// --- Global State: Block interactions during hyperspace ---
let isTraveling = false;

export class UI {
    constructor(gameState, encounterManager) {
        this.gameState = gameState;
        this.encounterManager = encounterManager;
        
        // Camera settings for the Local Dashboard View
        // Note: The GalaxyMap class maintains its own camera, but we keep values here for syncing
        this.camera = {
            x: 0,
            y: 0,
            zoom: 3,
            minZoom: 0.5, 
            maxZoom: 10
        };

        // Map Instances (Initialized in setupCanvas)
        this.galaxyMap = null; 
        this.globalMap = null;

        // Optimization State
        this._lastPointerTarget = null;
        this._lastPointerDist = null;

        // Market State
        this.marketQtyMode = 1; // 1, 10, or 'all'

        // DOM References
        this.galaxyCanvas = null;
        this.shipIndicatorEl = null;
        this.targetPointerEl = null;

        // Bind the render loop context
        this._onAnimationFrame = this._onAnimationFrame.bind(this);

        // Global Event Listener: Prevent button clicks while traveling
        document.addEventListener('click', (e) => {
            if (isTraveling) {
                // Allow closing the map if it happens to be open, but block game actions
                if (e.target.closest('.btn-close')) return;
                
                if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
                    this.showNotification("Navigation systems locked during travel.");
                    e.preventDefault();
                    e.stopPropagation();
                }
            }
        }, true);
        
        this.setupMobileFastClick();
        // Initialize generic App listeners (Tabs, etc.)
        this.setupAppEventListeners();
    }

    /**
     * Called by Game.js when the DOM is ready.
     * Initializes maps, canvas, and HUD elements.
     */
    setupCanvas() {
        this.galaxyCanvas = document.getElementById('galaxy-canvas');
        const shipContainer = document.getElementById('ship-container');
        this.targetPointerEl = document.getElementById('target-pointer');

        if (!this.galaxyCanvas || !shipContainer) {
            console.error("Critical UI elements missing in DOM (galaxy-canvas or ship-container).");
            return;
        }

        // 1. Initialize Local Map (Dashboard ID: 'galaxy-canvas')
        this.galaxyMap = new GalaxyMap(this.gameState, this, 'galaxy-canvas');
        
        // 2. Initialize Global Map (Modal ID: 'full-galaxy-canvas')
        this.globalMap = new GalaxyMap(this.gameState, this, 'full-galaxy-canvas');

        // 3. Create DOM Ship Indicator (The arrow icon overlaying the local map)
        shipContainer.innerHTML = '';
        this.shipIndicatorEl = document.createElement('div');
        this.shipIndicatorEl.className = 'ship-indicator';
        this.shipIndicatorEl.innerHTML = '<i class="fas fa-space-shuttle"></i>';
        shipContainer.appendChild(this.shipIndicatorEl);

        // 4. Initial Camera Setup
        this.centerCameraOnShip();
        
        // 5. Setup Local Map Interactions
        this.setupInputHandlers();   // Hover tooltips
        this.setupCameraControls();  // Drag and Zoom

        // 6. Bind "Open Galaxy Map" Button
        const openMapBtn = document.getElementById('open-map-btn');
        if(openMapBtn) {
            openMapBtn.onclick = () => {
                if(isTraveling) {
                    this.showNotification("Sensors offline during hyperspace.");
                    return;
                }
                this.globalMap.open();
            };
        }

        // 7. Handle Window Resize
        window.addEventListener('resize', () => this.handleResize());

        // 8. Start the Render Loop
        requestAnimationFrame(this._onAnimationFrame);
    }

    handleResize() {
        if (this.galaxyMap) this.galaxyMap.resize();
        if (this.globalMap) this.globalMap.resize();
    }

    /**
     * The Main Game Loop (Visuals Only)
     */
    _onAnimationFrame() {
        // Render the Local Map Canvas
        if (this.galaxyMap) {
            this.galaxyMap.render();
        }

        // Update HTML Overlays (Ship Icon & Target Arrow)
        this.updateShipPosition();
        this.updateTargetPointer(); 
        
        requestAnimationFrame(this._onAnimationFrame);
    }

    // =========================================
    // HUD LOGIC (Ship Position & Target Arrow)
    // =========================================

    updateShipPosition() {
        if (!this.shipIndicatorEl || !this.galaxyMap) return;
        
        // Ask the map instance where the ship is on screen coordinates
        const screenPos = this.galaxyMap.worldToScreen(
            this.gameState.ship.x, 
            this.gameState.ship.y
        );
        
        // Apply CSS Transform
        // The .ship-indicator CSS handles the centering via margins
        this.shipIndicatorEl.style.transform = `translate(${screenPos.x}px, ${screenPos.y}px) rotate(${this.gameState.ship.rotation}deg)`;
        this.shipIndicatorEl.style.left = '0'; 
        this.shipIndicatorEl.style.top = '0';
    }

    updateTargetPointer() {
            if (!this.targetPointerEl || !this.galaxyMap || !this.gameState.targetSystem) {
                if(this.targetPointerEl) this.targetPointerEl.style.display = 'none';
                return;
            }

            const target = this.gameState.targetSystem;
            
            // Hide if we are currently at the target
            if (target === this.gameState.currentSystem) {
                this.targetPointerEl.style.display = 'none';
                return;
            }

            const w = this.galaxyCanvas.width;
            const h = this.galaxyCanvas.height;
            const cx = w / 2;
            const cy = h / 2;

            // Ask Map to Project Target to Screen Space
            const screenPos = this.galaxyMap.worldToScreen(target.x, target.y);

            // Define margin to keep arrow inside UI
            const margin = 40;
            
            // Check if target is visible on screen
            const isOnScreen = (
                screenPos.x >= margin && 
                screenPos.x <= w - margin && 
                screenPos.y >= margin && 
                screenPos.y <= h - margin
            );

            if (isOnScreen) {
                // Target is visible: Place pointer directly above it
                this.targetPointerEl.style.left = `${screenPos.x}px`;
                this.targetPointerEl.style.top = `${screenPos.y - 40}px`;
                this.targetPointerEl.style.transform = 'translate(-50%, -50%)';
                this.targetPointerEl.querySelector('.pointer-arrow').style.transform = 'rotate(180deg)';
            } else {
                // Target is off-screen: Clamp pointer to the edge
                
                // FIX: Changed 'pos.x' to 'screenPos.x' (variable name correction)
                const dx = screenPos.x - cx;
                const dy = screenPos.y - cy;
                const angle = Math.atan2(dy, dx);

                // Calculate intersection with screen box
                const boxW = (w / 2) - margin;
                const boxH = (h / 2) - margin;
                const absCos = Math.abs(Math.cos(angle));
                const absSin = Math.abs(Math.sin(angle));
                
                let finalX, finalY;

                if (boxW * absSin <= boxH * absCos) {
                    finalX = cx + (dx > 0 ? boxW : -boxW);
                    finalY = cy + (dx > 0 ? boxW : -boxW) * Math.tan(angle);
                } else {
                    finalY = cy + (dy > 0 ? boxH : -boxH);
                    finalX = cx + (dy > 0 ? boxH : -boxH) / Math.tan(angle);
                }

                this.targetPointerEl.style.left = `${finalX}px`;
                this.targetPointerEl.style.top = `${finalY}px`;
                this.targetPointerEl.style.transform = 'translate(-50%, -50%)';
                
                // Rotate arrow to point towards the off-screen target
                const rotDeg = angle * 180 / Math.PI + 90;
                this.targetPointerEl.querySelector('.pointer-arrow').style.transform = `rotate(${rotDeg}deg)`;  
            }

            this.targetPointerEl.style.display = 'flex';

                        // Update Text Info (Distance) - OPTIMIZED
                        // Only write to DOM if values have changed
                        const nameEl = document.getElementById('pointer-name');
                        const distEl = document.getElementById('pointer-dist');
                        
                        if (nameEl && this._lastPointerTarget !== target) {
                            nameEl.textContent = target.discovered ? target.name : 'Unknown';
                            this._lastPointerTarget = target;
                        }

                        if (distEl) {
                            const dist = Math.round(this.gameState.calculateDistance(this.gameState.currentSystem, target));
                            if (this._lastPointerDist !== dist) {
                                distEl.textContent = dist + " LY";
                                this._lastPointerDist = dist;
                            }
                        }
        }

    // =========================================
    // CAMERA CONTROLS (Local Map)
    // =========================================

    centerCameraOnShip() {
        // We manipulate the GalaxyMap's camera directly
        this.galaxyMap.camera.x = this.gameState.ship.x;
        this.galaxyMap.camera.y = this.gameState.ship.y;
        // Sync local reference
        this.camera = this.galaxyMap.camera;
    }

    setZoom(zoom) {
        const z = Math.max(this.camera.minZoom, Math.min(this.camera.maxZoom, zoom));
        this.galaxyMap.camera.zoom = z;
    }

    moveCamera(dx, dy) {
        this.galaxyMap.camera.x += dx / this.galaxyMap.camera.zoom;
        this.galaxyMap.camera.y += dy / this.galaxyMap.camera.zoom;
    }

    setupInputHandlers() {
        // Hover Tooltip Logic for Local Map
        this.galaxyCanvas.addEventListener('mousemove', (e) => {
            if(isTraveling) return;
            
            const rect = this.galaxyCanvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            // Delegate hit testing to the GalaxyMap instance
            const system = this.galaxyMap.getSystemAt(x, y);
            
            if (system) {
                this.galaxyCanvas.style.cursor = 'pointer';
                this.showSystemInfo(system, x, y);
            } else {
                this.galaxyCanvas.style.cursor = 'default';
                this.hideSystemInfo();
            }
        });

        this.galaxyCanvas.addEventListener('mouseleave', () => {
            this.hideSystemInfo();
        });
    }

    showSystemInfo(system, screenX, screenY) {
        const pointer = document.getElementById('hover-pointer');
        const content = pointer ? pointer.querySelector('.hover-details') : null;
        
        if (!pointer || !content) return;

        if (!system.discovered) {
            content.innerHTML = `
                <div style="color: #ff6666; font-weight:bold;">Unknown System</div>
                <div style="color: #aaa;">Undiscovered</div>
            `;
        } else {
            content.innerHTML = `
                <div style="color: #66ccff; font-weight:bold; border-bottom:1px solid #445; padding-bottom:2px; margin-bottom:2px;">${system.name}</div>
                <div class="hover-row"><span class="hover-label">Economy:</span> <span class="hover-val">${system.economy}</span></div>
                <div class="hover-row"><span class="hover-label">Sec:</span> <span class="hover-val">${system.security}</span></div>
            `;
        }

        pointer.style.display = 'flex';
        pointer.style.left = `${screenX}px`;
        pointer.style.top = `${screenY - 20}px`; 
        pointer.style.transform = 'translate(-50%, -100%)';
    }

    hideSystemInfo() {
        const pointer = document.getElementById('hover-pointer');
        if (pointer) pointer.style.display = 'none';
    }

    setupCameraControls() {
        // Recenter button only - GalaxyMap.js handles camera drag/zoom
        const centerBtn = document.querySelector('.map-center-btn');
        if(centerBtn) {
            centerBtn.onclick = () => this.centerCameraOnShip();
        }
    }

    // =========================================
    // UI PANELS & DATA BINDING
    // =========================================

    updateUI() {
        // If global map is open, update its info box
        if(this.globalMap && this.globalMap.active) {
            this.globalMap.updateInfoBox();
        }

        const el = (id) => document.getElementById(id);
        
        // 1. Top Status Bar
        if(el('credits')) el('credits').textContent = Math.floor(this.gameState.credits).toLocaleString() + ' CR';
        if(el('fuel')) el('fuel').textContent = `${Math.floor(this.gameState.fuel)}/${this.gameState.maxFuel}`;
        if(el('hull')) el('hull').textContent = Math.floor(this.gameState.ship.hull) + '%';
        
        const cargoCount = this.gameState.cargo.reduce((a,b) => a + b.quantity, 0);
        if(el('cargo-space')) el('cargo-space').textContent = `${cargoCount}/${this.gameState.cargoCapacity}`;

        // 2. Navigation Panel
        const target = this.gameState.targetSystem;
        if(el('target-system')) el('target-system').textContent = target ? (target.discovered ? target.name : 'Unknown') : 'None';
        
        const dist = target ? this.gameState.calculateDistance(this.gameState.currentSystem, target) : 0;
        if(el('distance')) el('distance').textContent = Math.round(dist) + ' LY';
        if(el('fuel-cost')) el('fuel-cost').textContent = Math.ceil(dist);
        
                // 1. UPDATE SCAN BUTTON VISIBILITY
        const scanBtn = document.getElementById('scan-btn');
        if (scanBtn) {
            const radarLevel = this.gameState.ship.radar || 0;
            
            if (radarLevel >= 1) {
                scanBtn.style.display = 'inline-flex'; // Show button
                // Optional: Update tooltip to show current range
                scanBtn.title = `Range: ${radarLevel * 10} LY | Cost: 2 Fuel`;
            } else {
                scanBtn.style.display = 'none'; // Hide button
            }
        }

        // 3. Update Specific Panels
        this.updateMarketUI();
        this.updateCargoUI();
        this.updateShipyardUI();
        this.updateOverviewUI();
        this.updateContractsUI();
    }
    
    updateMarketUI() {
            const grid = document.querySelector('.market-grid');
            const marketContainer = document.querySelector('.market-tab'); 
            if(!grid || !marketContainer) return;
            
            const sys = this.gameState.currentSystem;
            
            if(!sys.hasMarket) {
                grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:20px; color:#888;">No Market Access in this System</div>';
                return;
            }

            // 1. Inject Quantity Controls
            let controls = document.getElementById('market-controls');
            if (!controls) {
                controls = document.createElement('div');
                controls.id = 'market-controls';
                controls.className = 'market-controls';
                grid.parentNode.insertBefore(controls, grid);
            }

            const getBtnClass = (mode) => `btn small ${this.marketQtyMode === mode ? 'btn-action' : ''}`;
            
            controls.innerHTML = `
                <span style="font-size:11px; color:#888; margin-right:10px;">AMOUNT:</span>
                <button class="${getBtnClass(1)}" id="qty-1">x1</button>
                <button class="${getBtnClass(10)}" id="qty-10">x10</button>
                <button class="${getBtnClass('all')}" id="qty-all">ALL</button>
            `;

            // Bind Toggles
            controls.querySelector('#qty-1').onclick = () => { this.marketQtyMode = 1; this.updateMarketUI(); };
            controls.querySelector('#qty-10').onclick = () => { this.marketQtyMode = 10; this.updateMarketUI(); };
            controls.querySelector('#qty-all').onclick = () => { this.marketQtyMode = 'all'; this.updateMarketUI(); };
            
            // 2. Build Grid
            grid.innerHTML = `
                <div class="market-header">ITEM</div>
                <div class="market-header">BUY</div>
                <div class="market-header">SELL</div>
                <div class="market-header">STOCK</div>
                <div class="market-header">ACTION</div>
            `;
            
            this.gameState.goods.forEach(g => {
                const m = sys.market[g.id];
                if(!m) return;
                
                const item = document.createElement('div');
                item.className = 'market-item';
                
                // Calculate dynamic cost for tooltip or display? For now just standard display
                // Check afford/space based on CURRENT MODE to disable buttons visually
                let canBuy = true;
                if (this.marketQtyMode === 'all' && m.quantity < 1) canBuy = false;
                else if (typeof this.marketQtyMode === 'number' && m.quantity < this.marketQtyMode) canBuy = false; // Optional: strict check
                
                // Strict check: Only disable if we can't buy ANY
                if (m.quantity <= 0 || this.gameState.credits < m.buyPrice) canBuy = false;

                const stockColor = m.quantity > 0 ? '#6f9' : '#f66';
                
                item.innerHTML = `
                    <div>${m.name} ${m.illegal ? '<i class="fas fa-exclamation-triangle" style="color:#f66" title="Illegal"></i>' : ''}</div>
                    <div>${m.buyPrice}</div>
                    <div>${m.sellPrice}</div>
                    <div style="color:${stockColor}">${m.quantity}</div>
                    <div style="display:flex; gap:5px;">
                        <button class="btn btn-buy small" data-id="${g.id}" ${canBuy ? '' : 'disabled'}>B</button>
                        <button class="btn btn-sell small" data-id="${g.id}">S</button>
                    </div>
                `;
                
                // Bind
                item.querySelector('.btn-buy').onclick = () => this.handleTrade(g.id, 'buy');
                item.querySelector('.btn-sell').onclick = () => this.handleTrade(g.id, 'sell');
                
                grid.appendChild(item);
            });
        }
    
    handleTrade(id, type) {
            // Ensure marketQtyMode is set (default to 1 if undefined)
            const qty = this.marketQtyMode || 1;
            
            const res = this.gameState.tradeItem(id, type, qty);
            
            this.showNotification(res.message);
            this.updateUI();
        }

    updateCargoUI() {
        const hold = document.getElementById('cargo-hold');
        if(!hold) return;
        hold.innerHTML = '';
        
        if(this.gameState.cargo.length === 0) {
            hold.innerHTML = '<div style="padding:10px; text-align:center; color:#555;">Cargo Hold Empty</div>';
            return;
        }
        
        this.gameState.cargo.forEach(c => {
            const div = document.createElement('div');
            div.className = 'cargo-item';
            
            // We can always sell if there is a market, even if they don't sell THAT item? 
            // Usually yes, merchants buy anything. But if your game logic requires the item to be in the market list:
            const canSell = this.gameState.currentSystem.hasMarket && this.gameState.currentSystem.market[c.id];
            
            div.innerHTML = `
                <span>${c.name} ${c.illegal ? '⚠️' : ''}</span>
                <span>${c.quantity}</span>
                <div style="display:flex; gap:5px;">
                    <button class="btn btn-sell small" title="Sell 1 Unit" ${canSell ? '' : 'disabled'}>SELL</button>
                    <button class="btn small" title="Jettison Cargo" style="color:#888; border-color:#444;"><i class="fas fa-trash"></i></button>
                </div>
            `;
            
            // Bind Sell One
            const btnSell = div.querySelector('.btn-sell');
            btnSell.onclick = () => this.handleTrade(c.id, 'sell-one');

            // Bind Drop
            const btnDrop = div.querySelectorAll('button')[1]; // The trash button
            btnDrop.onclick = () => {
                const res = this.gameState.dropItem(c.id);
                this.showNotification(res.message);
                this.updateUI();
            };

            hold.appendChild(div);
        });
    }
    
    updateShipyardUI() {
        const container = document.querySelector('.shipyard-tab');
        if (!container) return;
        
        // Clear previous content (but keep the header if it's static in HTML, 
        // though we usually rebuild the panel content in these methods)
        container.innerHTML = '';

        const sys = this.gameState.currentSystem;
        const ship = this.gameState.ship;

        // --- 1. SHIP OVERVIEW SECTION ---
        const shipSection = document.createElement('div');
        shipSection.className = 'ship-overview-panel';
        
        // Calculate derived stats
        const cargoUsed = this.gameState.cargo.reduce((a,b)=>a+b.quantity,0);
        const evasionChance = ship.evasion; 
        
        shipSection.innerHTML = `
            <div class="ship-visual">
                <i class="fas fa-space-shuttle ship-icon-large"></i>
                <div class="ship-name">MK-IV INTERCEPTOR</div>
                <div class="ship-class">Class: Frigate</div>
            </div>
            
            <div class="ship-stats-detailed">
                <div class="stat-row">
                    <span class="stat-label"><i class="fas fa-shield-alt"></i> HULL</span>
                    <div class="stat-bar-container">
                        <div class="stat-bar-fill" style="width:${(ship.hull/ship.maxHull)*100}%; background:var(--accent-danger);"></div>
                    </div>
                    <span class="stat-val">${Math.round(ship.hull)}/${ship.maxHull}</span>
                </div>

                <div class="stat-row">
                    <span class="stat-label"><i class="fas fa-sun"></i> SHIELDS</span>
                    <div class="stat-bar-container">
                        <div class="stat-bar-fill" style="width:${Math.min(100, ship.shields)}%; background:var(--accent-primary);"></div>
                    </div>
                    <span class="stat-val">${ship.shields} PWR</span>
                </div>

                <div class="stat-row">
                    <span class="stat-label"><i class="fas fa-gas-pump"></i> FUEL</span>
                    <div class="stat-bar-container">
                        <div class="stat-bar-fill" style="width:${(this.gameState.fuel/this.gameState.maxFuel)*100}%; background:var(--accent-warning);"></div>
                    </div>
                    <span class="stat-val">${Math.floor(this.gameState.fuel)}/${this.gameState.maxFuel}</span>
                </div>

                <div class="stat-grid-small">
                    <div class="mini-stat" title="Combat Damage">
                        <i class="fas fa-crosshairs"></i> <span>DMG: ${ship.damage}</span>
                    </div>
                    <div class="mini-stat" title="Evasion Chance">
                        <i class="fas fa-wind"></i> <span>EVA: ${evasionChance}%</span>
                    </div>
                    <div class="mini-stat" title="Sensor Range">
                        <i class="fas fa-satellite-dish"></i> <span>RDR: Lvl ${ship.radar}</span>
                    </div>
                    <div class="mini-stat" title="Cargo Capacity">
                        <i class="fas fa-box"></i> <span>CAP: ${cargoUsed}/${this.gameState.cargoCapacity}</span>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(shipSection);

        // --- 2. UPGRADES MARKET SECTION ---
        const upgradeHeader = document.createElement('h2');
        upgradeHeader.innerHTML = `<i class="fas fa-tools"></i> ENGINEERING BAY`;
        upgradeHeader.style.marginTop = '20px';
        container.appendChild(upgradeHeader);

        // Check if shipyard exists
        if (!sys.hasShipyard) {
            const noService = document.createElement('div');
            noService.className = 'no-service-msg';
            noService.innerHTML = `
                <i class="fas fa-lock"></i>
                <p>SHIPYARD SERVICES UNAVAILABLE IN THIS SYSTEM</p>
                <small>Travel to Industrial or Tech worlds.</small>
            `;
            container.appendChild(noService);
            return;
        }

        // List Upgrades
        const list = document.createElement('div');
        list.className = 'upgrade-list';

        this.gameState.upgrades.forEach(u => {
            const item = document.createElement('div');
            item.className = 'upgrade-item';
            
            // 1. Get Stats
            const currentLvl = this.gameState.ship.upgrades[u.id] || 0;
            const cost = u.cost; // You can add scaling here: u.cost * (currentLvl + 1)
            const canAfford = this.gameState.credits >= cost;
            
            // 2. Render HTML
            item.innerHTML = `
                <div class="upgrade-icon"><i class="${u.icon}"></i></div>
                <div class="upgrade-info">
                    <div class="upgrade-name">
                        ${u.name} 
                        <span class="lvl-badge">LVL ${currentLvl}</span>
                    </div>
                    <div class="upgrade-desc">${u.description}</div>
                    <div class="upgrade-bonus">Effect: +${u.effect} (Total: +${u.effect * currentLvl})</div>
                </div>
                <div class="upgrade-action">
                    <div class="upgrade-cost ${canAfford ? 'text-success' : 'text-danger'}">${cost.toLocaleString()} CR</div>
                    <button class="btn btn-buy small" ${canAfford ? '' : 'disabled'}>UPGRADE</button>
                </div>
            `;
            
            // 3. Bind Click
            item.querySelector('button').onclick = () => {
                const res = this.gameState.upgradeShip(u.id);
                this.showNotification(res.message);
                this.updateUI();
            };
            
            list.appendChild(item);
        });
        
        container.appendChild(list);
    }
    
    updateOverviewUI() {
        const sys = this.gameState.currentSystem;
        const el = (id, txt) => { const e = document.getElementById(id); if(e) e.textContent = txt; };
        
        el('current-system-name', sys.name);
        el('current-system-economy', `Economy: ${sys.economy}`);
        el('current-system-security', `Security: ${sys.security}`);
        
        el('overview-fuel', `Fuel: ${Math.floor(this.gameState.fuel)}`);
        
        let refuelCost = 0;
        if(sys.hasRefuel && this.gameState.fuel < this.gameState.maxFuel) {
            const missing = this.gameState.maxFuel - this.gameState.fuel;
            refuelCost = Math.floor(missing * 10);
        }
        el('overview-refuel-cost', sys.hasRefuel ? `Refuel Cost: ~${refuelCost} CR` : "Refueling Unavailable");
        
        const threat = sys.security === 'low' ? "HIGH" : (sys.security === 'medium' ? "MODERATE" : "LOW");
        el('overview-threat', `Threat: ${threat}`);
        el('overview-pirate-chance', `Pirate Risk: ${sys.security === 'low' ? '50%' : '10%'}`);
        
        // Nearby Systems
        const list = document.getElementById('nearby-systems');
        if(list) {
            list.innerHTML = '';
            const nearby = this.gameState.galaxy
                .filter(s => s !== sys && s.discovered)
                .map(s => ({ system: s, dist: this.gameState.calculateDistance(sys, s) }))
                .filter(item => item.dist < 50)
                .sort((a,b) => a.dist - b.dist)
                .slice(0, 5);
                
            if(nearby.length === 0) {
                list.innerHTML = '<div style="color:#555; padding:5px;">No known systems in short range scanners.</div>';
            } else {
                nearby.forEach(item => {
                    const div = document.createElement('div');
                    div.className = 'system-overview-item';
                    div.innerHTML = `
                        <div style="display:flex; justify-content:space-between;">
                            <span style="color:#6cf; font-weight:bold;">${item.system.name}</span>
                            <span style="color:#aaa;">${Math.round(item.dist)} LY</span>
                        </div>
                        <div style="font-size:11px; color:#888;">${item.system.economy}</div>
                    `;
                    list.appendChild(div);
                });
            }
        }
    }
    
    updateContractsUI() {
        const list = document.getElementById('contracts-list');
        if(!list) return;
        list.innerHTML = '';
        
        if(this.gameState.contracts.length === 0) {
            list.innerHTML = '<div style="text-align:center; color:#555; padding:20px;">No contracts available in this sector.</div>';
            return;
        }
        
        this.gameState.contracts.forEach(c => {
            if(c.completed) return;
            
            const div = document.createElement('div');
            div.className = 'contract-item';
            const icon = c.type === 'hunt' ? '☠️' : '📦';
            
            div.innerHTML = `
                <div class="contract-header">
                    <span>${icon} ${c.name}</span>
                    <span class="contract-reward">${c.reward.toLocaleString()} CR</span>
                </div>
                <div class="contract-details">${c.description}</div>
                <button class="contract-button btn">ACCEPT CONTRACT</button>
            `;
            
            div.querySelector('button').onclick = () => {
                const res = this.gameState.handleContract(c.id);
                this.showNotification(res.message);
                this.updateUI();
            };
            list.appendChild(div);
        });
    }

    // =========================================
    // UTILITIES & EVENT BINDING
    // =========================================

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
    
    setupMobileFastClick() {
        // Global Touch Start: Instantly add visual feedback
        document.addEventListener('touchstart', (e) => {
            // Find closest interactive element
            const target = e.target.closest('button, .btn, .tab, .combat-btn, .map-center-btn, .system-overview-item, .size-option, .btn-close');
            
            if (target && !target.disabled) {
                target.classList.add('is-active');
            }
        }, { passive: true });

        // Global Touch End/Cancel: Remove feedback after short delay
        const clearActiveState = () => {
            const activeElements = document.querySelectorAll('.is-active');
            activeElements.forEach(el => {
                // Small timeout ensures the "flash" is visible even on super-fast taps
                setTimeout(() => el.classList.remove('is-active'), 75);
            });
        };

        document.addEventListener('touchend', clearActiveState, { passive: true });
        document.addEventListener('touchcancel', clearActiveState, { passive: true });
        
        // Safety cleanup for drag-scrolls that might leave buttons stuck
        document.addEventListener('scroll', clearActiveState, { passive: true });
    }

    setupAppEventListeners() {
        // 1. Travel Button
        const travelBtn = document.getElementById('travel-btn');
        if (travelBtn) travelBtn.addEventListener('click', () => {
            if (isTraveling) return;
            
            if (!this.gameState.targetSystem) {
                this.showNotification("No destination set!");
                return;
            }
            
            const res = this.gameState.travelToSystem();
            if (!res.success) {
                this.showNotification(res.message);
                return;
            }
            
            this.performTravelAnimation(res);
        });
        
        // 2. Refuel Button
        const refuelBtn = document.getElementById('refuel-btn');
        if(refuelBtn) refuelBtn.addEventListener('click', () => {
            const res = this.gameState.refuelShip();
            this.showNotification(res.message);
            this.updateUI();
        });
        
        // 2. NEW: SCAN BUTTON LISTENER
        const scanBtn = document.getElementById('scan-btn');
        if (scanBtn) {
            scanBtn.addEventListener('click', () => {
                if (isTraveling) return;

                // Trigger visual scan effect on map (optional, strictly functional for now)
                const res = this.gameState.scanNearbySystems();
                
                this.showNotification(res.message);
                
                // If successful, update the UI to show new systems on map/list
                if (res.success) {
                    this.updateUI();
                    
                    // Force a re-render of the map to show new stars immediately
                    if (this.galaxyMap) this.galaxyMap.render();
                }
            });
        }

        // 3. Tab Switching
        const tabs = document.querySelectorAll('.tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                document.querySelectorAll('.panel-section').forEach(s => s.style.display = 'none');
                const target = document.querySelector(`.${tab.dataset.tab}-tab`);
                if(target) target.style.display = 'block';
            });
        });
    }
    /**
     * Visual sequence for traveling.
     * Animates ship movement and handles arrival logic.
     */
    performTravelAnimation(res) {
        this.showNotification(res.message);
        document.querySelector('.ui-panel').classList.add('traveling');
        
        const startPos = {x: this.gameState.ship.x, y: this.gameState.ship.y};
        const endPos = {x: this.gameState.targetSystem.x, y: this.gameState.targetSystem.y};
        
        const duration = 1500 + (res.distance * 20); 
        const startTime = Date.now();
        
        const animate = () => {
            const now = Date.now();
            const p = Math.min((now - startTime) / duration, 1);
            
            // Easing function (local or imported)
            const ease = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
            
            // Interpolate
            this.gameState.ship.x = startPos.x + (endPos.x - startPos.x) * ease;
            this.gameState.ship.y = startPos.y + (endPos.y - startPos.y) * ease;
            
            // Rotate ship
            const dx = endPos.x - startPos.x;
            const dy = endPos.y - startPos.y;
            this.gameState.ship.rotation = (Math.atan2(dy, dx) * 180 / Math.PI);
            
            this.centerCameraOnShip();
            
            if(p < 1) {
                requestAnimationFrame(animate);
            } else {
                // === ARRIVAL ===
                document.querySelector('.ui-panel').classList.remove('traveling');
                
                this.gameState.completeTravel();
                this.showNotification(`Arrived at ${this.gameState.currentSystem.name}`);
                this.updateUI();
                
                // === CRITICAL FIX: TRIGGER ENCOUNTER LOGIC ===
                // We delegate the decision entirely to EncounterManager
                if (this.encounterManager.shouldTriggerEncounter()) {
                    // Delay slightly so the "Arrived" notification isn't instantly covered
                    setTimeout(() => {
                        const encounterData = this.encounterManager.getRandomEncounter();
                        this.encounterManager.startEncounter(encounterData.type);
                    }, 500);
                }
            }
        };
        
        animate();
    }
}
/* --- END OF FILE ui.js --- */