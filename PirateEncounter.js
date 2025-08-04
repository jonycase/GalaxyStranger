import { CombatEncounter } from './CombatEncounter.js';

export class PirateEncounter extends CombatEncounter {
    constructor(player, pirate, gameState) {
        super(player, pirate, gameState, {
            type: 'pirate',
            title: 'PIRATE ENCOUNTER',
            iconClass: 'fa-skull'
        });
    }
    
    end(result = {}) {
        const encounterResult = super.end(result);
        
        // Add reward if pirate was defeated
        if (this.opponentStats.hull <= 0) {
            const reward = 500 + this.opponent.tier * 300;
            this.gameState.credits += reward;
            this.log(`+${reward} CR bounty!`);
        }
        
        return encounterResult;
    }
}