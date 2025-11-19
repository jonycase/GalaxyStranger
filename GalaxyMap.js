// GalaxyMap.js
export class GalaxyMap {
    constructor(gameState, closeCallback, setTargetCallback) {
        this.gameState = gameState;
        this.onClose = closeCallback;
        this.onSetTarget = setTargetCallback;
        
        this.canvas = null;
        this.ctx = null;
        this.container = null;
        
        // Camera state
        this.camera = { x: 0, y: 0, zoom: 0.15 };
        
        // Interaction state
        this.isDragging = false;
        this.lastX = 0;
        this.lastY = 0;
        this.lastDist = 0;

        this.selectedSystem = null;
        
        // Spatial Indexing (Chunking) for performance with 100k+ stars
        // We divide the universe into 2000x2000 pixel buckets
        this.chunkSize = 2000;
        this.chunks = new Map();
        
        this.isActive = false;
        this.animationId = null;
        
        // Initialize
        this._precomputeChunks();
        this.initDOM();
    }

    // Sort stars into buckets once at startup
    _precomputeChunks() {
        this.chunks.clear();
        this.gameState.galaxy.forEach(sys => {
            const cx = Math.floor(sys.x / this.chunkSize);
            const cy = Math.floor(sys.y / this.chunkSize);
            const key = `${cx},${cy}`;
            
            if (!this.chunks.has(key)) {
                this.chunks.set(key, []);
            }
            this.chunks.get(key).push(sys);
        });
    }

