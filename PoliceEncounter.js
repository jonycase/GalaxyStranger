import { Encounter } from './Encounter.js';
import { CombatEncounter } from './CombatEncounter.js';

export class PoliceEncounter extends Encounter {
    constructor(player, gameState, options = {}) {
        super(player, gameState, {
            ...options,
            type: 'police',
            title: 'POLICE INSPECTION',
            iconClass: 'fa-shield-alt'
        });
        
        this.illegalGoods = gameState.cargo.filter(item => item.illegal);
        this.hasIllegalGoods = this.illegalGoods.length > 0;
        
        if (this.hasIllegalGoods) {
            // Calculate fine
            const totalIllegalValue = this.illegalGoods.reduce((sum, item) => {
                const marketItem = gameState.currentSystem.market[item.id];
                return sum + marketItem.sellPrice * item.quantity;
            }, 0);
            
            this.finePercentage = 0.25 + Math.random() * 0.25; // 25-50%
            this.fineAmount = Math.min(gameState.credits * this.finePercentage, 5000 + totalIllegalValue);
        }
    }

    renderContent(contentEl) {
        if (this.hasIllegalGoods) {
            contentEl.innerHTML = `
                <div id="illegal-goods-found" style="margin: 15px 0; color: #ff6666;">
                    <p><i class="fas fa-exclamation-triangle"></i> Illegal goods detected!</p>
                    <p id="confiscated-goods">Confiscated: ${this.illegalGoods.length} types of illegal goods</p>
                    <p id="fine-amount">Fine: ${Math.round(this.fineAmount)} CR</p>
                </div>
            `;
        } else {
            contentEl.innerHTML = `
                <div id="no-illegal-goods" style="margin: 15px 0; color: #66ff99;">
                    <p><i class="fas fa-check-circle"></i> No illegal goods found. You may proceed.</p>
                </div>
            `;
        }
    }

    renderOptions() {
        const optionsEl = document.getElementById('encounter-options');
        if (!optionsEl) return;
        
        optionsEl.innerHTML = '';
        
        // Add police action buttons
        const actions = [
            { id: 'comply', icon: 'fa-check', label: 'COMPLY', className: '', style: 'background: linear-gradient(to bottom, #3366cc, #2244aa);' },
            { id: 'attack', icon: 'fa-fist-raised', label: 'ATTACK', className: 'attack' }
        ];
        
        actions.forEach(action => {
            const button = document.createElement('button');
            button.className = `combat-btn ${action.className}`;
            if (action.style) button.style.cssText = action.style;
            button.innerHTML = `<i class="fas ${action.icon}"></i> ${action.label}`;
            button.dataset.action = action.id;
            optionsEl.appendChild(button);
        });
    }

    handleAction(action) {
        if (action === 'comply') {
            if (this.hasIllegalGoods) {
                // Apply fine and confiscate goods
                this.gameState.credits -= Math.round(this.fineAmount);
                this.gameState.cargo = this.gameState.cargo.filter(item => !item.illegal);
                this.log(`Paid ${Math.round(this.fineAmount)} CR fine and had illegal goods confiscated.`);
            } else {
                this.log("Police inspection completed. No illegal goods found.");
            }
            
            setTimeout(() => {
                this.end();
                this.closeEncounterModal();
            }, 1000);
        } 
        else if (action === 'attack') {
            // Police are very strong (tier 12)
            const policeStats = {
                name: "Galactic Patrol",
                hull: 150,
                damage: 25,
                accuracy: 80,
                tier: 12,
                icon: "fa-shield-alt"
            };
            
            // Create combat encounter with police
            const policeCombat = new CombatEncounter(
                this.gameState.ship,
                policeStats,
                this.gameState,
                {
                    type: 'police-combat',
                    title: 'POLICE COMBAT',
                    iconClass: 'fa-shield-alt'
                }
            );
            
            // Store reference to current encounter
            const originalEncounter = this;
            
            policeCombat.end = function(result) {
                // Handle police combat end
                if (this.opponentStats.hull <= 0 && this.playerStats.hull > 0) {
                    this.log("You defeated the police ship! But now you're a wanted criminal.");
                    this.gameState.ship.hull = this.playerStats.hull;
                    setTimeout(() => {
                        this.end();
                        originalEncounter.closeEncounterModal();
                    }, 2000);
                } else if (this.playerStats.hull <= 0) {
                    this.log("Your ship was destroyed by the police!");
                    setTimeout(() => {
                        this.end();
                        originalEncounter.closeEncounterModal();
                    }, 2000);
                } else {
                    this.log(`Police counterattacked! Took ${this.opponentStats.damage}% hull damage.`);
                    this.gameState.ship.hull = this.playerStats.hull;
                    setTimeout(() => {
                        this.end();
                        originalEncounter.closeEncounterModal();
                    }, 2000);
                }
                
                this.updateMainUI();
                return result;
            };
            
            // Replace current encounter with combat encounter
            this.gameState.encounterManager.currentEncounter = policeCombat;
            policeCombat.start();
        }
    }
    
    end(result = {}) {
        const encounterResult = super.end(result);
        this.updateMainUI();
        return encounterResult;
    }
}