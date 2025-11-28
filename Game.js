/* --- START OF FILE Game.js --- */

import { GameState } from './GameState.js';
import { UI } from './UI.js';
import { EncounterManager } from './EncounterManager.js';

class Game {
    constructor() {
        this.gameState = new GameState();
        this.encounterManager = new EncounterManager(this.gameState);
        this.ui = new UI(this.gameState, this.encounterManager);
        
        this.init();
        this.setupGlobalAnimationHandler();
    }

    init() {
        // Setup Start Screen Interactions
        this.setupStartScreen();
        
        // Handle window resize for canvases
        window.addEventListener('resize', () => {
            if (this.ui) this.ui.handleResize();
        });
    }

    setupStartScreen() {
        const sizeOptions = document.querySelectorAll('.size-option');
        const shapeOptions = document.querySelectorAll('.shape-option');
        const startBtn = document.getElementById('start-game-btn');
        
        // Size Selection
        sizeOptions.forEach(opt => {
            opt.addEventListener('click', () => {
                sizeOptions.forEach(o => o.classList.remove('selected'));
                opt.classList.add('selected');
                // Animation is handled by global handler
            });
        });

        // Shape Selection
        shapeOptions.forEach(opt => {
            opt.addEventListener('click', () => {
                shapeOptions.forEach(o => o.classList.remove('selected'));
                opt.classList.add('selected');
            });
        });

        // Start Game
        if(startBtn) {
            startBtn.addEventListener('click', () => {
                const selectedSize = document.querySelector('.size-option.selected').dataset.size;
                const selectedShape = document.querySelector('.shape-option.selected').dataset.shape;
                
                this.gameState.galaxyShape = selectedShape || 'balanced';
                
                // Hide Init Screen
                const initScreen = document.getElementById('init-screen');
                initScreen.style.opacity = '0';
                setTimeout(() => initScreen.style.display = 'none', 800);

                // Start Generation
                this.gameState.initGame(parseInt(selectedSize), () => {
                    document.getElementById('game-content').style.display = 'flex';
                    this.ui.setupCanvas();
                    this.ui.updateUI();
                });
            });
        }
    }

    /**
     * GLOBAL ANIMATION HANDLER
     * This solves the rapid-tapping issue on mobile and desktop.
     * It uses Event Delegation to catch clicks on any interactive element,
     * resets the animation timeline via reflow, and plays it crisply.
     */
    setupGlobalAnimationHandler() {
        document.addEventListener('click', function(e) {
            // 1. Identify interactive elements using closest()
            // This catches clicks on <i> icons or spans inside buttons too.
            const target = e.target.closest('.btn, button, .tab, .combat-btn, .size-option, .upgrade-item, .contract-item, .system-overview-item, .map-center-btn, .close-map-btn');

            // 2. Safety checks
            if (!target || target.disabled || target.classList.contains('disabled')) {
                return;
            }

            // 3. THE RESET TRICK (Force Reflow)
            // Remove class -> Force Layout Recalc -> Add Class
            // This guarantees the animation timeline starts at 0ms every time.
            target.classList.remove('anim-active');
            void target.offsetWidth; // Trigger reflow
            target.classList.add('anim-active');

            // 4. Cleanup
            // Remove the class when animation ends so normal hover states work again
            target.addEventListener('animationend', function() {
                target.classList.remove('anim-active');
            }, { once: true });

        }, true); // Use Capture phase to ensure we catch it before other handlers if needed
    }
}

// Start the Game
window.onload = () => {
    window.game = new Game();
};