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
        
        // Store encounter manager reference
        this.encounterManager = options.encounterManager;
        
        this.illegalGoods = gameState.cargo.filter(item => {
            const good = gameState.goods.find(g => g.id === item.id);
            return good && good.illegal;
        });
        this.hasIllegalGoods = this.illegalGoods.length > 0;
        
        // Calculate total value of illegal goods
        this.totalIllegalValue = 0;
        if (this.hasIllegalGoods) {
            this.totalIllegalValue = this.illegalGoods.reduce((sum, item) => {
                const good = gameState.goods.find(g => g.id === item.id);
                return good ? sum + (good.basePrice * item.quantity) : sum;
            }, 0);
            
            this.finePercentage = 0.25 + Math.random() * 0.25; // 25-50%
            this.fineAmount = Math.min(
                gameState.credits * this.finePercentage, 
                5000 + this.totalIllegalValue
            );
        }
        
        // Determine police tier based on system tech, security, and player bounty
        this.policeTier = this.calculatePoliceTier();
        
        // Calculate bribe cost (3x-5x illegal goods value)
        this.bribeCost = Math.round(
            this.totalIllegalValue * (3 + Math.random() * 2)
        );
        
        // Calculate escape chance (base 10% + 5% per engine upgrade)
        this.baseEscapeChance = 10;
        this.escapeChance = this.baseEscapeChance + 
            (this.player.evasion - 15); // 15 is base evasion
    }
    
    calculatePoliceTier() {
        const techLevels = ['none', 'low', 'medium', 'high'];
        const securityLevels = ['none', 'low', 'medium', 'high'];
        
        // Map levels to values (0-3)
        const techValue = techLevels.indexOf(this.gameState.currentSystem.techLevel);
        const securityValue = securityLevels.indexOf(this.gameState.currentSystem.security);
        
        // Calculate base tier (1-10 scale)
        let tier = Math.floor((techValue + securityValue) * 1.25) + 3;
        
        // Add bounty multiplier (1 tier per 2000 CR bounty)
        const bountyTier = Math.min(5, Math.floor((this.gameState.bounty || 0) / 2000));
        tier += bountyTier;
        
        // Add some random variation (-1 to +2)
        tier += Math.floor(Math.random() * 3) - 1;
        
        // Clamp between 1 and 10
        return Math.max(1, Math.min(10, tier));
    }

    renderContent(contentEl) {
        if (this.hasIllegalGoods) {
            let bountyInfo = '';
            if (this.gameState.bounty) {
                bountyInfo = `<p>Your current bounty: ${this.gameState.bounty.toLocaleString()} CR</p>`;
            }
            
            contentEl.innerHTML = `
                <div id="illegal-goods-found" style="margin: 15px 0; color: #ff6666;">
                    <p><i class="fas fa-exclamation-triangle"></i> Illegal goods detected!</p>
                    <p>Total illegal goods value: ${Math.round(this.totalIllegalValue)} CR</p>
                    <p id="fine-amount">Fine: ${Math.round(this.fineAmount)} CR</p>
                    <p id="police-tier">Police Tier: ${this.policeTier} 
                        (Higher tiers indicate better-equipped police)</p>
                    <p>Escape chance: ${this.escapeChance}% 
                        (increases with Quantum Engine upgrades)</p>
                    <p>Bribe cost: ${this.bribeCost.toLocaleString()} CR 
                        (3-5x illegal goods value)</p>
                    ${bountyInfo}
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
        const actions = [];

        if (this.hasIllegalGoods) {
            actions.push(
                { id: 'comply', icon: 'fa-check', label: 'COMPLY', className: '', 
                  style: 'background: linear-gradient(to bottom, #3366cc, #2244aa);' }
            );
            
            // Add bribe option if player can afford it
            if (this.gameState.credits >= this.bribeCost) {
                actions.push(
                    { id: 'bribe', icon: 'fa-money-bill-wave', label: `BRIBE (${this.bribeCost.toLocaleString()} CR)`, 
                      className: 'bribe', style: 'background: linear-gradient(to bottom, #33cc33, #22aa22);' }
                );
            }
            
            // Always show escape and attack options
            actions.push(
                { id: 'escape', icon: 'fa-running', label: 'ESCAPE', className: 'escape',
                  style: 'background: linear-gradient(to bottom, #cccc00, #aaaa00);' },
                { id: 'attack', icon: 'fa-fist-raised', label: 'ATTACK', className: 'attack' }
            );
        } else {
            actions.push(
                { id: 'continue', icon: 'fa-chevron-right', label: 'CONTINUE', className: '', 
                  style: 'background: linear-gradient(to bottom, #3366cc, #2244aa);' }
            );
        }

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
        switch (action) {
            case 'comply':
                this.handleComply();
                break;
            case 'bribe':
                this.handleBribe();
                break;
            case 'escape':
                this.handleEscape();
                break;
            case 'attack':
                this.handleAttack();
                break;
            case 'continue':
                this.end();
                this.closeEncounterModal();
                break;
        }
    }

    handleComply() {
        if (!this.hasIllegalGoods) {
            this.log('You comply with the police inspection. Nothing is found, and you are free to go.');
            setTimeout(() => this.end(), 2000);
            return;
        }

        if (this.gameState.credits >= this.fineAmount) {
            this.gameState.credits -= Math.round(this.fineAmount);
            this.gameState.cargo = this.gameState.cargo.filter(item => {
                const good = this.gameState.goods.find(g => g.id === item.id);
                return good && !good.illegal;
            });
            this.log(`You paid the fine of ${Math.round(this.fineAmount)} CR. Your illegal cargo has been confiscated.`);
            setTimeout(() => {
                this.end();
                this.closeEncounterModal();
            }, 2000);
        } else {
            this.log("You can't pay the fine! The police ships have opened fire!");
            setTimeout(() => this.handleAttack(), 2000);
        }
    }
    
    handleBribe() {
        // Deduct bribe cost immediately
        this.gameState.credits -= this.bribeCost;
        this.log(`You attempt to bribe the police with ${this.bribeCost.toLocaleString()} CR...`);
        
        // 50% chance of success
        if (Math.random() < 0.5) {
            this.log("The bribe worked! The police look the other way.");
            setTimeout(() => {
                this.end();
                this.closeEncounterModal();
            }, 2000);
        } else {
            this.log("The bribe failed! The police are attacking!");
            setTimeout(() => this.handleAttack(), 2000);
        }
    }
    
    handleEscape() {
        this.log(`Attempting to escape (${this.escapeChance}% chance)...`);
        
        if (Math.random() * 100 < this.escapeChance) {
            this.log("Escape successful! You evade the police.");
            setTimeout(() => {
                this.end();
                this.closeEncounterModal();
            }, 2000);
        } else {
            this.log("Escape failed! The police are attacking!");
            setTimeout(() => this.handleAttack(), 2000);
        }
    }
    
    handleAttack() {
        this.log('You decide to fight the police! Get ready for combat.');
        
        // Calculate police ship stats based on tier
        const baseHull = 70 + this.policeTier * 5;
        const baseDamage = 8 + this.policeTier * 2;
        const baseEvasion = 15 + this.policeTier * 1.5;
        const baseShields = 15 + this.policeTier * 2;
        const baseAccuracy = 60 + this.policeTier * 3;
        
        // Apply police equipment bonus (better than pirates)
        const policeMultiplier = 1.25 + (0.08 * (this.policeTier - 1));
        
        const policeShip = {
            name: `Police Patrol (T${this.policeTier})`,
            hull: Math.round(baseHull * policeMultiplier),
            damage: Math.round(baseDamage * policeMultiplier),
            evasion: Math.round(baseEvasion * policeMultiplier),
            shields: Math.round(baseShields * policeMultiplier),
            accuracy: Math.round(baseAccuracy * policeMultiplier),
            icon: 'fa-shield-alt'
        };
        
        const policeCombat = new CombatEncounter(
            this.player,
            policeShip,
            this.gameState,
            {
                type: 'police-combat',
                title: 'POLICE COMBAT',
                iconClass: 'fa-shield-alt',
                onWin: (result) => {
                    policeCombat.log("You defeated the police ship! But now you're a wanted criminal.");
                    this.gameState.ship.hull = policeCombat.playerStats.hull;
                    this.gameState.ship.shields = policeCombat.playerStats.shields;
                    
                    // Add bounty for attacking police (scales with tier)
                    this.gameState.bounty = this.gameState.bounty || 0;
                    const bountyIncrease = 1000 * this.policeTier;
                    this.gameState.bounty += bountyIncrease;
                    policeCombat.log(`+${bountyIncrease.toLocaleString()} CR bounty added! Total bounty: ${this.gameState.bounty.toLocaleString()} CR`);
                    
                    setTimeout(() => {
                        policeCombat.end();
                        policeCombat.closeEncounterModal();
                    }, 3000);
                },
                onLose: (result) => {
                    policeCombat.log("Your ship was destroyed by the police!");
                    setTimeout(() => {
                        policeCombat.end();
                        policeCombat.closeEncounterModal();
                    }, 3000);
                }
            }
        );

        // Replace current encounter with combat encounter
        this.encounterManager.currentEncounter = policeCombat;
        policeCombat.start();
    }
    
    end(result = {}) {
        const encounterResult = super.end(result);
        this.updateMainUI();
        return encounterResult;
    }

    closeEncounterModal() {
        const modal = document.getElementById('encounter-modal');
        if (modal) {
            modal.style.opacity = '0';
            modal.style.pointerEvents = 'none';
        }
    }
}