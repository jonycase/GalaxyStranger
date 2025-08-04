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
        document.querySelectorAll('.size-option').forEach(option => {
            option.addEventListener('click', () => {
                // Highlight selection
                document.querySelectorAll('.size-option').forEach(o => o.classList.remove('selected'));
                option.classList.add('selected');
                
                // Start game after brief pause
                setTimeout(() => {
                    const size = parseInt(option.dataset.size);
                    const initScreen = document.getElementById('init-screen');
                    const gameContent = document.getElementById('game-content');
                    if (initScreen) initScreen.style.display = 'none';
                    if (gameContent) gameContent.style.display = 'flex';
                    
                    gameState.initGame(size);
                    ui.setupCanvas();
                    ui.setupEventListeners();
                    gameState.generateContracts();
                    ui.updateUI();
                }, 300);
            });
        });
    });
});