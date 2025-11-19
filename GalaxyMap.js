// GalaxyMap.js - Mega Optimized Grid Rendering
export class GalaxyMap {
    constructor(gameState, uiReference) {
        this.gameState = gameState;
        this.ui = uiReference; // To call notifications or update Main UI
        
        // Canvas elements
        this.canvas = document.getElementById('full-galaxy-canvas');
        this.ctx = this.canvas ? this.canvas.getContext('2d', { alpha: false }) : null;
        
        // Viewport State
        this.camera = { x: 0, y: 0, zoom: 0.5 };
        this.isDragging = false;
        this.lastX = 0;
        this.lastY = 0;
        
        // Spatial Partitioning Grid
        this.grid = new Map(); 
        this.gridSize = 250; // Bucket size in world units
        this.isInitialized = false;
        
        // Interaction
        this.selectedSystem = null;
        this.active = false;
        
        // Bindings
        this._drawLoop = this._drawLoop.bind(this);
        this.setupInputs();
    }

    setup() {
        if (this.isInitialized || !this.canvas) return;
        
        // 1. Cache and Bucket all systems
        // We use a spatial hash map: key = "cellX,cellY", value = [system, system...]
        this.grid.clear();
        this.gameState.galaxy.forEach(sys => {
            const cellX = Math.floor(sys.x / this.gridSize);
            const cellY = Math.floor(sys.y / this.gridSize);
            const key = `${cellX},${cellY}`;
            
            if (!this.grid.has(key)) {
                this.grid.set(key, []);
            }
            this.grid.get(key).push(sys);
        });
        
        // Populate Search Datalist
        const dataList = document.getElementById('discovered-systems-list');
        if (dataList) {
            dataList.innerHTML = '';
            // Limit list size for performance if too many systems
            let count = 0;
            for (const sys of this.gameState.galaxy) {
                if (sys.discovered) {
                    const opt = document.createElement('option');
                    opt.value = sys.name;
                    dataList.appendChild(opt);
                    count++;
                    if (count > 200) break; // Browser limit safety
                }
            }
        }
        
        this.isInitialized = true;
    }

    open() {
        const modal = document.getElementById('galaxy-map-modal');
        if (!modal) return;
        
        modal.style.display = 'flex';
        this.active = true;
        
        // Initialization check (in case galaxy was generated after constructor)
        this.canvas = document.getElementById('full-galaxy-canvas');
        this.ctx = this.canvas.getContext('2d', { alpha: false });
        
        // Always refresh buckets if new systems discovered or first run
        this.setup(); 
        this.resize();
        
        // Center on ship initially
        this.camera.x = this.gameState.ship.x;
        this.camera.y = this.gameState.ship.y;
        this.camera.zoom = 0.8;
        
        // Start Render Loop
        requestAnimationFrame(this._drawLoop);
        
        // UI Bindings for search/buttons
        this.bindUI();
    }

    close() {
        const modal = document.getElementById('galaxy-map-modal');
        if (modal) modal.style.display = 'none';
        this.active = false;
    }

    bindUI() {
        // Close Btn
        document.getElementById('close-map-btn').onclick = () => this.close();
        
        // Search
        document.getElementById('map-search-btn').onclick = () => this.doSearch();
        
        // Set Target
        document.getElementById('set-target-btn').onclick = () => {
            if (this.selectedSystem) {
                this.gameState.targetSystem = this.selectedSystem;
                this.ui.showNotification(`Target Set: ${this.selectedSystem.name}`);
                // Manually trigger UI update to refresh Main UI text
                this.ui.updateUI(); 
                this.close();
            }
        };
    }
    
    doSearch() {
        const input = document.getElementById('map-search-input');
        const name = input.value.trim().toLowerCase();
        const found = this.gameState.galaxy.find(s => s.name.toLowerCase() === name && s.discovered);
        
        if (found) {
            this.selectedSystem = found;
            this.camera.x = found.x;
            this.camera.y = found.y;
            this.camera.zoom = 2.5; // Zoom in on found
            this.updateInfoBox();
        } else {
            this.ui.showNotification("System not found or undiscovered");
        }
    }

    resize() {
        // Look at the wrapper container, not the window
        const wrapper = document.querySelector('.map-canvas-wrapper');
        if (this.canvas && wrapper) {
            this.canvas.width = wrapper.clientWidth;
            this.canvas.height = wrapper.clientHeight;
        }
    }

