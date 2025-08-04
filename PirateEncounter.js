import { CombatEncounter } from './CombatEncounter.js';

export class PirateEncounter extends CombatEncounter {
    constructor(player, pirateData, gameState) {
        super(player, pirateData, gameState, {
            type: 'pirate',
            title: 'PIRATE ENCOUNTER!',
            iconClass: 'fa-skull'
        });
        
        this.pirateData = pirateData;
        this.bounty = 500 + (pirateData.tier * 300);
    }
    
    end(result = {}) {
        const encounterResult = super.end(result);
        
        // Apply bounty if player won
        if (this.opponentStats.hull <= 0 && this.playerStats.hull > 0) {
            this.gameState.credits += this.bounty;
            this.showNotification(`Pirate destroyed! +${this.bounty} CR bounty!`);
        } 
        // Handle player defeat
        else if (this.playerStats.hull <= 0) {
            this.showNotification("Your ship has been destroyed!");
        }
        
        return encounterResult;
    }
}