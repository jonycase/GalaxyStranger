/* --- START OF FILE Background.js --- */

export class StarBackground {
    constructor() {
        // Configuration
        this.tileSize = 1024; // Texture size (power of 2 is good)
        
        // Layers: Speed (lower = slower/further), CanvasBuffer
        this.layers = [
            { speed: 0.05, buffer: null, type: 'nebula' }, // Furthest (Nebula)
            { speed: 0.1,  buffer: null, type: 'stars_small' }, // Far stars
            { speed: 0.2,  buffer: null, type: 'stars_medium' } // Mid stars
        ];

        this.baseColor = '#050508'; // Deep space black/blue
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;

        // Generate the static textures once
        this.layers.forEach(layer => {
            layer.buffer = document.createElement('canvas');
            layer.buffer.width = this.tileSize;
            layer.buffer.height = this.tileSize;
            const ctx = layer.buffer.getContext('2d');

            if (layer.type === 'nebula') {
                this.generateNebulaTexture(ctx, this.tileSize);
            } else if (layer.type.includes('stars')) {
                const count = layer.type === 'stars_small' ? 400 : 150;
                const size = layer.type === 'stars_small' ? 1 : 2;
                this.generateStarTexture(ctx, this.tileSize, count, size);
            }
        });

        this.initialized = true;
    }

    generateNebulaTexture(ctx, size) {
        // Create random gas clouds
        for (let i = 0; i < 5; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            const radius = 200 + Math.random() * 300;
            
            // Subtle purple/blue gradients
            const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
            gradient.addColorStop(0, 'rgba(40, 20, 60, 0.15)');
            gradient.addColorStop(0.6, 'rgba(20, 30, 70, 0.05)');
            gradient.addColorStop(1, 'transparent');

            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, size, size);
        }
    }

    generateStarTexture(ctx, size, count, baseSize) {
        ctx.fillStyle = '#FFF';
        for (let i = 0; i < count; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            const s = Math.random() * baseSize;
            const alpha = 0.3 + Math.random() * 0.7;
            
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.arc(x, y, s, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1.0;
    }

    /**
     * Draws the background.
     * @param {CanvasRenderingContext2D} ctx - The main canvas context
     * @param {number} camX - Camera World X
     * @param {number} camY - Camera World Y
     * @param {number} width - Screen Width
     * @param {number} height - Screen Height
     */
    draw(ctx, camX, camY, width, height) {
        // 1. Fill Base Void
        ctx.fillStyle = this.baseColor;
        ctx.fillRect(0, 0, width, height);

        // 2. Draw Parallax Layers
        this.layers.forEach(layer => {
            // Calculate offset based on camera position and layer speed
            // We use modulo (%) to create an infinite loop effect
            const sx = -camX * layer.speed;
            const sy = -camY * layer.speed;

            let offsetX = ((sx % this.tileSize) + this.tileSize) % this.tileSize;
            let offsetY = ((sy % this.tileSize) + this.tileSize) % this.tileSize;

            offsetX = Math.floor(offsetX);
            offsetY = Math.floor(offsetY);

            // We need to draw enough tiles to cover the screen.
            // Since the offset shifts the grid, we essentially draw a 
            // grid starting from slightly off-screen (left/top).
            
            // Start coordinates
            const startX = offsetX - this.tileSize;
            const startY = offsetY - this.tileSize;

            for (let x = startX; x < width; x += this.tileSize) {
                for (let y = startY; y < height; y += this.tileSize) {
                    // Optimization: Only draw if tile intersects screen
                    // FIX: Changed > 0 to > -1. 
                    // If x + size equals exactly 0, the previous check failed, creating black bars.
                    if (x + this.tileSize > -1 && y + this.tileSize > -1) {
                        ctx.drawImage(layer.buffer, Math.floor(x), Math.floor(y));
                    }
                }
            }
        });
    }
}