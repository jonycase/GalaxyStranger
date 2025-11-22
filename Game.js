import { GameState } from './GameState.js';
import { EncounterManager } from './EncounterManager.js';
import { UI } from './UI.js';

console.log("Game.js loading...");

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Loaded. Initializing Game...");

    // 1. Element References
    const initScreen = document.getElementById('init-screen');
    const gameContent = document.getElementById('game-content');
    const startBtn = document.getElementById('start-game-btn');
    const newGameBtn = document.getElementById('new-game-btn');
    const sizeOptions = document.querySelectorAll('.size-option');
    const shapeOptions = document.querySelectorAll('.shape-option');

    // Check for critical elements
    if (!initScreen || !startBtn) {
        console.error("Critical DOM elements missing! Check index.html IDs.");
        return;
    }

    // 2. Initialize Logic Classes
    const gameState = new GameState();
    const encounterManager = new EncounterManager(gameState);
    // Pass dependencies to UI
    const ui = new UI(gameState, encounterManager);
    
    // Circular dependency resolution: EncounterManager needs UI to show modals
    encounterManager.setUI(ui);

    // 3. Setup Menu Interactions
    
    // A. Galaxy Size Selection
    if (sizeOptions) {
        sizeOptions.forEach(option => {
            option.addEventListener('click', () => {
                // Remove active class from all
                sizeOptions.forEach(o => o.classList.remove('selected'));
                // Add to clicked
                option.classList.add('selected');
            });
        });
    }

    // B. Galaxy Shape Selection
    if (shapeOptions) {
        shapeOptions.forEach(option => {
            option.addEventListener('click', () => {
                shapeOptions.forEach(o => o.classList.remove('selected'));
                option.classList.add('selected');
            });
        });
    }

    // C. Start Game Button
    startBtn.addEventListener('click', () => {
        console.log("Start Button Clicked");
        
        const selectedSizeOpt = document.querySelector('.size-option.selected');
        const selectedShapeOpt = document.querySelector('.shape-option.selected');

        // Default values if selection fails
        const size = selectedSizeOpt ? parseInt(selectedSizeOpt.dataset.size) : 1000;
        const shape = selectedShapeOpt ? selectedShapeOpt.dataset.shape : 'balanced';
        
        console.log(`Initializing Galaxy: Size=${size}, Shape=${shape}`);

        // Set Config
        gameState.galaxyShape = shape;

        // UI Transition: Fade out init screen
        initScreen.style.opacity = '0';
        initScreen.style.pointerEvents = 'none'; // Prevent double clicks

        setTimeout(() => {
            initScreen.style.display = 'none';
            gameContent.style.display = 'flex'; // Show Game UI
            
            // Start Generation
            gameState.initGame(size, () => {
                console.log("Generation Complete. Starting UI...");
                
                // Setup Canvas & Listeners
                ui.setupCanvas();
                
                // Render initial state
                ui.updateUI();
                
                ui.showNotification("Systems Online. Welcome Commander.");
            });
        }, 500); // Wait for fade out
    });

    // D. Restart Button (Game Over Screen)
    if (newGameBtn) {
        newGameBtn.addEventListener('click', () => {
            window.location.reload();
        });
    }
});