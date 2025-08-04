import { Encounter } from './Encounter.js';

export class DebrisEncounter extends Encounter {
    constructor(player, gameState) {
        super(player, gameState, {
            type: 'debris',
            title: 'SPACE DEBRIS FIELD',
            iconClass: 'fa-radiation'
        });
        
        this.damage = 5 + Math.floor(Math.random() * 10);
    }

    renderContent(contentEl) {
        contentEl.innerHTML = `
            <p>You've entered a dangerous space debris field!</p>
            <div style="margin: 15px 0; background: rgba(0,0,0,0.2); padding: 10px; border-radius: 8px;">
                <div>Damage: <span style="color: #ff6666;">${this.damage}%</span></div>
            </div>
            <p>Would you like to try to navigate through or go around?</p>
        `;
    }

    renderOptions() {
        const optionsEl = document.getElementById('encounter-options');
        if (!optionsEl) return;
        
        optionsEl.innerHTML = '';
        
        const navigateButton = document.createElement('button');
        navigateButton.className = 'combat-btn attack';
        navigateButton.innerHTML = '<i class="fas fa-rocket"></i> NAVIGATE THROUGH';
        navigateButton.dataset.action = 'navigate';
        optionsEl.appendChild(navigateButton);
        
        const goAroundButton = document.createElement('button');
        goAroundButton.className = 'combat-btn';
        goAroundButton.innerHTML = '<i class="fas fa-route"></i> GO AROUND';
        goAroundButton.dataset.action = 'go-around';
        optionsEl.appendChild(goAroundButton);
    }

    handleAction(action) {
        if (action === 'navigate') {
            // Higher chance of taking damage
            const damage = this.damage + Math.floor(Math.random() * 5);
            this.gameState.ship.hull = Math.max(0, this.gameState.ship.hull - damage);
            this.log(`Took ${damage}% hull damage navigating through the debris field.`);
            
            // Check for game over
            if (this.gameState.ship.hull <= 0) {
                this.log(`<strong>Your ship was destroyed by the debris!</strong>`);
            }
            
            setTimeout(() => {
                this.end();
                this.closeEncounterModal();
            }, 1000);
        } else if (action === 'go-around') {
            // Add a small fuel cost for going around
            const fuelCost = 2 + Math.floor(Math.random() * 3);
            this.gameState.fuel = Math.max(0, this.gameState.fuel - fuelCost);
            this.log(`Went around the debris field, using ${fuelCost} fuel.`);
            
            setTimeout(() => {
                this.end();
                this.closeEncounterModal();
            }, 500);
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