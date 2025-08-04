import { Encounter } from './Encounter.js';

export class AnomalyEncounter extends Encounter {
    constructor(player, gameState, options = {}) {
        super(player, gameState, {
            ...options,
            type: 'anomaly',
            title: 'SPATIAL ANOMALY',
            iconClass: 'fa-wind'
        });
        
        this.effect = Math.random();
        this.fuelLoss = 0;
        this.damage = 0;
        this.reward = 0;
        
        if (this.effect < 0.3) {
            // Positive effect - fuel boost
            this.fuelGain = 10;
            this.message = "Passed through a spatial anomaly. Gained 10 fuel units!";
        } else if (this.effect < 0.7) {
            // Negative effect - fuel loss
            this.fuelLoss = 10 + Math.floor(Math.random() * 20);
            this.message = `Passed through a spatial anomaly. Lost ${this.fuelLoss} fuel units.`;
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
                <p>${this.message}</p>
            </div>
            <p>Would you like to investigate further?</p>
        `;
    }

    renderOptions() {
        const optionsEl = document.getElementById('encounter-options');
        if (!optionsEl) return;
        
        optionsEl.innerHTML = '';
        
        const investigateButton = document.createElement('button');
        investigateButton.className = 'combat-btn';
        investigateButton.style.background = 'linear-gradient(to bottom, #6666cc, #4444aa);';
        investigateButton.innerHTML = `<i class="fas fa-search"></i> INVESTIGATE`;
        investigateButton.dataset.action = 'investigate';
        optionsEl.appendChild(investigateButton);
        
        const bypassButton = document.createElement('button');
        bypassButton.className = 'combat-btn';
        bypassButton.style.background = 'linear-gradient(to bottom, #cc6666, #aa4444);';
        bypassButton.innerHTML = `<i class="fas fa-running"></i> BYPASS`;
        bypassButton.dataset.action = 'bypass';
        optionsEl.appendChild(bypassButton);
    }

    handleAction(action) {
        if (action === 'investigate') {
            if (this.effect < 0.3) {
                // Positive effect
                this.gameState.fuel = Math.min(this.gameState.maxFuel, this.gameState.fuel + this.fuelGain);
                this.log(`Gained ${this.fuelGain} fuel units!`);
            } else if (this.effect < 0.7) {
                // Negative effect
                this.gameState.fuel = Math.max(0, this.gameState.fuel - this.fuelLoss);
                this.log(`Lost ${this.fuelLoss} fuel units.`);
            } else {
                // Mixed effect
                this.gameState.credits += this.reward;
                this.gameState.ship.hull = Math.max(0, this.gameState.ship.hull - this.damage);
                this.log(`Gained ${this.reward} CR but took ${this.damage}% hull damage.`);
            }
        } else {
            // 30% chance of minor effect when bypassing
            if (Math.random() < 0.3) {
                const minorEffect = Math.random();
                if (minorEffect < 0.5) {
                    const minorFuelLoss = 5 + Math.floor(Math.random() * 10);
                    this.gameState.fuel = Math.max(0, this.gameState.fuel - minorFuelLoss);
                    this.log(`Minor anomaly effect: Lost ${minorFuelLoss} fuel units.`);
                } else {
                    const minorDamage = 3 + Math.floor(Math.random() * 5);
                    this.gameState.ship.hull = Math.max(0, this.gameState.ship.hull - minorDamage);
                    this.log(`Minor anomaly effect: Took ${minorDamage}% hull damage.`);
                }
            } else {
                this.log("You safely bypassed the anomaly.");
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