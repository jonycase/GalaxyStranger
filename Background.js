// Background.js

export class StarBackground {
    constructor(options = {}) {
        // Customizable Parameters
        this.params = {
            tileSize: options.tileSize || 1024,
            baseColor: options.baseColor || '#020205', // Deep space black

            // Layer 0: Nebulae
            nebulaDensity: options.nebulaDensity || 15,
            nebulaColors: options.nebulaColors || [
                'rgba(50, 20, 80, 0.15)', 
                'rgba(20, 40, 90, 0.12)', 
                'rgba(80, 30, 60, 0.08)'
            ],

            // Stars Configuration
            layers: [
                { count: 500, minSize: 0.5, maxSize: 1.0, color: '#555577', speed: 0.05 }, // Far
                { count: 200, minSize: 1.0, maxSize: 1.8, color: '#8888aa', speed: 0.15 }, // Mid
                { count: 80, minSize: 1.8, maxSize: 2.5, color: '#ffffff', speed: 0.30 },  // Near
                { count: 0,   minSize: 0,   maxSize: 0,   color: 'n/a',     speed: 0.60 }  // Foreground (reserved/shine)
            ],
            
            // Twinkle Settings
            twinkleCount: 25, // How many stars actively shine
            twinkleSpeed: 0.003
        };

        this.buffers = [];
        this.twinkleStars = []; // Stores positions of shining stars
        
        this.init();
    }

    init() {
        // 1. Generate Nebula Buffer (Layer 0)
        // We use a slightly larger scale for nebulae to make them feel huge
        this.buffers.push({
            canvas: this.createSeamlessBuffer(this.params.tileSize, (ctx, w, h) => {
                // Fill background
                ctx.fillStyle = this.params.baseColor;
                ctx.fillRect(0, 0, w, h);
                this.generateSeamlessNebulae(ctx, w, h);
            }),
            speed: 0.02 // Very slow moving
        });

        // 2. Generate Star Buffers (Layers 1, 2, 3)
        this.params.layers.forEach(layer => {
            if(layer.count === 0) return; // Skip empty layers

            const buffer = this.createSeamlessBuffer(this.params.tileSize, (ctx, w, h) => {
                this.generateSeamlessStars(ctx, w, h, layer.count, layer.minSize, layer.maxSize, layer.color);
            });
            
            this.buffers.push({
                canvas: buffer,
                speed: layer.speed
            });
        });

        // 3. Initialize Dynamic Twinkle Stars
        // These are not baked into a canvas, but drawn live to allow animation
        for(let i = 0; i < this.params.twinkleCount; i++) {
            this.twinkleStars.push({
                x: Math.random() * this.params.tileSize,
                y: Math.random() * this.params.tileSize,
                size: 2.0 + Math.random() * 2.0,
                seed: Math.random() * 100, // Random phase for sine wave
                speed: 0.5 + Math.random() * 1.5 // Different blink speeds
            });
        }
    }

    createSeamlessBuffer(size, drawFn) {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        drawFn(ctx, size, size);
        return canvas;
    }

    // Helper to draw objects that wrap around edges
    drawSeamlessCircle(ctx, x, y, radius, w, h) {
        // Helper to draw one circle
        const draw = (px, py) => {
            ctx.beginPath();
            ctx.arc(px, py, radius, 0, Math.PI * 2);
            ctx.fill();
        };

        draw(x, y);

        // Check overlaps and draw duplicates on opposite sides
        let wrapX = x;
        let wrapY = y;
        let doWrapX = false;
        let doWrapY = false;

        // X-axis wrapping
        if (x < radius) { wrapX = x + w; doWrapX = true; }
        else if (x > w - radius) { wrapX = x - w; doWrapX = true; }

        // Y-axis wrapping
        if (y < radius) { wrapY = y + h; doWrapY = true; }
        else if (y > h - radius) { wrapY = y - h; doWrapY = true; }

        if (doWrapX) draw(wrapX, y);
        if (doWrapY) draw(x, wrapY);
        if (doWrapX && doWrapY) draw(wrapX, wrapY); // Corners
    }

