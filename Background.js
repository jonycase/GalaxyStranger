// Background.js

export class StarBackground {
    constructor(options = {}) {
        // Customizable Parameters
        this.params = {
            tileSize: options.tileSize || 1024, // Size of the repeating pattern
            baseColor: options.baseColor || '#050510',
            
            // Nebulae
            nebulaDensity: options.nebulaDensity || 6,
            nebulaColors: options.nebulaColors || ['rgba(70, 40, 150, 0.15)', 'rgba(40, 90, 160, 0.15)', 'rgba(120, 50, 100, 0.10)'],
            
            // Stars
            farStarCount: options.farStarCount || 400,
            nearStarCount: options.nearStarCount || 150,
            farStarColor: options.farStarColor || '#8888aa',
            nearStarColor: options.nearStarColor || '#ffffff',
            
            // Parallax Speeds (lower = slower/further away)
            parallaxFar: 0.2,
            parallaxNear: 0.5
        };

        // Off-screen canvases (buffers) to render once and reuse
        this.layerNebula = null;
        this.layerFar = null;
        this.layerNear = null;
        
        this.twinkleOffset = 0;
        this.init();
    }

    init() {
        // 1. Generate Nebula Layer (Bottom)
        this.layerNebula = this.createBuffer(this.params.tileSize, (ctx, w, h) => {
            ctx.fillStyle = this.params.baseColor;
            ctx.fillRect(0, 0, w, h);
            this.generateNebulae(ctx, w, h);
        });

        // 2. Generate Far Stars (Middle)
        this.layerFar = this.createBuffer(this.params.tileSize, (ctx, w, h) => {
            this.generateStars(ctx, w, h, this.params.farStarCount, 0.5, 1.5, this.params.farStarColor);
        });

        // 3. Generate Near Stars (Top)
        this.layerNear = this.createBuffer(this.params.tileSize, (ctx, w, h) => {
            this.generateStars(ctx, w, h, this.params.nearStarCount, 1.5, 2.5, this.params.nearStarColor);
        });
    }

    createBuffer(size, drawFn) {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        drawFn(ctx, size, size);
        return canvas;
    }

    generateNebulae(ctx, w, h) {
        // Simple procedural cloud generation
        const count = this.params.nebulaDensity;
        
        // Global blend mode for nicer overlap
        ctx.globalCompositeOperation = 'screen'; 
        
        for (let i = 0; i < count; i++) {
            const x = Math.random() * w;
            const y = Math.random() * h;
            const radius = 150 + Math.random() * 300;
            const color = this.params.nebulaColors[Math.floor(Math.random() * this.params.nebulaColors.length)];
            
            const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
            grad.addColorStop(0, color);
            grad.addColorStop(0.4, color.replace('0.1', '0.05')); // Fade out
            grad.addColorStop(1, 'transparent');
            
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Reset composite
        ctx.globalCompositeOperation = 'source-over';
    }

    generateStars(ctx, w, h, count, minSize, maxSize, color) {
        ctx.fillStyle = color;
        for (let i = 0; i < count; i++) {
            const x = Math.random() * w;
            const y = Math.random() * h;
            const size = minSize + Math.random() * (maxSize - minSize);
            
            ctx.globalAlpha = 0.4 + Math.random() * 0.6;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1.0;
    }

    // The main render loop
    draw(ctx, cameraX, cameraY, screenW, screenH, time) {
        // Clear main canvas
        ctx.clearRect(0, 0, screenW, screenH);
        
        // Base background color
        ctx.fillStyle = this.params.baseColor;
        ctx.fillRect(0, 0, screenW, screenH);

        // Calculate Tiling Pattern
        // We tile the pattern based on camera position relative to layer speed
        
        // Layer 1: Nebulae (Very slow / Static-ish)
        this.renderLayer(ctx, this.layerNebula, cameraX, cameraY, this.params.parallaxFar * 0.5, screenW, screenH);

        // Layer 2: Far Stars
        this.renderLayer(ctx, this.layerFar, cameraX, cameraY, this.params.parallaxFar, screenW, screenH);

        // Layer 3: Near Stars
        this.renderLayer(ctx, this.layerNear, cameraX, cameraY, this.params.parallaxNear, screenW, screenH);
        
        // Add Dynamic Shine (Twinkle)
        // We do this procedurally on top to avoid expensive canvas regeneration
        this.drawTwinkle(ctx, screenW, screenH, time);
    }

    renderLayer(ctx, image, camX, camY, factor, screenW, screenH) {
        const size = this.params.tileSize;
        
        // Calculate offset modulo size to create infinite tiling
        // The negative sign ensures background moves opposite to camera
        let offsetX = -(camX * factor) % size;
        let offsetY = -(camY * factor) % size;

        // Correct javascript modulo bug for negative numbers
        if (offsetX < 0) offsetX += size;
        if (offsetY < 0) offsetY += size;

        // We need to draw a 2x2 grid (or 3x3) to cover the screen seams
        // Since screen might be larger than tileSize, we loop
        
        for (let x = offsetX - size; x < screenW; x += size) {
            for (let y = offsetY - size; y < screenH; y += size) {
                // Optimization: only draw if visible
                if (x + size > 0 && y + size > 0) {
                    ctx.drawImage(image, x, y);
                }
            }
        }
    }

    drawTwinkle(ctx, w, h, time) {
        // Draw a few random shining stars that change based on time
        const twinkleSpeed = 0.002;
        const t = time * twinkleSpeed;
        
        // Use a pseudo-random logic based on time to make it look like specific stars are glowing
        const count = 15; 
        
        ctx.fillStyle = "white";
        
        for(let i=0; i<count; i++) {
            // Arbitrary positions that move with camera slightly to look attached to near layer
            // This is a "cheap" way to add twinkle without iterating all stars
            const seed = i * 1337;
            const alpha = (Math.sin(t + seed) + 1) / 2; // 0 to 1 oscillator
            
            if (alpha > 0.8) { // Only draw when bright (pop-in effect)
                // Pick a position 'fixed' to the near layer grid
                // This is pseudo-code visual flare, not actual star objects
                const x = (Math.sin(seed) * 5000 + w/2) % w;
                const y = (Math.cos(seed) * 5000 + h/2) % h;
                
                if(x > 0 && x < w && y > 0 && y < h) {
                    ctx.globalAlpha = alpha;
                    
                    // Draw cross shine
                    const size = 2 + (alpha * 2);
                    ctx.beginPath();
                    ctx.rect(x - size, y - 1, size*2, 2);
                    ctx.rect(x - 1, y - size, 2, size*2);
                    ctx.fill();
                }
            }
        }
        ctx.globalAlpha = 1.0;
    }
}