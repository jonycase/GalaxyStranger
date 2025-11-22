/* --- START OF FILE GalaxyMap.js --- */
import { EconomyProfiles } from './SystemGen.js';
import { StarBackground } from './Background.js';

export class GalaxyMap {
    constructor(gameState, uiReference, canvasId) {
        this.gameState = gameState;
        this.ui = uiReference;
        this.canvasId = canvasId;
        
        this.isModal = (canvasId === 'full-galaxy-canvas'); 
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas ? this.canvas.getContext('2d', { alpha: false }) : null;

        if (!this.canvas) {
            console.error(`GalaxyMap: Canvas with ID '${canvasId}' not found.`);
            this.active = false;
            return;
        }

        // Camera Setup
        this.camera = { x: 0, y: 0, zoom: this.isModal ? 0.5 : 3.0 };
        
        // Interaction State
        this.isDragging = false;
        this.lastX = 0;
        this.lastY = 0;
        this.selectedSystem = null; 
        
        this.active = !this.isModal; 

        this.grid = new Map();
        this.gridSize = 250;

        this.background = new StarBackground();
        this.background.init();
        
        this._drawLoop = this._drawLoop.bind(this);
        
        this.setup();
        
        // IMPORTANT: Local map handles inputs immediately.
        if (!this.isModal) {
            this.setupInputs();
        }
    }

    setup() {
        if (!this.canvas) return;
        
        this.resize();

        // Build Spatial Grid
        this.grid.clear();
        this.gameState.galaxy.forEach(sys => {
            const cellX = Math.floor(sys.x / this.gridSize);
            const cellY = Math.floor(sys.y / this.gridSize);
            const key = `${cellX},${cellY}`;
            if (!this.grid.has(key)) this.grid.set(key, []);
            this.grid.get(key).push(sys);
        });
    }

    resize() {
        if (this.canvas && this.canvas.parentElement) {
            const rect = this.canvas.parentElement.getBoundingClientRect();
            this.canvas.width = rect.width;
            this.canvas.height = rect.height;
            
            if (!this.isModal && this.active) this.render(); 
        }
    }

    // --- COORDINATE MATH ---

    worldToScreen(worldX, worldY) {
        if (!this.canvas) return { x: 0, y: 0 };

        const cx = this.canvas.width / 2;
        const cy = this.canvas.height / 2;

        const screenX = (worldX - this.camera.x) * this.camera.zoom + cx;
        const screenY = (worldY - this.camera.y) * this.camera.zoom + cy;

        return { x: screenX, y: screenY };
    }

    screenToWorld(screenX, screenY) {
        if (!this.canvas) return { x: 0, y: 0 };

        const cx = this.canvas.width / 2;
        const cy = this.canvas.height / 2;

        const worldX = (screenX - cx) / this.camera.zoom + this.camera.x;
        const worldY = (screenY - cy) / this.camera.zoom + this.camera.y;

        return { x: worldX, y: worldY };
    }

    getSystemAt(screenX, screenY) {
        const worldPos = this.screenToWorld(screenX, screenY);
        const cellX = Math.floor(worldPos.x / this.gridSize);
        const cellY = Math.floor(worldPos.y / this.gridSize);
        const hitDist = Math.max(20 / this.camera.zoom, 10); // Larger hit area
        
        for (let x = cellX - 1; x <= cellX + 1; x++) {
            for (let y = cellY - 1; y <= cellY + 1; y++) {
                const list = this.grid.get(`${x},${y}`);
                if (list) {
                    for (const sys of list) {
                        const dx = sys.x - worldPos.x;
                        const dy = sys.y - worldPos.y;
                        if (dx*dx + dy*dy < hitDist*hitDist) return sys;
                    }
                }
            }
        }
        return null;
    }

    // --- MODAL METHODS ---

    open() {
        if (!this.isModal) return;
        
        const modal = document.getElementById('galaxy-map-modal');
        if (!modal) return;

        modal.style.display = 'flex';
        this.active = true;
        this.resize();
        
        this.camera.x = this.gameState.ship.x;
        this.camera.y = this.gameState.ship.y;
        this.camera.zoom = 0.6;
        
        this.bindModalUI();
        this.setupInputs();
        
        requestAnimationFrame(this._drawLoop);
    }

    close() {
        const modal = document.getElementById('galaxy-map-modal');
        if (modal) modal.style.display = 'none';
        this.active = false;
    }

