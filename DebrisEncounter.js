import { Encounter } from './Encounter.js';

export class DebrisEncounter extends Encounter {
    constructor(player, gameState, options = {}) {
        super(player, gameState, {
            ...options,
            type: 'debris',
            title: 'SPACE DEBRIS FIELD',
            iconClass: 'fa-radiation'
        });
        
        this.damage = 5 + Math.floor(Math.random() * 10);
    }

    renderContent(contentEl) {
        contentEl.innerHTML = `
            <p>You've entered a field of space debris!</p>
            <div style="margin: 15px 0; background: rgba(0,0,0,0.2); padding: 10px; border-radius: 8px;">
                <div>Damage: <span style="color: #ff6666;">${this.damage}% hull damage</span></div>
            </div>
            <p>Would you like to attempt to navigate through it?</p>
        `;
    }

    renderOptions() {
        const optionsEl = document.getElementById('encounter-options');
        if (!optionsEl) return;
        
        optionsEl.innerHTML = '';
        
        const navigateButton = document.createElement('button');
        navigateButton.className = 'combat-btn';
        navigateButton.style.background = 'linear-gradient(to bottom, #cc6666, #aa4444);';
        navigateButton.innerHTML = `<i class="fas fa-running"></i> NAVIGATE`;
        navigateButton.dataset.action = 'navigate';
        optionsEl.appendChild(navigateButton);
        
        const avoidButton = document.createElement('button');
        avoidButton.className = 'combat-btn';
        avoidButton.style.background = 'linear-gradient(to bottom, #6666cc, #4444aa);';
        avoidButton.innerHTML = `<i class="fas fa-shield-alt"></i> AVOID`;
        avoidButton.dataset.action = 'avoid';
        optionsEl.appendChild(avoidButton);
    }

    handleAction(action) {
        if (action === 'navigate') {
            this.log(`You hit space debris! Took ${this.damage}% hull damage.`);
            this.gameState.ship.hull = Math.max(0, this.gameState.ship.hull - this.damage);
        } else {
            // 70% chance to avoid debris
            if (Math.random() < 0.7) {
                this.log("You successfully avoided the debris field.");
            } else {
                const partialDamage = Math.floor(this.damage / 2);
                this.log(`You tried to avoid but still took ${partialDamage}% hull damage.`);
                this.gameState.ship.hull = Math.max(0, this.gameState.ship.hull - partialDamage);
            }
        }
        
        setTimeout(() => {
            this.end();
            this.closeEncounterModal();
        }, 1000);
    }
    
    end(result = {}) {
        const encounterResult = super.end(result);
        this.updateMainUI();
        return encounterResult;
    }
}