import { Encounter } from './Encounter.js';

export class AnomalyEncounter extends Encounter {
    constructor(player, gameState) {
        super(player, gameState, {
            type: 'anomaly',
            title: 'SPATIAL ANOMALY',
            iconClass: 'fa-wind'
        });
        
        this.effect = Math.random();
        this.reward = 0;
        this.damage = 0;
        this.fuelChange = 0;
        
        // Determine the effect
        if (this.effect < 0.3) {
            // Positive effect - fuel boost
            this.fuelChange = 10;
            this.message = "Passed through a spatial anomaly. Gained 10 fuel units!";
        } else if (this.effect < 0.7) {
            // Negative effect - fuel loss
            this.fuelChange = - (10 + Math.floor(Math.random() * 20));
            this.message = `Passed through a spatial anomaly. Lost ${Math.abs(this.fuelChange)} fuel units.`;
        } else {
            // Mixed effect
            this.reward = 300 + Math.floor(Math.random() * 700);
            this.damage = 5 + Math.floor(Math.random() * 15);
            this.message = `Passed through a spatial anomaly. Gained ${this.reward} CR but took ${this.damage}% hull damage.`;
        }
    }

    renderContent(contentEl) {
        contentEl.innerHTML = `
            <p>You've encountered a strange spatial anomaly!</p>
            <div style="margin: 15px 0; background: rgba(0,0,0,0.2); padding: 10px; border-radius: 8px;">
                <div>Effect: <span style="${this.fuelChange > 0 ? 'color: #66ff99;' : this.fuelChange < 0 ? 'color: #ff6666;' : 'color: #66ff99;'}">
                    ${this.fuelChange > 0 ? '+' : ''}${this.fuelChange} fuel
                </span></div>
                ${this.reward > 0 ? `<div>Reward: <span style="color: #66ff99;">${this.reward} CR</span></div>` : ''}
                ${this.damage > 0 ? `<div>Damage: <span style="color: #ff6666;">${this.damage}%</span></div>` : ''}
            </div>
            <p>${this.message}</p>
        `;
    }

    renderOptions() {
        const optionsEl = document.getElementById('encounter-options');
        if (!optionsEl) return;
        
        optionsEl.innerHTML = '';
        
        const proceedButton = document.createElement('button');
        proceedButton.className = 'combat-btn';
        proceedButton.innerHTML = '<i class="fas fa-wind"></i> PROCEED THROUGH';
        proceedButton.dataset.action = 'proceed';
        optionsEl.appendChild(proceedButton);
    }

    handleAction(action) {
        if (action === 'proceed') {
            // Apply effects
            this.gameState.fuel = Math.max(0, Math.min(this.gameState.maxFuel, this.gameState.fuel + this.fuelChange));
            
            if (this.reward > 0) {
                this.gameState.credits += this.reward;
            }
            
            if (this.damage > 0) {
                this.gameState.ship.hull = Math.max(0, this.gameState.ship.hull - this.damage);
            }
            
            this.log(this.message);
            
            // Check for game over
            if (this.gameState.ship.hull <= 0) {
                this.log(`<strong>Your ship was destroyed by the anomaly!</strong>`);
            }
            
            setTimeout(() => {
                this.end();
                this.closeEncounterModal();
            }, 1000);
        } else {
            super.handleAction(action);
        }
    }
    
    end(result = {}) {
        const encounterResult = super.end(result);
        this.updateMainUI();
        return encounterResult;
    }
}