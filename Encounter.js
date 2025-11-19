// Encounter.js
export class Encounter {
    constructor(player, gameState, options = {}) {
        this.player = player;
        this.gameState = gameState;
        this.type = options.type || 'generic';
        this.title = options.title || 'Encounter';
        this.iconClass = options.iconClass || 'fa-question-circle';
        this.active = false;
        this.logMessages = [];
        this.options = options;
    }

    start() {
        this.active = true;
        this.log('Encounter started!');
        
        // CRITICAL UX FIX: Close Galaxy Map if open
        const mapModal = document.getElementById('galaxy-map-modal');
        if (mapModal) mapModal.style.display = 'none';
        
        this.updateUI();
        this.renderOptions();
    }

    end(result = {}) {
        this.active = false;
        this.log('Encounter ended.');
        this.updateUI();
        this.closeEncounterModal();
        return result;
    }

    log(message) {
        this.logMessages.push(message);
        this.updateLog();
    }

    updateUI() {
        const modal = document.getElementById('encounter-modal');
        const titleEl = document.getElementById('encounter-title');
        const iconEl = document.getElementById('encounter-icon');
        const contentEl = document.getElementById('encounter-content');
        
        if (modal) {
            // Update modal content
            if (titleEl) titleEl.textContent = this.title;
            if (iconEl) iconEl.className = `fas ${this.iconClass}`;
            
            // Update encounter-specific content
            if (contentEl) this.renderContent(contentEl);
            
            // Show the modal
            modal.style.opacity = '1';
            modal.style.pointerEvents = 'all';
        }
    }

    updateLog() {
        const logEl = document.getElementById('encounter-log');
        if (!logEl) return;
        
        // Create HTML for all log messages
        const logHTML = this.logMessages.map(msg => `<p>${msg}</p>`).join('');
        logEl.innerHTML = logHTML;
        
        // Auto-scroll to bottom
        logEl.scrollTop = logEl.scrollHeight;
    }

    renderContent(contentEl) {
        // Base implementation - overridden by subclasses
        contentEl.innerHTML = '<p>Generic encounter content</p>';
    }

    renderOptions() {
        const optionsEl = document.getElementById('encounter-options');
        if (!optionsEl) return;
        
        optionsEl.innerHTML = '';
        
        // Add default close button
        const closeButton = document.createElement('button');
        closeButton.className = 'combat-btn';
        closeButton.innerHTML = '<i class="fas fa-times"></i> CLOSE';
        closeButton.dataset.action = 'close';
        optionsEl.appendChild(closeButton);
    }

    handleAction(action) {
        if (action === 'close') {
            this.end();
            return;
        }
        
        this.log(`Action "${action}" not implemented for this encounter type.`);
    }
    
    closeEncounterModal() {
        const modal = document.getElementById('encounter-modal');
        if (modal) {
            modal.style.opacity = '0';
            modal.style.pointerEvents = 'none';
        }
    }
    
    showNotification(message) {
        const notification = document.getElementById('notification');
        if (!notification) return;
        
        notification.textContent = message;
        notification.style.opacity = '1';
        notification.style.transform = 'translateX(-50%) translateY(0)';
        
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(-50%) translateY(-20px)';
        }, 3000);
    }
    
    updateMainUI() {
        // Update the main UI elements
        const creditsEl = document.getElementById('credits');
        const fuelEl = document.getElementById('fuel');
        const hullEl = document.getElementById('hull');
        const cargoSpaceEl = document.getElementById('cargo-space');
        
        if (creditsEl) creditsEl.textContent = this.gameState.credits.toLocaleString() + ' CR';
        if (fuelEl) fuelEl.textContent = `${Math.round(this.gameState.fuel)}/${this.gameState.maxFuel}`;
        if (hullEl) hullEl.textContent = this.gameState.ship.hull + '%';
        
        const cargoSpace = this.gameState.cargo.reduce((sum, item) => sum + item.quantity, 0);
        if (cargoSpaceEl) cargoSpaceEl.textContent = `${cargoSpace}/${this.gameState.cargoCapacity}`;
    }
    
    checkGameOver() {
        if (this.gameState.ship.hull <= 0) {
            this.showGameOverScreen();
            return true;
        }
        return false;
    }
    
    showGameOverScreen() {
        const gameOverScreen = document.getElementById('game-over-screen');
        const creditsEl = document.getElementById('game-over-credits');
        const distanceEl = document.getElementById('game-over-distance');
        const systemsEl = document.getElementById('game-over-systems');
        
        if (gameOverScreen) {
            // Update stats
            if (creditsEl) creditsEl.textContent = this.gameState.credits.toLocaleString() + ' CR';
            if (distanceEl) distanceEl.textContent = Math.round(this.gameState.distanceTraveled) + ' LY';
            if (systemsEl) systemsEl.textContent = this.gameState.systemsVisited;
            
            gameOverScreen.style.display = 'flex';
        }
    }
}