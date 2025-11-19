export class GalaxyMap {
    constructor(gameState, uiReference) {
        this.gameState = gameState;
        this.ui = uiReference; 
        
        this.canvas = document.getElementById('full-galaxy-canvas');
        this.ctx = this.canvas ? this.canvas.getContext('2d', { alpha: false }) : null;
        
        this.camera = { x: 0, y: 0, zoom: 0.5 };
        this.isDragging = false;
        this.lastX = 0;
        this.lastY = 0;
        
        this.grid = new Map(); 
        this.gridSize = 250;
        this.isInitialized = false;
        
        this.selectedSystem = null;
        this.active = false;
        
        this._drawLoop = this._drawLoop.bind(this);
        this.setupInputs();
    }

    setup() {
        if (this.isInitialized || !this.canvas) return;
        
        // Cache spatial grid
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
        
        // NOTE: We do NOT populate the datalist here anymore.
        // It is done dynamically in bindUI for performance.
        
        this.isInitialized = true;
    }

    open() {
        const modal = document.getElementById('galaxy-map-modal');
        if (!modal) return;
        
        modal.style.display = 'flex';
        this.active = true;
        
        this.canvas = document.getElementById('full-galaxy-canvas');
        this.ctx = this.canvas.getContext('2d', { alpha: false });
        
        this.setup(); 
        this.resize();
        
        // Center on ship
        this.camera.x = this.gameState.ship.x;
        this.camera.y = this.gameState.ship.y;
        this.camera.zoom = 0.8;
        
        requestAnimationFrame(this._drawLoop);
        this.bindUI();
        
        // Clear previous search state
        const input = document.getElementById('map-search-input');
        if(input) input.value = '';
        this.selectedSystem = null;
        this.updateInfoBox();
    }

    close() {
        const modal = document.getElementById('galaxy-map-modal');
        if (modal) modal.style.display = 'none';
        this.active = false;
    }

    bindUI() {
        document.getElementById('close-map-btn').onclick = () => this.close();
        document.getElementById('map-search-btn').onclick = () => this.doSearch();
        
        // --- NEW: Dynamic Search Logic ---
        const input = document.getElementById('map-search-input');
        const dataList = document.getElementById('discovered-systems-list');
        
        if (input && dataList) {
            // Clear list initially
            dataList.innerHTML = '';

            // 1. Handle Typing (Suggestions)
            input.oninput = () => {
                const val = input.value.trim().toLowerCase();
                
                // Clear previous suggestions
                dataList.innerHTML = '';

                // Only search if 3 or more characters
                if (val.length < 3) return;

                // Find matches in discovered systems
                // Limit to 10 results for performance
                const matches = this.gameState.galaxy.filter(s => 
                    s.discovered && s.name.toLowerCase().includes(val)
                ).slice(0, 10);

                // Populate datalist
                matches.forEach(sys => {
                    const opt = document.createElement('option');
                    opt.value = sys.name;
                    dataList.appendChild(opt);
                });
            };

            // 2. Handle Enter Key
            input.onkeydown = (e) => {
                if (e.key === 'Enter') {
                    this.doSearch();
                    input.blur(); // Close keyboard on mobile
                }
            };
        }
        
        document.getElementById('set-target-btn').onclick = () => {
            if (this.selectedSystem) {
                this.gameState.targetSystem = this.selectedSystem;
                const name = this.selectedSystem.discovered ? this.selectedSystem.name : 'Unknown System';
                this.ui.showNotification(`Target Set: ${name}`);
                this.ui.updateUI(); 
                this.close();
            }
        };
    }
    
    doSearch() {
        const input = document.getElementById('map-search-input');
        const name = input.value.trim().toLowerCase();
        
        if (!name) return;

        // Exact match logic
        const found = this.gameState.galaxy.find(s => s.name.toLowerCase() === name && s.discovered);
        
        if (found) {
            this.selectedSystem = found;
            // Smoothly jump to location
            this.camera.x = found.x;
            this.camera.y = found.y;
            this.camera.zoom = 2.5;
            this.updateInfoBox();
        } else {
            this.ui.showNotification("System not found or undiscovered");
        }
    }

    resize() {
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
        
        ctx.fillStyle = '#000011';
        ctx.fillRect(0, 0, w, h);
        
        const viewLeft = this.camera.x - (w / 2 / this.camera.zoom);
        const viewRight = this.camera.x + (w / 2 / this.camera.zoom);
        const viewTop = this.camera.y - (h / 2 / this.camera.zoom);
        const viewBottom = this.camera.y + (h / 2 / this.camera.zoom);
        
        const startCol = Math.floor(viewLeft / this.gridSize);
        const endCol = Math.floor(viewRight / this.gridSize);
        const startRow = Math.floor(viewTop / this.gridSize);
        const endRow = Math.floor(viewBottom / this.gridSize);
        
        ctx.textAlign = 'center';
        
        const cx = w / 2;
        const cy = h / 2;
        const zoom = this.camera.zoom;
        const camX = this.camera.x;
        const camY = this.camera.y;
        
        for (let c = startCol; c <= endCol; c++) {
            for (let r = startRow; r <= endRow; r++) {
                const key = `${c},${r}`;
                const systems = this.grid.get(key);
                if (!systems) continue;
                
                for (let i = 0; i < systems.length; i++) {
                    const sys = systems[i];
                    
                    const sx = (sys.x - camX) * zoom + cx;
                    const sy = (sys.y - camY) * zoom + cy;
                    
                    const radius = Math.max(2, 5 * zoom);
                    
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
                        ctx.fillStyle = '#333'; 
                        ctx.shadowBlur = 0;
                    }
                    
                    ctx.beginPath();
                    ctx.arc(sx, sy, radius, 0, Math.PI * 2);
                    ctx.fill();
                    
                    if (sys === this.selectedSystem) {
                        ctx.strokeStyle = '#00ffff';
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        ctx.arc(sx, sy, radius + 5, 0, Math.PI * 2);
                        ctx.stroke();
                    }
                    
                    if (zoom > 0.8 || sys === this.selectedSystem || sys === this.gameState.currentSystem) {
                        ctx.fillStyle = '#ccc';
                        ctx.font = '10px Exo 2';
                        const name = sys.discovered ? sys.name : '???';
                        ctx.fillText(name, sx, sy - radius - 4);
                    }
                }
            }
        }
        
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
            
            const name = this.selectedSystem.discovered ? this.selectedSystem.name : 'Unknown System';
            const economy = this.selectedSystem.discovered ? this.selectedSystem.economy : '???';
            
            box.querySelector('.info-details').innerHTML = `
                <strong>${name}</strong><br>
                Distance: ${dist} LY<br>
                Economy: ${economy}
            `;
            btn.disabled = false;
        } else {
            box.classList.remove('active');
            btn.disabled = true;
        }
    }

    setupInputs() {
        if (!this.canvas) return;
        
        const getPos = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            if (e.touches && e.touches.length > 0) {
                return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
            }
            return { x: e.clientX - rect.left, y: e.clientY - rect.top };
        };

        const handleTap = (sx, sy) => {
            const w = this.canvas.width;
            const h = this.canvas.height;
            const worldX = (sx - w/2) / this.camera.zoom + this.camera.x;
            const worldY = (sy - h/2) / this.camera.zoom + this.camera.y;
            
            const cellX = Math.floor(worldX / this.gridSize);
            const cellY = Math.floor(worldY / this.gridSize);
            
            let bestDist = 20 / this.camera.zoom; 
            let found = null;
            
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
                if (Math.abs(p.x - this.lastX) < 5 && Math.abs(p.y - this.lastY) < 5) {
                    handleTap(p.x, p.y);
                }
            }
            this.isDragging = false;
        });

        this.canvas.addEventListener('wheel', e => {
            e.preventDefault();
            const zoomSpeed = 0.1;
            const delta = e.deltaY > 0 ? -zoomSpeed : zoomSpeed;
            this.camera.zoom = Math.max(0.1, Math.min(5.0, this.camera.zoom + delta));
        });
        
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
        });
    }
}