    bindModalUI() {
        const closeBtn = document.getElementById('close-map-btn');
        if (closeBtn) closeBtn.onclick = () => this.close();

        const searchBtn = document.getElementById('map-search-btn');
        const searchInput = document.getElementById('map-search-input');
        const dataList = document.getElementById('discovered-systems-list');
        const targetBtn = document.getElementById('set-target-btn');

        if (searchBtn) searchBtn.onclick = () => this.doSearch();
        
        if (targetBtn) targetBtn.onclick = () => {
            if (this.selectedSystem) {
                this.gameState.targetSystem = this.selectedSystem;
                this.ui.showNotification(`Target Locked: ${this.selectedSystem.name}`);
                this.ui.updateUI();
                this.close();
            }
        };

        if (searchInput && dataList) {
            searchInput.value = ''; 
            searchInput.oninput = () => {
                const val = searchInput.value.trim().toLowerCase();
                dataList.innerHTML = '';
                if (val.length < 2) return;
                
                const matches = this.gameState.galaxy
                    .filter(s => s.discovered && s.name.toLowerCase().includes(val))
                    .slice(0, 10);
                
                matches.forEach(sys => {
                    const opt = document.createElement('option');
                    opt.value = sys.name;
                    dataList.appendChild(opt);
                });
            };
            searchInput.onkeydown = (e) => {
                if (e.key === 'Enter') { this.doSearch(); searchInput.blur(); }
            };
        }
        this.updateInfoBox();
    }

    doSearch() {
        const input = document.getElementById('map-search-input');
        if (!input) return;
        const name = input.value.trim().toLowerCase();
        const found = this.gameState.galaxy.find(s => s.discovered && s.name.toLowerCase() === name);
        
        if (found) {
            this.selectedSystem = found;
            this.camera.x = found.x;
            this.camera.y = found.y;
            this.camera.zoom = 2.0;
            this.updateInfoBox();
        } else {
            this.ui.showNotification("System unknown or not found.");
        }
    }

    updateInfoBox() {
        const infoBox = document.getElementById('map-selected-info');
        const details = infoBox ? infoBox.querySelector('.info-details') : null;
        const btn = document.getElementById('set-target-btn');
        
        if (!infoBox || !details) return;
        
        if (this.selectedSystem) {
            infoBox.classList.add('active');
            const dist = Math.round(this.gameState.calculateDistance(this.gameState.currentSystem, this.selectedSystem));
            const name = this.selectedSystem.discovered ? this.selectedSystem.name : "Unknown System";
            const eco = this.selectedSystem.discovered ? this.selectedSystem.economy : "???";
            
            details.innerHTML = `
                <strong>${name}</strong><br>
                Distance: <span style="color:#66ccff">${dist} LY</span><br>
                Economy: <span style="color:#fff">${eco}</span>
            `;
            if (btn) btn.disabled = false;
        } else {
            infoBox.classList.remove('active');
            if (btn) btn.disabled = true;
        }
    }

    _drawLoop() {
        if (!this.active) return;
        this.render();
        if (this.isModal) requestAnimationFrame(this._drawLoop);
    }