    initDOM() {
        // Prevent duplicate modals during hot-reload
        const existing = document.querySelector('.galaxy-map-modal');
        if(existing) existing.remove();

        this.container = document.createElement('div');
        this.container.className = 'galaxy-map-modal';
        this.container.style.display = 'none'; // Hidden initially
        
        this.container.innerHTML = `
            <div class="galaxy-map-header">
                <span>GALAXY NAVIGATION</span>
                <button class="btn-close-map"><i class="fas fa-times"></i></button>
            </div>
            <canvas id="galaxy-map-canvas"></canvas>
            <div class="galaxy-map-controls">
                <div id="map-selected-info" class="map-info-box">Tap a star system to view details...</div>
                <div class="map-btn-group">
                    <button id="btn-map-target" class="btn" style="background: linear-gradient(to bottom, #2a6a2a, #1a4a1a);" disabled>SET DESTINATION</button>
                    <button id="btn-map-clear" class="btn" style="background: linear-gradient(to bottom, #6a2a2a, #4a1a1a);">CLEAR</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(this.container);
        
        this.canvas = this.container.querySelector('canvas');
        // Alpha: false improves performance significantly
        this.ctx = this.canvas.getContext('2d', { alpha: false });
        
        // Bind Events
        this.container.querySelector('.btn-close-map').addEventListener('click', () => this.close());
        
        const targetBtn = this.container.querySelector('#btn-map-target');
        targetBtn.addEventListener('click', () => {
            if (this.selectedSystem) {
                this.onSetTarget(this.selectedSystem);
                this.close();
            }
        });

        this.container.querySelector('#btn-map-clear').addEventListener('click', () => {
            this.onSetTarget(null);
            this.selectedSystem = null;
            this.updateInfoPanel();
            this.requestDraw();
        });

        this.setupInput();
    }

    open() {
        if (!this.container) this.initDOM();
        
        this.container.style.display = 'flex'; // Force visible
        this.isActive = true;
        
        // Sync canvas buffer size with CSS size
        this.resize();
        
        // Center Camera on Player Ship
        this.camera.x = this.gameState.ship.x;
        this.camera.y = this.gameState.ship.y;
        this.camera.zoom = 0.15; // Default zoom out level
        
        // Start rendering loop
        this.animate();
    }

    close() {
        this.isActive = false;
        if (this.container) this.container.style.display = 'none';
        if (this.animationId) cancelAnimationFrame(this.animationId);
        this.onClose();
    }

    resize() {
        if (this.canvas) {
            this.canvas.width = this.canvas.offsetWidth;
            this.canvas.height = this.canvas.offsetHeight;
            this.requestDraw();
        }
    }

    setupInput() {
        const c = this.canvas;
        let tapStartTime = 0;
        let tapStartX = 0;
        let tapStartY = 0;

        // --- PANNING HELPERS ---
        const startPan = (x, y) => {
            this.isDragging = true;
            this.lastX = x;
            this.lastY = y;
        };

        const movePan = (x, y) => {
            if (!this.isDragging) return;
            const dx = x - this.lastX;
            const dy = y - this.lastY;
            this.camera.x -= dx / this.camera.zoom;
            this.camera.y -= dy / this.camera.zoom;
            this.lastX = x;
            this.lastY = y;
            this.requestDraw();
        };

        // --- CLICK / TAP SELECTION ---
        const handleClick = (cx, cy) => {
            const rect = c.getBoundingClientRect();
            // Convert screen click to world coordinates
            const worldX = this.camera.x + (cx - rect.left - rect.width/2) / this.camera.zoom;
            const worldY = this.camera.y + (cy - rect.top - rect.height/2) / this.camera.zoom;
            
            // Calculate search grid
            const gx = Math.floor(worldX / this.chunkSize);
            const gy = Math.floor(worldY / this.chunkSize);
            
            // Interaction radius scales with zoom so you can click easily when zoomed out
            let closest = null;
            let minDst = 30 / this.camera.zoom; 

            // Search adjacent chunks (3x3 grid)
            for(let i = -1; i <= 1; i++) {
                for(let j = -1; j <= 1; j++) {
                    const key = `${gx+i},${gy+j}`;
                    const chunk = this.chunks.get(key);
                    if(!chunk) continue;
                    
                    for(const sys of chunk) {
                        const dist = Math.hypot(sys.x - worldX, sys.y - worldY);
                        if(dist < minDst) {
                            minDst = dist;
                            closest = sys;
                        }
                    }
                }
            }

            if (closest) {
                this.selectedSystem = closest;
                this.updateInfoPanel();
                this.requestDraw();
            }
        };

        // --- MOUSE EVENTS ---
        c.addEventListener('mousedown', e => startPan(e.clientX, e.clientY));
        c.addEventListener('mousemove', e => movePan(e.clientX, e.clientY));
        c.addEventListener('mouseup', e => {
            this.isDragging = false;
            // If moved less than 5 pixels, treat as click
            if(Math.hypot(e.clientX - this.lastX, e.clientY - this.lastY) < 5) {
                handleClick(e.clientX, e.clientY);
            }
        });
        c.addEventListener('wheel', e => {
            e.preventDefault();
            const factor = e.deltaY > 0 ? 0.9 : 1.1;
            this.camera.zoom *= factor;
            this.requestDraw();
        }, {passive: false});

        // --- TOUCH EVENTS ---
        c.addEventListener('touchstart', e => {
            if(e.touches.length === 1) {
                startPan(e.touches[0].clientX, e.touches[0].clientY);
                tapStartTime = Date.now();
                tapStartX = e.touches[0].clientX;
                tapStartY = e.touches[0].clientY;
            }
            if(e.touches.length === 2) {
                const t1 = e.touches[0];
                const t2 = e.touches[1];
                this.lastDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
            }
        }, {passive: false});

        c.addEventListener('touchmove', e => {
            e.preventDefault();
            if(e.touches.length === 1) movePan(e.touches[0].clientX, e.touches[0].clientY);
            if(e.touches.length === 2) {
                const t1 = e.touches[0];
                const t2 = e.touches[1];
                const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
                if(this.lastDist > 0) {
                    const delta = dist - this.lastDist;
                    this.camera.zoom *= (1 + delta * 0.005);
                    this.requestDraw();
                }
                this.lastDist = dist;
            }
        }, {passive: false});
        
        c.addEventListener('touchend', e => {
            this.isDragging = false;
            // Detect Tap: Short duration, little movement, finger lifted
            if(e.changedTouches.length > 0 && Date.now() - tapStartTime < 300) {
                const t = e.changedTouches[0];
                if(Math.hypot(t.clientX - tapStartX, t.clientY - tapStartY) < 10) {
                    handleClick(t.clientX, t.clientY);
                }
            }
        });
    }

    updateInfoPanel() {
        const infoBox = this.container.querySelector('#map-selected-info');
        const btn = this.container.querySelector('#btn-map-target');
        
        if (!this.selectedSystem) {
            infoBox.innerHTML = 'Tap a star system to view details...';
            btn.disabled = true;
            btn.style.opacity = "0.5";
            return;
        }

        const dist = this.gameState.calculateDistance(this.gameState.currentSystem, this.selectedSystem);
        const economy = this.selectedSystem.economy.charAt(0).toUpperCase() + this.selectedSystem.economy.slice(1);
        
        infoBox.innerHTML = `
            <div style="color:#fff; font-weight:bold; font-size:16px; margin-bottom:4px;">${this.selectedSystem.discovered ? this.selectedSystem.name : 'Unknown System'}</div>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 5px;">
                <div>Distance: <span style="color:#66ccff">${Math.round(dist)} LY</span></div>
                <div>Economy: <span style="color:#8f8">${economy}</span></div>
                <div>Security: <span style="color:#f88">${this.selectedSystem.security}</span></div>
                <div>Status: ${this.selectedSystem.discovered ? '<span style="color:#8f8">Charted</span>' : '<span style="color:#888">Unknown</span>'}</div>
            </div>
        `;
        btn.disabled = false;
        btn.style.opacity = "1";
    }

    animate() {
        if (!this.isActive) return;
        this.draw();
        this.animationId = requestAnimationFrame(() => this.animate());
    }

    requestDraw() {
        if (!this.isActive) return;
        // Only force draw if not animating loop
        if (!this.animationId) this.draw();
    }

    draw() {
        if (!this.ctx || !this.canvas) return;
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Fill Background
        ctx.fillStyle = '#050510';
        ctx.fillRect(0, 0, w, h);

        ctx.save();
        // Center Camera
        ctx.translate(w/2, h/2);
        ctx.scale(this.camera.zoom, this.camera.zoom);
        ctx.translate(-this.camera.x, -this.camera.y);

        // View Frustum Culling (Only draw visible chunks)
        const viewW = w / this.camera.zoom;
        const viewH = h / this.camera.zoom;
        const left = this.camera.x - viewW/2;
        const right = this.camera.x + viewW/2;
        const top = this.camera.y - viewH/2;
        const bottom = this.camera.y + viewH/2;

        const gridXStart = Math.floor(left / this.chunkSize);
        const gridXEnd = Math.floor(right / this.chunkSize);
        const gridYStart = Math.floor(top / this.chunkSize);
        const gridYEnd = Math.floor(bottom / this.chunkSize);

        // Iterate visible chunks
        for(let cx = gridXStart; cx <= gridXEnd; cx++) {
            for(let cy = gridYStart; cy <= gridYEnd; cy++) {
                const chunk = this.chunks.get(`${cx},${cy}`);
                if(!chunk) continue;

                for(const sys of chunk) {
                    let color = '#555577'; // Default unknown star color
                    let drawSize = Math.max(1 / this.camera.zoom, 2); // Ensure visibility when zoomed out
                    
                    if (sys.discovered) color = '#88ccff';

                    // Highlight special systems
                    if (sys === this.gameState.currentSystem) {
                        color = '#00ff00'; // Green for current
                        drawSize *= 2;
                    } else if (sys === this.gameState.targetSystem) {
                        color = '#ffff00'; // Yellow for target
                        drawSize *= 2;
                    } else if (sys === this.selectedSystem) {
                        color = '#ffffff'; // White for selection
                        drawSize *= 2.5;
                    }

                    ctx.fillStyle = color;
                    ctx.fillRect(sys.x - drawSize/2, sys.y - drawSize/2, drawSize, drawSize);
                }
            }
        }
        
        // Draw Line from Ship to Target
        if(this.gameState.targetSystem) {
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(255, 255, 0, 0.4)';
            ctx.lineWidth = 2 / this.camera.zoom;
            ctx.moveTo(this.gameState.ship.x, this.gameState.ship.y);
            ctx.lineTo(this.gameState.targetSystem.x, this.gameState.targetSystem.y);
            ctx.stroke();
        }

        ctx.restore();
    }
}