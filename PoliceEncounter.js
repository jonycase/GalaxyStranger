/* --- START OF FILE PoliceEncounter.js --- */

import { Encounter } from './Encounter.js';
import { CombatEncounter } from './CombatEncounter.js';

export class PoliceEncounter extends Encounter {
    constructor(player, gameState, options = {}) {
        // 1. Init as Text Encounter
        super(player, gameState, {
            ...options,
            type: 'police',
            title: 'SECURITY INTERDICTION',
            iconClass: 'fa-shield-alt'
        });
        
        // Critical: Store manager ref to swap state if combat starts
        this.encounterManager = options.encounterManager;
        
        // 2. Scan Logic
        const securityLevel = this.gameState.currentSystem.security || 'medium';
        
        this.illegalItems = this.gameState.cargo.filter(item => item.illegal);
        this.hasContraband = this.illegalItems.length > 0;
        
        // 3. Calculate Fine & Bribe based on Security
        // Fines are higher in high-security systems
        const fineMultiplier = securityLevel === 'high' ? 300 : (securityLevel === 'medium' ? 200 : 100);
        
        // Calculate total market value of illegal goods approx
        this.fineAmount = this.illegalItems.reduce((sum, item) => sum + (item.quantity * fineMultiplier), 0);
        
        // Bribes are cheaper than fines (incentive) but risky
        // In 'none' (anarchy), bribes are basically "protection money" and very cheap
        this.bribeAmount = Math.max(100, Math.floor(this.fineAmount * 0.4));
    }

    renderContent(contentEl) {
        if (!contentEl) return;

        const secLevel = this.gameState.currentSystem.security.toUpperCase();
        
        let html = `
            <div style="border-bottom:1px solid #333; padding-bottom:10px; margin-bottom:10px;">
                <div style="font-size:10px; color:#888; letter-spacing:1px;">JURISDICTION: ${secLevel} SECURITY</div>
                <div style="font-size:14px; color:#fff;">"Vessel identified. Commencing cargo manifest scan."</div>
            </div>
        `;

        if (this.hasContraband) {
            html += `
                <div style="background:rgba(220, 50, 50, 0.15); border-left:3px solid #f66; padding:10px; text-align:left;">
                    <div style="color:#f66; font-weight:bold; font-size:12px; margin-bottom:5px;">
                        <i class="fas fa-siren-on"></i> VIOLATION DETECTED
                    </div>
                    <ul style="margin:0; padding-left:20px; font-size:12px; color:#ddd;">
                        ${this.illegalItems.map(i => `<li>${i.name} (Qty: ${i.quantity})</li>`).join('')}
                    </ul>
                    <div style="margin-top:10px; font-size:12px; border-top:1px solid rgba(255,255,255,0.1); padding-top:5px;">
                        <span style="color:#aaa;">Assessment:</span> <span style="color:#fff;">${this.fineAmount} CR</span>
                    </div>
                </div>
                <p style="font-size:12px; color:#ccc; margin-top:15px; font-style:italic;">
                    "Pay the fine and surrender the contraband immediately, or face lethal force."
                </p>
            `;
        } else {
            html += `
                <div style="background:rgba(50, 200, 100, 0.1); border-left:3px solid #6f9; padding:10px; text-align:left;">
                    <div style="color:#6f9; font-weight:bold; font-size:12px;">
                        <i class="fas fa-check"></i> SCAN CLEAR
                    </div>
                    <div style="font-size:12px; color:#ddd; margin-top:5px;">
                        No protocols violated. 
                    </div>
                </div>
            `;
        }

        contentEl.innerHTML = html;
    }

    renderOptions(optionsEl) {
        if (!optionsEl) return;

        if (!this.hasContraband) {
            optionsEl.innerHTML = `
                <button class="combat-btn escape" data-action="close">
                    <i class="fas fa-chevron-right"></i> PROCEED
                </button>
            `;
        } else {
            const canPay = this.gameState.credits >= this.fineAmount;
            const canBribe = this.gameState.credits >= this.bribeAmount;

            optionsEl.innerHTML = `
                <button class="combat-btn evade" data-action="pay" ${canPay ? '' : 'disabled'}>
                    PAY FINE (-${this.fineAmount})
                </button>
                <button class="combat-btn" data-action="bribe" ${canBribe ? '' : 'disabled'}>
                    BRIBE (-${this.bribeAmount})
                </button>
                <button class="combat-btn attack" data-action="fight">
                    <i class="fas fa-crosshairs"></i> RESIST
                </button>
            `;
        }
    }