    render() {
        if (!this.ctx || !this.canvas) return;
        
        const w = this.canvas.width;
        const h = this.canvas.height;
        
        this.background.draw(this.ctx, this.camera.x, this.camera.y, w, h);
        
// 2. Culling Calculations (Screen -> World Bounds)
        const tl = this.screenToWorld(0, 0);
        const br = this.screenToWorld(w, h);
        
        // FIX: Increased buffer to +/- 3. 
        // When zoomed in, a system's center might be in a culled cell while its circle is visible.
        // When zoomed out, slight floating point variances can cull the edge. 3 is a safe margin.
        // NEW: auto-expand culling area depending on zoom level.
        // zoomed-out = wider culling area
        const zoomFactor = Math.max(1, Math.floor(6 / this.camera.zoom));

        const startCol = Math.floor(tl.x / this.gridSize) - zoomFactor;
        const endCol   = Math.floor(br.x / this.gridSize) + zoomFactor;
        const startRow = Math.floor(tl.y / this.gridSize) - zoomFactor;
        const endRow   = Math.floor(br.y / this.gridSize) + zoomFactor;

        
        for (let c = startCol; c <= endCol; c++) {
            for (let r = startRow; r <= endRow; r++) {
                const list = this.grid.get(`${c},${r}`);
                if (!list) continue;
                
                for (const sys of list) {
                                    const pos = this.worldToScreen(sys.x, sys.y);
                                    
                                    const isTarget = (sys === this.gameState.targetSystem);
                                    const isSelected = (sys === this.selectedSystem);
                                    const isCurrent = (sys === this.gameState.currentSystem);
                                    
                                    let radius = (isTarget || isSelected) ? 8 : (sys.discovered ? 5 : 3);
                                    if (!this.isModal) radius = sys.discovered ? 5 : 3;
                                    
                                    let color;

                                    // 1. Determine Base Color
                                    if (isCurrent) {
                                        color = '#00ff00';
                                    } 
                                    else if (isSelected && this.isModal) {
                                        color = '#ffcc00';
                                    } 
                                    else if (sys.discovered) {
                                        const profile = EconomyProfiles[sys.economy];
                                        color = profile ? profile.color : '#ffffff';
                                    } 
                                    else {
                                        color = '#8B4513';
                                    }

                                    this.ctx.fillStyle = color;

                                    // 2. Draw Glow (Only for discovered/important systems)
                                    // We use globalAlpha instead of shadowBlur for 10x better performance
                                    if (sys.discovered || isCurrent || isTarget) {
                                        this.ctx.shadowBlur = 0.2; // 20% opacity
                                        this.ctx.beginPath();
                                        // Glow radius is 3x the core radius
                                        this.ctx.arc(pos.x, pos.y, radius * 3, 0, Math.PI * 2);
                                        this.ctx.fill();
                                        this.ctx.globalAlpha = 1.0; // Reset opacity
                                    }

                                    // 3. Draw Core Star
                                    this.ctx.beginPath();
                                    this.ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
                                    this.ctx.fill();
                                    
                                    if (sys.discovered && (this.camera.zoom > 0.8 || isTarget || isSelected || isCurrent)) {
                                        this.ctx.font = '10px Exo 2';
                                        this.ctx.textAlign = 'center';
                                        this.ctx.fillText(sys.name, pos.x, pos.y - radius - 5);
                                    }
                                    
                }// ... (rest of the render function regarding rings/text remains the same)
            }
        }
        
        // 4. Draw Ship (Modal Only)
        if (this.isModal) {
            const shipPos = this.worldToScreen(this.gameState.ship.x, this.gameState.ship.y);
            this.ctx.fillStyle = '#ffff00';
            
            // Apply rotation to canvas for ship drawing
            this.ctx.save();
            this.ctx.translate(shipPos.x, shipPos.y);
            
            // FIX: Add 90 degrees because the drawing is defined pointing Up (North),
            // but the rotation angle 0 corresponds to Right (East).
            this.ctx.rotate((this.gameState.ship.rotation + 90) * Math.PI / 180); 
            
            this.ctx.beginPath();
            this.ctx.moveTo(0, -6);
            this.ctx.lineTo(4, 4);
            this.ctx.lineTo(-4, 4);
            this.ctx.fill();
            
            this.ctx.restore();
        }
    }

