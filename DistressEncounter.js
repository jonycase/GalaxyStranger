import { Encounter } from './Encounter.js';

export class DistressEncounter extends Encounter {
    constructor(player, gameState) {
        super(player, gameState, {
            type: 'distress',
            title: 'DISTRESS SIGNAL',
            iconClass: 'fa-siren-on'
        });
        
        this.reward = 500 + Math.floor(Math.random() * 1500);
        this.risk = Math.random() > 0.7; // 30% chance of trap
    }

    renderContent(contentEl) {
        let content = `
            <p>You've detected a distress signal from a nearby freighter!</p>
            <div style="margin: 15px 0; background: rgba(0,0,0,0.2); padding: 10px; border-radius: 8px;">
                <div>Reward: <span style="color: #66ff99;">${this.reward} CR</span></div>
            </div>
            <p>Would you like to investigate?</p>
        `;
        
        if (this.risk) {
            content += `<p style="color: #ff6666; margin-top: 10px;"><i class="fas fa-exclamation-triangle"></i> Warning: This could be a pirate trap!</p>`;
        }
        
        contentEl.innerHTML = content;
    }

    renderOptions() {
        const optionsEl = document.getElementById('encounter-options');
        if (!optionsEl) return;
        
        optionsEl.innerHTML = '';
        
        const investigateButton = document.createElement('button');
        investigateButton.className = 'combat-btn';
        investigateButton.innerHTML = '<i class="fas fa-search"></i> INVESTIGATE';
        investigateButton.dataset.action = 'investigate';
        optionsEl.appendChild(investigateButton);
        
        const ignoreButton = document.createElement('button');
        ignoreButton.className = 'combat-btn';
        ignoreButton.innerHTML = '<i class="fas fa-times"></i> IGNORE';
        ignoreButton.dataset.action = 'ignore';
        optionsEl.appendChild(ignoreButton);
    }

    handleAction(action) {
        if (action === 'investigate') {
            if (this.risk) {
                // It was a trap!
                this.log("It was a pirate trap!");
                
                // Start a pirate encounter
                setTimeout(() => {
                    this.end();
                    this.closeEncounterModal();
                    
                    // Start pirate encounter
                    const encounterManager = new (function() {
                        // This is a simplified version of EncounterManager
                        // In a real implementation, this would be properly injected
                        return {
                            startEncounter: function(type) {
                                // This would normally trigger the pirate encounter
                                // For this example, we'll simulate it
                                const gameState = window.gameState; // Assuming gameState is available globally
                                const techLevels = ['low', 'medium', 'high'];
                                const tier = Math.min(techLevels.indexOf(gameState.currentSystem.techLevel) + 1 + Math.floor(Math.random() * 3), 10);
                                
                                const pirateNames = ['Bandit', 'Marauder', 'Corsair', 'Raider', 'Reaver', 'Vandal', 'Ravager'];
                                const pirateTypes = ['Interceptor', 'Frigate', 'Cruiser', 'Battleship', 'Dreadnought'];
                                
                                const baseHull = 70 + tier * 10;
                                const baseDamage = 5 + tier * 3;
                                const pirateMultiplier = 1.2 + (0.10 * (tier - 1));
                                
                                const pirateData = {
                                    name: `${pirateNames[Math.floor(Math.random() * pirateNames.length)]} ${pirateTypes[Math.floor(Math.random() * pirateTypes.length)]}`,
                                    hull: Math.round(baseHull * pirateMultiplier),
                                    damage: Math.round(baseDamage * pirateMultiplier),
                                    accuracy: 40 + tier * 5,
                                    tier: tier,
                                    icon: 'fa-pirate-ship'
                                };
                                
                                const pirateEncounter = new window.PirateEncounter(gameState.ship, pirateData, gameState);
                                pirateEncounter.start();
                            }
                        };
                    })();
                    
                    encounterManager.startEncounter('pirate');
                }, 1000);
            } else {
                // Successful rescue
                this.gameState.credits += this.reward;
                this.log(`Rescued a stranded freighter! Received ${this.reward} CR reward.`);
                
                setTimeout(() => {
                    this.end();
                    this.closeEncounterModal();
                }, 1000);
            }
        } else if (action === 'ignore') {
            this.log("You chose to ignore the distress signal.");
            
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