import { GameState } from './GameState.js';
import { EncounterManager } from './EncounterManager.js';
import { UI } from './UI.js';

document.addEventListener('DOMContentLoaded', () => {
    const gameState = new GameState();
    const encounterManager = new EncounterManager(gameState);
    const ui = new UI(gameState, encounterManager);
    
    // Initialize the game
    window.addEventListener('load', () => {
        // Galaxy size selection
        const sizeOptions = document.querySelectorAll('.size-option');
        if (sizeOptions) {
            sizeOptions.forEach(option => {
                option.addEventListener('click', () => {
                    // Highlight selection
                    document.querySelectorAll('.size-option').forEach(o => o.classList.remove('selected'));
                    option.classList.add('selected');
                    
                    // Get selected shape
                    const shape = document.querySelector('.shape-option.selected')?.dataset.shape || 'balanced';

                    // Start game after brief pause
                    setTimeout(() => {
                        const size = parseInt(option.dataset.size);
                        const initScreen = document.getElementById('init-screen');
                        const gameContent = document.getElementById('game-content');
                        
                        if (initScreen) initScreen.style.display = 'none';
                        if (gameContent) gameContent.style.display = 'flex';
                        
                        // Store shape in gameState and initialize game
                        gameState.galaxyShape = shape; 
                        gameState.initGame(size, () => {
                            ui.setupCanvas();
                            ui.updateUI(); 
                            ui.showNotification(`Welcome to ${gameState.currentSystem.name}!`);
                        });
                    }, 300);
                });
            });
        }
        
        // Shape selection logic
        const shapeOptions = document.querySelectorAll('.shape-option');
        if (shapeOptions) {
            shapeOptions.forEach(option => {
                option.addEventListener('click', () => {
                    document.querySelectorAll('.shape-option').forEach(o => o.classList.remove('selected'));
                    option.classList.add('selected');
                });
            });
        }

        // Game Over Restart logic
        const newGameBtn = document.getElementById('new-game-btn');
        if (newGameBtn) {
            newGameBtn.addEventListener('click', () => {
                window.location.reload();
            });
        }
    });
});