/* --- START OF FILE DebrisEncounter.js --- */

import { Encounter } from './Encounter.js';

export class DebrisEncounter extends Encounter {
    constructor(player, gameState) {
        super(player, gameState, {
            type: 'debris',
            title: 'HAZARD ALERT',
            iconClass: 'fa-meteor'
        });

        // 1. Randomize Hazard Type
        const types = ['asteroid', 'graveyard', 'ion'];
        this.hazardType = types[Math.floor(Math.random() * types.length)];
        
        // 2. Setup Type-Specific Properties
        this.setupHazardProperties();
    }

    setupHazardProperties() {
        switch(this.hazardType) {
            case 'asteroid':
                this.title = "DENSE ASTEROID FIELD";
                this.description = "A chaotic belt of spinning rocks blocks your path.";
                this.damageType = "Hull";
                this.riskLevel = "High";
                this.lootChance = 0;
                break;
            case 'graveyard':
                this.title = "SHIP GRAVEYARD";
                this.description = "The drifting wrecks of an ancient battle cloud the sector.";
                this.damageType = "Hull";
                this.riskLevel = "Medium";
                this.lootChance = 0.6; // 60% chance to find something if scanned
                break;
            case 'ion':
                this.title = "IONIC STORM";
                this.description = "A localized cloud of high-energy particles.";
                this.damageType = "Shields/Fuel"; // Special damage type
                this.riskLevel = "Medium";
                this.lootChance = 0;
                break;
        }
        
        // Base damage potential based on game progress/random
        this.damagePotential = 15 + Math.floor(Math.random() * 20);
    }

    renderContent(contentEl) {
        if (!contentEl) return;
        
        // Icon color based on type
        const iconColor = this.hazardType === 'ion' ? '#66ccff' : '#aaa';
        
        contentEl.innerHTML = `
            <div style="text-align:center; padding:10px;">
                <i class="fas ${this.getIconForType()}" style="font-size:40px; color:${iconColor}; margin-bottom:15px; text-shadow:0 0 10px ${iconColor}"></i>
                <h3 style="margin:0; color:#fff;">${this.title}</h3>
                <p style="color:#ccc; font-size:13px; margin:10px 0;">${this.description}</p>
                
                <div style="display:flex; justify-content:space-around; background:rgba(255,255,255,0.05); padding:10px; border-radius:6px; margin-top:15px;">
                    <div>
                        <div style="font-size:10px; color:#888;">THREAT LEVEL</div>
                        <div style="color:${this.riskLevel === 'High' ? '#f66' : '#ea0'}">${this.riskLevel}</div>
                    </div>
                    <div>
                        <div style="font-size:10px; color:#888;">POTENTIAL DMG</div>
                        <div style="color:#fff;">~${this.damagePotential} ${this.damageType}</div>
                    </div>
                </div>
            </div>
        `;
    }

    getIconForType() {
        switch(this.hazardType) {
            case 'graveyard': return 'fa-rocket'; // Rocket debris
            case 'ion': return 'fa-bolt';         // Lightning
            default: return 'fa-meteor';          // Rock
        }
    }

    renderOptions(optionsEl) {
        if (!optionsEl) return;
        
        const radarLevel = this.gameState.ship.radar || 0;
        const fuel = this.gameState.fuel;
        const detourCost = 4 + Math.floor(Math.random() * 3);
        this.detourCost = detourCost; // Store for handler

        let html = ``;

        // Option 1: Navigate (Skill Check)
        html += `<button class="combat-btn attack" data-action="navigate">
            <i class="fas fa-random"></i> PILOT THROUGH (Risk)
        </button>`;

        // Option 2: Scan (Requires Radar)
        if (radarLevel > 0) {
            html += `<button class="combat-btn evade" data-action="scan">
                <i class="fas fa-satellite-dish"></i> SCAN PATH (Safe)
            </button>`;
        } else {
            // Disabled Scan button to show they need upgrade
            html += `<button class="combat-btn" disabled title="Requires Radar Upgrade">
                <i class="fas fa-satellite-dish"></i> SCAN (No Radar)
            </button>`;
        }

        // Option 3: Detour (Fuel Cost)
        const canDetour = fuel >= detourCost;
        html += `<button class="combat-btn escape" data-action="detour" ${canDetour ? '' : 'disabled'}>
            <i class="fas fa-route"></i> GO AROUND (-${detourCost} Fuel)
        </button>`;

        optionsEl.innerHTML = html;
    }

    handleAction(action) {
        switch(action) {
            case 'navigate':
                this.handleNavigate();
                break;
            case 'scan':
                this.handleScan();
                break;
            case 'detour':
                this.handleDetour();
                break;
            case 'close':
                this.end();
                break;
        }
    }