    _drawLoop() {
        if (!this.active) return;
        this.draw();
        requestAnimationFrame(this._drawLoop);
    }

    draw() {
        if (!this.ctx) return;
        
        const w = this.canvas.width;
        const h = this.canvas.height;
        const ctx = this.ctx;
        
        // 1. Clear background
        ctx.fillStyle = '#000011';
        ctx.fillRect(0, 0, w, h);
        
        // 2. Calculate Viewport in World Coords
        const viewLeft = this.camera.x - (w / 2 / this.camera.zoom);
        const viewRight = this.camera.x + (w / 2 / this.camera.zoom);
        const viewTop = this.camera.y - (h / 2 / this.camera.zoom);
        const viewBottom = this.camera.y + (h / 2 / this.camera.zoom);
        
        // 3. Determine visible Grid Cells
        const startCol = Math.floor(viewLeft / this.gridSize);
        const endCol = Math.floor(viewRight / this.gridSize);
        const startRow = Math.floor(viewTop / this.gridSize);
        const endRow = Math.floor(viewBottom / this.gridSize);
        
        // 4. Render Systems
        ctx.textAlign = 'center';
        
        // Pre-calculate constants
        const cx = w / 2;
        const cy = h / 2;
        const zoom = this.camera.zoom;
        const camX = this.camera.x;
        const camY = this.camera.y;
        
        // Loop only visible buckets
        for (let c = startCol; c <= endCol; c++) {
            for (let r = startRow; r <= endRow; r++) {
                const key = `${c},${r}`;
                const systems = this.grid.get(key);
                if (!systems) continue;
                
                for (let i = 0; i < systems.length; i++) {
                    const sys = systems[i];
                    
                    // Screen Coords
                    const sx = (sys.x - camX) * zoom + cx;
                    const sy = (sys.y - camY) * zoom + cy;
                    
                    // Draw Star
                    const radius = Math.max(2, 5 * zoom);
                    
                    // Color based on state
                    if (sys === this.selectedSystem) {
                        ctx.fillStyle = '#ffffff';
                        ctx.shadowBlur = 15;
                        ctx.shadowColor = '#00ffff';
                    } else if (sys === this.gameState.currentSystem) {
                        ctx.fillStyle = '#00ff00';
                        ctx.shadowBlur = 10;
                        ctx.shadowColor = '#00ff00';
                    } else if (sys.discovered) {
                        ctx.fillStyle = this.getEconomyColor(sys.economy);
                        ctx.shadowBlur = 0;
                    } else {
                        ctx.fillStyle = '#333'; // Undiscovered
                        ctx.shadowBlur = 0;
                    }
                    
                    ctx.beginPath();
                    ctx.arc(sx, sy, radius, 0, Math.PI * 2);
                    ctx.fill();
                    
                    // Draw Rings for selected
                    if (sys === this.selectedSystem) {
                        ctx.strokeStyle = '#00ffff';
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        ctx.arc(sx, sy, radius + 5, 0, Math.PI * 2);
                        ctx.stroke();
                    }
                    
                    // Text LOD: Only draw text if zoomed in enough or selected
                    if (zoom > 0.8 || sys === this.selectedSystem || sys === this.gameState.currentSystem) {
                        ctx.fillStyle = '#ccc';
                        ctx.font = '10px Exo 2';
                        ctx.fillText(sys.discovered ? sys.name : '???', sx, sy - radius - 4);
                    }
                }
            }
        }
        
        // 5. Draw Ship Icon (on top)
        const shipSx = (this.gameState.ship.x - camX) * zoom + cx;
        const shipSy = (this.gameState.ship.y - camY) * zoom + cy;
        
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffff00';
        ctx.beginPath();
        ctx.moveTo(shipSx, shipSy - 8);
        ctx.lineTo(shipSx + 6, shipSy + 8);
        ctx.lineTo(shipSx - 6, shipSy + 8);
        ctx.fill();
    }
    
    getEconomyColor(economy) {
        // Cached simple lookups
        switch (economy) {
            case 'agricultural': return '#66cc66';
            case 'industrial': return '#cc6666';
            case 'tech': return '#6666cc';
            case 'mining': return '#cccc66';
            case 'military': return '#ff0000';
            case 'trade': return '#cc66cc';
            default: return '#aaaaaa';
        }
    }
    
