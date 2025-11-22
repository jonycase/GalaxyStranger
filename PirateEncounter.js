/* --- START OF FILE PirateEncounter.js --- */

import { CombatEncounter } from './CombatEncounter.js';

export class PirateEncounter extends CombatEncounter {
    constructor(player, pirate, gameState) {
        // 1. Initialize Base Combat
        super(player, pirate, gameState, {
            type: 'pirate',
            title: 'HOSTILE INTERCEPT',
            iconClass: 'fa-skull-crossbones' // Requires FontAwesome
        });
        
        this.pirate = pirate;
        
        // 2. Calculate Rewards based on Tier
        // Base bounty + random variance
        this.bounty = (this.pirate.tier * 250) + Math.floor(Math.random() * 200);
        
        // 3. Hook into the CombatEncounter's win state
        // This overrides the default "You Win" -> Close behavior
        this.options.onWin = () => this.handlePirateDefeat();
    }

    /**
     * Logic executed when the player destroys the pirate ship.
     */
    handlePirateDefeat() {
        // A. Award Credits
        this.gameState.credits += this.bounty;
        
        // B. Generate Salvage (Loot)
        const loot = this.generateLoot();
        const lootMessages = [];
        
        // C. Process Loot
        if (loot) {
            // Check Cargo Space
            const currentCargo = this.gameState.cargo.reduce((sum, item) => sum + item.quantity, 0);
            
            if (currentCargo < this.gameState.cargoCapacity) {
                // Add to inventory
                const existingItem = this.gameState.cargo.find(i => i.id === loot.id);
                if (existingItem) {
                    existingItem.quantity += 1;
                } else {
                    this.gameState.cargo.push({
                        id: loot.id,
                        name: loot.name,
                        quantity: 1,
                        buyPrice: 0, // Scavenged, no buy price
                        illegal: loot.illegal
                    });
                }
                lootMessages.push(`Salvaged 1x ${loot.name}`);
            } else {
                lootMessages.push(`Cargo full! Left 1x ${loot.name} behind.`);
            }
        }

        // D. Update Global UI (Credits & Cargo)
        // We access the DOM directly here to ensure the background UI updates while modal is open
        const creditsEl = document.getElementById('credits');
        const cargoEl = document.getElementById('cargo-space');
        if (creditsEl) creditsEl.textContent = `${Math.floor(this.gameState.credits).toLocaleString()} CR`;
        
        // Recalculate cargo for UI
        const newCargoCount = this.gameState.cargo.reduce((sum, item) => sum + item.quantity, 0);
        if (cargoEl) cargoEl.textContent = `${newCargoCount}/${this.gameState.cargoCapacity}`;

        // E. Log Results to Encounter Window
        this.log(`<strong>TARGET DESTROYED</strong>`, '#66ff99');
        this.log(`Bounty Claimed: <span style="color:#ffd700;">${this.bounty} CR</span>`);
        
        lootMessages.forEach(msg => {
            this.log(msg, '#add8e6'); // Light blue for loot
        });

        // F. Clean up
        setTimeout(() => {
            this.end({ result: 'win', bounty: this.bounty, loot: loot });
        }, 2500); // Give user time to read the log
    }

    /**
     * Pick a random item from the game's goods list to drop.
     * Higher tier pirates drop more valuable/illegal goods.
     */
    generateLoot() {
        const roll = Math.random();
        
        // 30% chance no loot
        if (roll < 0.3) return null;

        // Filter goods based on pirate tier
        // Tier 1-2: Cheap stuff (Food, Water)
        // Tier 3-5: Tech, Luxuries
        // Tier 6+: Illegal goods
        
        let pool = [];
        if (this.pirate.tier <= 2) {
            pool = this.gameState.goods.filter(g => g.basePrice < 50 && !g.illegal);
        } else if (this.pirate.tier <= 5) {
            pool = this.gameState.goods.filter(g => g.basePrice >= 50 && g.basePrice < 200 && !g.illegal);
        } else {
            // High tier pirates drop expensive or illegal stuff
            pool = this.gameState.goods.filter(g => g.basePrice >= 200 || g.illegal);
        }

        // Fallback if pool is empty
        if (pool.length === 0) pool = this.gameState.goods;

        const item = pool[Math.floor(Math.random() * pool.length)];
        return item;
    }
}