    generateSeamlessNebulae(ctx, w, h) {
        const count = this.params.nebulaDensity;
        ctx.globalCompositeOperation = 'screen'; // Nicer blending
        
        for (let i = 0; i < count; i++) {
            const x = Math.random() * w;
            const y = Math.random() * h;
            const radius = 200 + Math.random() * 400;
            const color = this.params.nebulaColors[Math.floor(Math.random() * this.params.nebulaColors.length)];
            
            const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
            grad.addColorStop(0, color);
            grad.addColorStop(0.5, color.replace(/[\d.]+\)$/, '0.05)'));
            grad.addColorStop(1, 'transparent');
            
            ctx.fillStyle = grad;
            
            // We need custom drawing logic for gradients to ensure the gradient center moves
            // Since context translation is easier for gradients than recalculating stops:
            const drawAt = (tx, ty) => {
                ctx.save();
                ctx.translate(tx, ty);
                ctx.beginPath();
                ctx.arc(0, 0, radius, 0, Math.PI*2);
                ctx.fill();
                ctx.restore();
            };

            drawAt(x, y);
            // Wrap Logic
            if (x < radius) drawAt(x + w, y);
            else if (x > w - radius) drawAt(x - w, y);
            
            if (y < radius) drawAt(x, y + h);
            else if (y > h - radius) drawAt(x, y - h);
            
            // Corner logic omitted for gradients to save perf (nebulae are blurry enough)
        }
        ctx.globalCompositeOperation = 'source-over';
    }

    generateSeamlessStars(ctx, w, h, count, minSize, maxSize, color) {
        ctx.fillStyle = color;
        for (let i = 0; i < count; i++) {
            const x = Math.random() * w;
            const y = Math.random() * h;
            const size = minSize + Math.random() * (maxSize - minSize);
            
            // Random opacity for variety
            ctx.globalAlpha = 0.3 + Math.random() * 0.7;
            
            this.drawSeamlessCircle(ctx, x, y, size, w, h);
        }
        ctx.globalAlpha = 1.0;
    }

    draw(ctx, cameraX, cameraY, screenW, screenH, time) {
        // 1. Clear
        ctx.clearRect(0, 0, screenW, screenH);
        
        // 2. Draw the 4 Cached Layers
        this.buffers.forEach(layer => {
            this.renderLayer(ctx, layer.canvas, cameraX, cameraY, layer.speed, screenW, screenH);
        });

        // 3. Draw Live Twinkles (attached to the fastest layer speed)
        this.drawTwinkle(ctx, cameraX, cameraY, 0.30, screenW, screenH, time);
    }

    renderLayer(ctx, image, camX, camY, factor, screenW, screenH) {
        const size = this.params.tileSize;
        
        // Calculate offset (Infinite Scrolling Logic)
        // The % operator ensures we stay within 0..size
        let offsetX = -(camX * factor) % size;
        let offsetY = -(camY * factor) % size;

        // Javascript negative modulo fix
        if (offsetX < 0) offsetX += size;
        if (offsetY < 0) offsetY += size;

        // Tiling Logic: Draw enough tiles to fill screen
        // Usually a 2x2 grid covers it, but if screen > 1024, we need loops
        for (let x = offsetX - size; x < screenW; x += size) {
            for (let y = offsetY - size; y < screenH; y += size) {
                // Only draw if the tile is actually inside the canvas bounds
                if (x + size > 0 && y + size > 0) {
                    ctx.drawImage(image, Math.floor(x), Math.floor(y));
                }
            }
        }
    }

    drawTwinkle(ctx, camX, camY, speedFactor, screenW, screenH, time) {
        const size = this.params.tileSize;
        
        // We move these stars exactly like the "Near" layer so they feel attached
        let offsetX = -(camX * speedFactor) % size;
        let offsetY = -(camY * speedFactor) % size;
        if (offsetX < 0) offsetX += size;
        if (offsetY < 0) offsetY += size;

        const t = time * this.params.twinkleSpeed;

        ctx.fillStyle = "white";

        // Loop through grid similar to tiles to ensure infinite twinkling
        for (let tileX = offsetX - size; tileX < screenW; tileX += size) {
            for (let tileY = offsetY - size; tileY < screenH; tileY += size) {
                
                // Skip if tile is offscreen
                if (tileX + size <= 0 || tileY + size <= 0) continue;

                this.twinkleStars.forEach(star => {
                    // Calculate exact screen position
                    const sx = tileX + star.x;
                    const sy = tileY + star.y;

                    // Skip if this specific star is offscreen
                    if (sx < -10 || sx > screenW + 10 || sy < -10 || sy > screenH + 10) return;

                    // Sine wave breathing effect
                    // Range: 0.0 to 1.0
                    const alpha = (Math.sin(t * star.speed + star.seed) + 1) / 2;
                    
                    // Threshold: Only show when bright (makes it look like a flash)
                    // This prevents "always visible" crosses
                    if (alpha > 0.5) {
                        // Remap 0.5->1.0 to 0.0->1.0 intensity
                        const intensity = (alpha - 0.5) * 2; 
                        
                        ctx.globalAlpha = intensity;
                        
                        // Draw Cross Flare
                        const s = star.size * (1 + intensity * 0.5); // Grow slightly when bright
                        const half = s / 2;
                        
                        ctx.beginPath();
                        // Horizontal
                        ctx.fillRect(sx - s, sy - 1, s * 2, 2);
                        // Vertical
                        ctx.fillRect(sx - 1, sy - s, 2, s * 2);
                        // Core center
                        ctx.beginPath();
                        ctx.arc(sx, sy, 2, 0, Math.PI*2);
                        ctx.fill();
                    }
                });
            }
        }
        ctx.globalAlpha = 1.0;
    }
}