    setupInputs() {
        if (!this.canvas) return;

        // State for gestures
        let isDragging = false;
        let isPinching = false;
        
        // Coordinates
        let lastX = 0;
        let lastY = 0;
        let initialPinchDist = 0;
        let initialZoom = 1;

        // Tap Detection
        let touchStartX = 0;
        let touchStartY = 0;
        let touchStartTime = 0;

        // Helper: Get Pointer Position relative to Canvas
        const getPos = (e) => {
            const r = this.canvas.getBoundingClientRect();
            // Handle both Mouse and Touch (first finger)
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            return { x: clientX - r.left, y: clientY - r.top };
        };

        // Helper: Get Distance between two fingers
        const getPinchDist = (e) => {
            return Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
        };

        // --- MOUSE EVENTS (Desktop) ---
        this.canvas.addEventListener('mousedown', (e) => {
            isDragging = true;
            const p = getPos(e);
            lastX = p.x;
            lastY = p.y;
            touchStartX = p.x;
            touchStartY = p.y;
            touchStartTime = Date.now();
        });

        this.canvas.addEventListener('mousemove', (e) => {
            if (isDragging) {
                const p = getPos(e);
                const dx = p.x - lastX;
                const dy = p.y - lastY;
                
                // Move Camera (Inverted drag)
                this.camera.x -= dx / this.camera.zoom;
                this.camera.y -= dy / this.camera.zoom;
                
                lastX = p.x;
                lastY = p.y;
                
                if (!this.isModal) this.render();
            }
        });

        this.canvas.addEventListener('mouseup', (e) => {
            isDragging = false;
            
            // Handle Click/Tap
            const p = getPos(e);
            const dist = Math.hypot(p.x - touchStartX, p.y - touchStartY);
            const time = Date.now() - touchStartTime;

            // If moved less than 5px and clicked quickly (<300ms), it's a tap
            if (dist < 5 && time < 300) {
                this.handleTap(p);
            }
        });

        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault(); // Stop page scroll
            const zoomSensitivity = 0.001 * this.camera.zoom; 
            const delta = -e.deltaY * zoomSensitivity;
            
            // Smooth zoom clamp
            const newZoom = Math.min(Math.max(0.2, this.camera.zoom + delta), 8.0);
            this.camera.zoom = newZoom;
            
            if (!this.isModal) this.render();
        }, { passive: false });

        // --- TOUCH EVENTS (Mobile) ---
        
        this.canvas.addEventListener('touchstart', (e) => {
            // Prevent default to stop browser scrolling/refresh behavior
            if(e.cancelable) e.preventDefault();

            if (e.touches.length === 1) {
                // Single finger: Drag/Pan start
                isDragging = true;
                isPinching = false;
                const p = getPos(e);
                lastX = p.x;
                lastY = p.y;
                touchStartX = p.x;
                touchStartY = p.y;
                touchStartTime = Date.now();
            } 
            else if (e.touches.length === 2) {
                // Two fingers: Pinch start
                isDragging = false;
                isPinching = true;
                initialPinchDist = getPinchDist(e);
                initialZoom = this.camera.zoom;
            }
        }, { passive: false });

        this.canvas.addEventListener('touchmove', (e) => {
            if(e.cancelable) e.preventDefault();

            if (isDragging && e.touches.length === 1) {
                const p = getPos(e);
                const dx = p.x - lastX;
                const dy = p.y - lastY;
                
                this.camera.x -= dx / this.camera.zoom;
                this.camera.y -= dy / this.camera.zoom;
                
                lastX = p.x;
                lastY = p.y;
                
                if (!this.isModal) this.render();
            }
            else if (isPinching && e.touches.length === 2) {
                const dist = getPinchDist(e);
                
                // Avoid division by zero
                if (initialPinchDist > 0) {
                    const scale = dist / initialPinchDist;
                    
                    // Apply zoom relative to initial zoom of this gesture
                    let newZoom = initialZoom * scale;
                    
                    // Clamp Zoom Levels
                    newZoom = Math.max(0.2, Math.min(newZoom, 8.0));
                    
                    this.camera.zoom = newZoom;
                    
                    if (!this.isModal) this.render();
                }
            }
        }, { passive: false });

        this.canvas.addEventListener('touchend', (e) => {
            // Reset states based on remaining touches
            if (e.touches.length === 0) {
                // All fingers off
                if (isDragging) {
                    // Check for tap
                    // (Note: e.changedTouches gives the finger that left)
                    const touch = e.changedTouches[0];
                    const r = this.canvas.getBoundingClientRect();
                    const p = { 
                        x: touch.clientX - r.left, 
                        y: touch.clientY - r.top 
                    };

                    const dist = Math.hypot(p.x - touchStartX, p.y - touchStartY);
                    const time = Date.now() - touchStartTime;

                    // Relaxed tap threshold for mobile (10px movement allowed)
                    if (dist < 10 && time < 400) {
                        this.handleTap(p);
                    }
                }
                isDragging = false;
                isPinching = false;
            } 
            else if (e.touches.length === 1) {
                // Went from 2 fingers to 1: Switch to drag
                isPinching = false;
                isDragging = true;
                const p = getPos(e);
                lastX = p.x;
                lastY = p.y;
            }
        });
    }

    // Helper to process system selection
    handleTap(p) {
        const sys = this.getSystemAt(p.x, p.y);
        if (sys) {
            if (this.isModal) {
                this.selectedSystem = sys;
                this.updateInfoBox();
            } else {
                this.gameState.targetSystem = sys;
                // UI notification logic
                const name = sys.discovered ? sys.name : "Unknown System";
                this.ui.showNotification(`Target Set: ${name}`);
                this.ui.updateUI();
            }
        }
    }
}