    handleNavigate() {
        // Success based on Evasion
        // Base difficulty 40, minus evasion
        const difficulty = 40;
        const roll = Math.random() * 100;
        const chance = difficulty - (this.gameState.ship.evasion * 0.5); 
        
        // If roll > chance, we succeed (higher roll is better luck)
        if (roll > chance) {
            this.log("Ace piloting! You weaved through the danger effortlessly.", '#6f9');
            this.finishEncounter(true);
        } else {
            this.applyDamage();
            this.finishEncounter(false);
        }
    }

    handleScan() {
        // Scanning is safe, but might result in loot or just a path
        this.log("Scanning field for optimal trajectory...", '#66ccff');
        
        if (this.hazardType === 'graveyard' && Math.random() < this.lootChance) {
            // Found Loot!
            this.findScrap();
        } else {
            // Just a safe path
            this.log("Path calculated. Navigation computers synchronized.", '#6f9');
            setTimeout(() => this.finishEncounter(true), 1000);
        }
    }

    handleDetour() {
        this.gameState.fuel -= this.detourCost;
        this.log(`Course corrected. Burned ${this.detourCost} fuel to bypass hazard.`, '#ea0');
        
        // Force UI update for fuel
        const fuelEl = document.getElementById('fuel');
        if (fuelEl) fuelEl.textContent = `${Math.floor(this.gameState.fuel)}/${this.gameState.maxFuel}`;
        
        setTimeout(() => this.finishEncounter(true), 1000);
    }

    applyDamage() {
        // Calculate actual damage
        const damage = Math.floor(this.damagePotential * (0.8 + Math.random() * 0.4));
        
        if (this.hazardType === 'ion') {
            // Ion damages shields first, then fuel?
            if (this.gameState.ship.shields > 0) {
                const absorb = Math.min(this.gameState.ship.shields, damage);
                this.gameState.ship.shields -= absorb;
                this.log(`Shields overloaded! Lost ${absorb}% shield integrity.`, '#f66');
            } else {
                // Drain fuel if no shields
                const fuelDrain = Math.ceil(damage / 5);
                this.gameState.fuel = Math.max(0, this.gameState.fuel - fuelDrain);
                this.log(`Systems shorted! Leaked ${fuelDrain} units of fuel.`, '#f66');
            }
        } else {
            // Physical damage
            this.gameState.ship.hull -= damage;
            this.log(`Impact detected! Hull took <strong>${damage}%</strong> damage.`, '#f66');
            
            if (this.gameState.ship.hull <= 0) {
                this.end(); // Close modal
                document.getElementById('game-over-screen').style.display = 'flex';
                return;
            }
        }
        
        // Update Stats UI (Main HUD)
        if (this.gameState.ui) this.gameState.ui.updateUI(); // Hypothetical back-reference
        const hullEl = document.getElementById('hull');
        if(hullEl) hullEl.textContent = Math.round(this.gameState.ship.hull) + "%";
    }

    findScrap() {
        // Pick a random good
        const goods = this.gameState.goods.filter(g => !g.illegal && g.basePrice > 20);
        const item = goods[Math.floor(Math.random() * goods.length)];
        
        if (item) {
            // Check capacity
            const cargoCount = this.gameState.cargo.reduce((a,b) => a + b.quantity, 0);
            if (cargoCount < this.gameState.cargoCapacity) {
                // Add item
                const existing = this.gameState.cargo.find(i => i.id === item.id);
                if (existing) existing.quantity++;
                else this.gameState.cargo.push({ ...item, quantity: 1, buyPrice: 0 });
                
                this.log(`Scanner found intact cargo container: <strong>1x ${item.name}</strong> recovered!`, '#ffd700');
            } else {
                this.log(`Scanner found ${item.name}, but cargo hold is full.`, '#aaa');
            }
        }
        
        setTimeout(() => this.finishEncounter(true), 2000);
    }

    finishEncounter(success) {
        // Update final UI state
        const contentEl = document.getElementById('encounter-content');
        if (contentEl) {
            contentEl.innerHTML = success 
                ? `<p style="color:#6f9; margin-top:20px;">"Clear skies ahead. Resuming cruise speed."</p>`
                : `<p style="color:#f66; margin-top:20px;">"Emergency seals active. We're through the worst of it."</p>`;
        }
        
        // Show leave button
        const optionsEl = document.getElementById('encounter-options');
        if (optionsEl) {
            optionsEl.innerHTML = `<button class="combat-btn escape" data-action="close">RESUME COURSE</button>`;
        }
    }
}