    updateInfoBox() {
        const box = document.getElementById('map-selected-info');
        const btn = document.getElementById('set-target-btn');
        
        if (this.selectedSystem) {
            box.classList.add('active');
            const dist = Math.round(this.gameState.calculateDistance(this.gameState.currentSystem, this.selectedSystem));
            
            box.querySelector('.info-details').innerHTML = `
                <strong>${this.selectedSystem.discovered ? this.selectedSystem.name : 'Unknown'}</strong><br>
                Distance: ${dist} LY<br>
                Economy: ${this.selectedSystem.discovered ? this.selectedSystem.economy : '???'}
            `;
            btn.disabled = false;
        } else {
            box.classList.remove('active');
            btn.disabled = true;
        }
    }

    setupInputs() {
        if (!this.canvas) return;
        
        // Mouse / Touch Helper
        const getPos = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            if (e.touches && e.touches.length > 0) {
                return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
            }
            return { x: e.clientX - rect.left, y: e.clientY - rect.top };
        };

        // Click/Tap Selection
        const handleTap = (sx, sy) => {
            // Reverse projection: Screen -> World
            const w = this.canvas.width;
            const h = this.canvas.height;
            const worldX = (sx - w/2) / this.camera.zoom + this.camera.x;
            const worldY = (sy - h/2) / this.camera.zoom + this.camera.y;
            
            // Find closest system in grid
            const cellX = Math.floor(worldX / this.gridSize);
            const cellY = Math.floor(worldY / this.gridSize);
            
            let bestDist = 20 / this.camera.zoom; // Click radius tolerance
            let found = null;
            
            // Check surrounding cells for ease of clicking near edges
            for(let cx = cellX -1; cx <= cellX+1; cx++){
                for(let cy = cellY -1; cy <= cellY+1; cy++){
                    const key = `${cx},${cy}`;
                    const list = this.grid.get(key);
                    if(!list) continue;
                    for(let sys of list) {
                        const dx = sys.x - worldX;
                        const dy = sys.y - worldY;
                        const d = Math.sqrt(dx*dx+dy*dy);
                        if (d < bestDist) {
                            bestDist = d;
                            found = sys;
                        }
                    }
                }
            }
            
            this.selectedSystem = found;
            this.updateInfoBox();
        };

        // Mouse Pan
        this.canvas.addEventListener('mousedown', e => {
            this.isDragging = true;
            const p = getPos(e);
            this.lastX = p.x;
            this.lastY = p.y;
        });
        
        window.addEventListener('mousemove', e => {
            if(this.isDragging && this.active) {
                const p = getPos(e);
                const dx = p.x - this.lastX;
                const dy = p.y - this.lastY;
                this.camera.x -= dx / this.camera.zoom;
                this.camera.y -= dy / this.camera.zoom;
                this.lastX = p.x;
                this.lastY = p.y;
            }
        });
        
        window.addEventListener('mouseup', e => {
            if (this.isDragging && this.active) {
                const p = getPos(e);
                // If drag was tiny (click), Select system
                if (Math.abs(p.x - this.lastX) < 5 && Math.abs(p.y - this.lastY) < 5) {
                    handleTap(p.x, p.y);
                }
            }
            this.isDragging = false;
        });

        // Wheel Zoom
        this.canvas.addEventListener('wheel', e => {
            e.preventDefault();
            const zoomSpeed = 0.1;
            const delta = e.deltaY > 0 ? -zoomSpeed : zoomSpeed;
            this.camera.zoom = Math.max(0.1, Math.min(5.0, this.camera.zoom + delta));
        });
        
        // Touch Pan (Basic)
        this.canvas.addEventListener('touchstart', e => {
            this.isDragging = true;
            const p = getPos(e);
            this.lastX = p.x;
            this.lastY = p.y;
        }, {passive: false});
        
        this.canvas.addEventListener('touchmove', e => {
            e.preventDefault(); 
            if(this.isDragging) {
                 const p = getPos(e);
                 const dx = p.x - this.lastX;
                 const dy = p.y - this.lastY;
                 this.camera.x -= dx / this.camera.zoom;
                 this.camera.y -= dy / this.camera.zoom;
                 this.lastX = p.x;
                 this.lastY = p.y;
            }
        }, {passive: false});
        
        this.canvas.addEventListener('touchend', e => {
            this.isDragging = false;
            // Simplified tap logic could be added here for better touch support
        });
    }
}