    handleAction(action) {
        switch(action) {
            case 'close':
                this.end();
                break;
            case 'pay':
                this.resolveFine();
                break;
            case 'bribe':
                this.resolveBribe();
                break;
            case 'fight':
                this.startCombat();
                break;
            default:
                // Fallback for unhandled actions
                this.log(`Command invalid: ${action}`, '#f66');
                break;
        }
    }

    resolveFine() {
        // Transaction
        this.gameState.credits -= this.fineAmount;
        
        // Confiscation logic
        this.gameState.cargo = this.gameState.cargo.filter(i => !i.illegal);

        this.log(`Fine paid. Illegal cargo confiscated.`, '#ffcc00');
        
        // Update UI Text
        const contentEl = document.getElementById('encounter-content');
        if(contentEl) contentEl.innerHTML = `<p style="color:#aaa; padding:20px;">"Scan logged. Transaction complete. You are free to navigate."</p>`;
        
        // Update Buttons
        const optionsEl = document.getElementById('encounter-options');
        if(optionsEl) optionsEl.innerHTML = `<button class="combat-btn escape" data-action="close">DEPART</button>`;

        // Force Global UI Update
        if(this.ui) this.ui.updateUI(); // Fallback if direct DOM manip fails
        const credEl = document.getElementById('credits');
        if(credEl) credEl.textContent = `${this.gameState.credits.toLocaleString()} CR`;
    }

    resolveBribe() {
        this.gameState.credits -= this.bribeAmount;
        
        // Success Chance Calculation
        const sec = this.gameState.currentSystem.security;
        let chance = 0.5; // Medium
        
        if (sec === 'high') chance = 0.15; // Very hard to bribe high sec
        else if (sec === 'low') chance = 0.70; // Easy
        else if (sec === 'none') chance = 0.95; // Anarchy

        const roll = Math.random();

        if (roll < chance) {
            // SUCCESS
            this.log(`Bribe accepted.`, '#6f9');
            
            const contentEl = document.getElementById('encounter-content');
            if(contentEl) contentEl.innerHTML = `<p style="color:#6f9; padding:20px;">"Sensor malfunction detected... data corrupted. Get out of here."</p>`;
            
            const optionsEl = document.getElementById('encounter-options');
            if(optionsEl) optionsEl.innerHTML = `<button class="combat-btn escape" data-action="close">LEAVE QUICKLY</button>`;
            
            // Update Credits UI
            const credEl = document.getElementById('credits');
            if(credEl) credEl.textContent = `${this.gameState.credits.toLocaleString()} CR`;

        } else {
            // FAILURE
            this.log(`Bribe REJECTED! Officer reports attempted corruption!`, '#f00');
            setTimeout(() => this.startCombat(), 1000);
        }
    }

    startCombat() {
        this.log("Weapons Hot! Engaging System Authority!", '#f66');
        
        // 1. Generate Police Ship Stats
        // Stronger than pirates, high accuracy
        const policeShip = {
            name: "Authority Patrol",
            tier: 5,
            hull: 120,
            maxHull: 120,
            damage: 12,
            accuracy: 80, // Police don't miss often
            icon: "fa-shield-alt"
        };

        // 2. Create Combat Instance
        const combat = new CombatEncounter(this.player, policeShip, this.gameState, {
            type: 'police-combat',
            title: 'WANTED STATUS: ACTIVE',
            iconClass: 'fa-siren-on',
            onWin: () => {
                this.log(`Authority vessel destroyed.`, '#6f9');
                this.log(`Warning: Criminal record updated.`, '#f66');
                setTimeout(() => combat.end({ result: 'win' }), 2000);
            }
        });

        // 3. CRITICAL: Swap the Manager's current encounter reference
        // This ensures the NEXT button click goes to 'combat', not 'police'
        if (this.encounterManager) {
            this.encounterManager.currentEncounter = combat;
        } else {
            console.error("PoliceEncounter missing manager reference! Combat transition failed.");
            return;
        }

        // 4. Initialize Combat UI (Takes over the modal)
        combat.start();
        
        // 5. Preserve context in log
        combat.log("Engaging hostilities with local law enforcement.", '#f66');
    }
}