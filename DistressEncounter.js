/* --- START OF FILE DistressEncounter.js --- */

import { Encounter } from './Encounter.js';
import { CombatEncounter } from './CombatEncounter.js';

/**
 * A complex, multi-stage encounter handling distress signals, 
 * derelict exploration, and potential pirate ambushes.
 */
export class DistressEncounter extends Encounter {
    constructor(player, gameState, options = {}) {
        super(player, gameState, {
            ...options,
            type: 'distress',
            title: 'DISTRESS BEACON DETECTED',
            iconClass: 'fa-satellite-dish'
        });

        this.encounterManager = options.encounterManager;
        this.phase = 'SIGNAL'; // SIGNAL, APPROACH, ACTION, RESULTS
        this.scanResults = null;
        this.actionLog = [];
        
        // --- 1. Generate Scenario ---
        this.scenario = this.generateScenario();
        
        // --- 2. Initialize State ---
        this.distance = 2000; // Abstract distance units
        this.isTrap = this.scenario.type === 'AMBUSH';
        this.hasScanned = false;
        this.salvageActions = 3; // For derelicts
    }

    /**
     * Procedurally generates one of several distress scenarios.
     */
    generateScenario() {
        const scenarios = [
            {
                id: 'fuel_leak',
                type: 'ASSIST',
                name: "Stranded Freighter",
                icon: "fa-gas-pump",
                desc: "A Class-C hauler drifting without power. Life support is failing.",
                reqItem: 'fuel',
                reqQty: 2, // Fuel units (abstracted, usually player has 15 max, so this is fuel tank items)
                reqItemName: "Hyperfuel", // The trade good, not the ship stat
                rewardCR: 1200,
                difficulty: 30
            },
            {
                id: 'plague',
                type: 'ASSIST',
                name: "Quarantine Transport",
                icon: "fa-biohazard",
                desc: "Passengers are infected with Andromedan Flu. They need medical supplies immediately.",
                reqItem: 'medicine',
                reqQty: 1,
                reqItemName: "Medi-Gel",
                rewardCR: 2500,
                difficulty: 60
            },
            {
                id: 'reactor',
                type: 'HAZARD',
                name: "Critical Reactor Failure",
                icon: "fa-radiation",
                desc: "Core breach imminent. They need tech parts to stabilize the containment field.",
                reqItem: 'tech',
                reqQty: 1,
                reqItemName: "Tech Parts",
                rewardCR: 3000,
                difficulty: 80 // High damage risk
            },
            {
                id: 'ambush_stealth',
                type: 'AMBUSH',
                name: "Civilian Liner (Fake)",
                icon: "fa-user-friends",
                desc: "Standard distress hail. Something feels off about the signal frequency.",
                difficulty: 50 // Detection difficulty
            },
            {
                id: 'derelict',
                type: 'SALVAGE',
                name: "Ancient Derelict",
                icon: "fa-dungeon",
                desc: "No life signs. The hull configuration matches pre-war designs. Potentially valuable salvage.",
                difficulty: 40 // Salvage risk
            }
        ];

        // Weighted random selection
        // 20% Ambush, 20% Derelict, 60% Assist
        const rand = Math.random();
        if (rand < 0.2) return scenarios.find(s => s.type === 'AMBUSH');
        if (rand < 0.4) return scenarios.find(s => s.type === 'SALVAGE');
        
        // Pick random assist/hazard
        const assists = scenarios.filter(s => s.type === 'ASSIST' || s.type === 'HAZARD');
        return assists[Math.floor(Math.random() * assists.length)];
    }

    /* ==========================================================================
       RENDER LOGIC
       Handles the HTML generation for different phases of the encounter.
    ========================================================================== */

    renderContent(contentEl) {
        if (!contentEl) return;
        
        let html = '';

        // --- HEADER ---
        html += `
            <div style="display:flex; align-items:center; justify-content:center; gap:10px; margin-bottom:15px; color:#aaa;">
                <i class="fas ${this.scenario.icon}" style="font-size:24px; color:${this.getScenarioColor()}"></i>
                <h3 style="margin:0; font-size:18px; color:#fff;">${this.scenario.name}</h3>
            </div>
        `;

        // --- BODY CONTENT BASED ON PHASE ---
        switch (this.phase) {
            case 'SIGNAL':
                html += `
                    <p style="font-style:italic; color:#ccc;">"${this.scenario.desc}"</p>
                    <div style="background:rgba(0,0,0,0.3); padding:10px; margin-top:15px; border-radius:4px;">
                        <div style="font-size:12px; color:#888;">SIGNAL STRENGTH</div>
                        <div style="height:4px; width:100%; background:#333; margin-top:5px;">
                            <div style="height:100%; width:40%; background:${this.getScenarioColor()}; animation:pulse 2s infinite;"></div>
                        </div>
                    </div>
                `;
                break;

            case 'APPROACH':
                html += `
                    <p>Closing distance to target...</p>
                    ${this.scanResults ? this.renderScanResults() : '<p style="color:#888; font-size:12px;">Sensors active. Ready to scan.</p>'}
                `;
                break;

            case 'ACTION':
                html += this.renderActionPhase();
                break;

            case 'RESULTS':
                html += `
                    <div style="text-align:center;">
                        <div style="font-size:40px; margin-bottom:10px;">
                            ${this.success ? '<i class="fas fa-check-circle" style="color:#6f9;"></i>' : '<i class="fas fa-exclamation-triangle" style="color:#f66;"></i>'}
                        </div>
                        <p>${this.resultMessage}</p>
                        ${this.renderRewards()}
                    </div>
                `;
                break;
        }

        // --- ACTION LOG ---
        if (this.actionLog.length > 0 && this.phase !== 'RESULTS') {
            html += `
                <div style="margin-top:15px; border-top:1px solid #333; padding-top:10px; font-size:12px; color:#aaa; text-align:left; max-height:60px; overflow-y:auto;">
                    ${this.actionLog.map(log => `<div>> ${log}</div>`).join('')}
                </div>
            `;
        }

        contentEl.innerHTML = html;
    }

    getScenarioColor() {
        if (this.scenario.type === 'AMBUSH') return '#f66';
        if (this.scenario.type === 'HAZARD') return '#ea0';
        if (this.scenario.type === 'SALVAGE') return '#c0c';
        return '#6f9';
    }

    renderScanResults() {
        let color = '#6f9';
        let text = "Life signs detected. Configuration matches civilian transport.";
        
        if (this.scenario.type === 'AMBUSH') {
            color = '#f66';
            text = "WARNING: Energy signatures detected! Weapons systems charging!";
        } else if (this.scenario.type === 'SALVAGE') {
            color = '#c0c';
            text = "No life signs. Structural integrity compromised. Valuables detected.";
        } else if (this.scenario.type === 'HAZARD') {
            color = '#ea0';
            text = "CAUTION: Unstable energy readings. Approach with extreme care.";
        }

        return `
            <div style="background:rgba(0,0,0,0.4); border-left:3px solid ${color}; padding:10px; margin:10px 0; text-align:left;">
                <strong style="color:${color}; font-size:12px;">SENSOR ANALYSIS</strong>
                <p style="margin:5px 0 0 0; font-size:12px;">${text}</p>
            </div>
        `;
    }

    renderActionPhase() {
        if (this.scenario.type === 'SALVAGE') {
            return `
                <p>You have boarded the derelict.</p>
                <div style="display:flex; justify-content:space-between; margin:10px 0;">
                    <span>Integrity: <span style="color:#f66;">Unstable</span></span>
                    <span>Actions Left: <span style="color:#6f9;">${this.salvageActions}</span></span>
                </div>
                <p style="font-size:12px; color:#aaa;">Search compartments for loot. Beware of collapsing bulkheads.</p>
            `;
        } 
        
        // Assist Missions
        const hasItem = this.checkPlayerHasItem(this.scenario.reqItem);
        const itemStatus = hasItem 
            ? `<span style="color:#6f9;">AVAILABLE (x${this.getItemCount(this.scenario.reqItem)})</span>`
            : `<span style="color:#f66;">MISSING</span>`;

        return `
            <div style="text-align:left; background:rgba(255,255,255,0.05); padding:15px; border-radius:6px;">
                <div style="margin-bottom:10px;"><strong>REQUIRED:</strong> ${this.scenario.reqItemName}</div>
                <div style="font-size:12px; margin-bottom:15px;">Status: ${itemStatus}</div>
                <div style="font-size:12px; color:#aaa; font-style:italic;">
                    Alternative: Attempt engineering bypass (Risk of hull damage).
                </div>
            </div>
        `;
    }

    renderRewards() {
        if (!this.rewards || this.rewards.length === 0) return '';
        return `
            <div style="margin-top:15px; background:rgba(100,255,100,0.1); padding:10px; border-radius:4px;">
                <div style="font-size:11px; color:#8f8; font-weight:bold;">REWARDS</div>
                ${this.rewards.map(r => `<div style="color:#fff;">${r}</div>`).join('')}
            </div>
        `;
    }

    /* ==========================================================================
       OPTIONS & BUTTONS
    ========================================================================== */

    renderOptions(optionsEl) {
        if (!optionsEl) return;
        let html = '';

        switch (this.phase) {
            case 'SIGNAL':
                html += `
                    <button class="combat-btn attack" data-action="approach"><i class="fas fa-arrow-right"></i> APPROACH</button>
                    <button class="combat-btn escape" data-action="close"><i class="fas fa-times"></i> IGNORE</button>
                `;
                break;

            case 'APPROACH':
                const radar = this.gameState.ship.radar || 0;
                // If ambush and no scan, investigate triggers trap
                // Scan helps identify before committing
                html += `
                    <button class="combat-btn evade" data-action="scan" ${this.hasScanned ? 'disabled' : ''}>
                        <i class="fas fa-satellite-dish"></i> SCAN (Lvl ${radar})
                    </button>
                    <button class="combat-btn attack" data-action="engage">
                        <i class="fas fa-hand-paper"></i> ${this.scenario.type === 'SALVAGE' ? 'BOARD SHIP' : 'OPEN COMMS'}
                    </button>
                    <button class="combat-btn escape" data-action="close">LEAVE</button>
                `;
                break;

            case 'ACTION':
                if (this.scenario.type === 'SALVAGE') {
                    html += `
                        <button class="combat-btn attack" data-action="loot_cargo">SEARCH CARGO</button>
                        <button class="combat-btn attack" data-action="loot_bridge">SEARCH BRIDGE</button>
                        <button class="combat-btn escape" data-action="finish_salvage">EXIT</button>
                    `;
                } else {
                    // Assist Scenarios
                    const hasItem = this.checkPlayerHasItem(this.scenario.reqItem);
                    html += `
                        <button class="combat-btn evade" data-action="solve_item" ${hasItem ? '' : 'disabled'}>
                            <i class="fas fa-box"></i> USE ${this.scenario.reqItemName.toUpperCase()}
                        </button>
                        <button class="combat-btn attack" data-action="solve_skill">
                            <i class="fas fa-tools"></i> JURY RIG (Risk)
                        </button>
                        <button class="combat-btn escape" data-action="close">ABORT</button>
                    `;
                }
                break;

            case 'RESULTS':
                html += `<button class="combat-btn escape" data-action="close">DEPART</button>`;
                break;
        }

        optionsEl.innerHTML = html;
    }

    /* ==========================================================================
       ACTION HANDLING
    ========================================================================== */

    handleAction(action) {
        switch (action) {
            case 'close':
                this.end();
                break;
            case 'approach':
                this.phase = 'APPROACH';
                this.updateUI();
                break;
            case 'scan':
                this.performScan();
                break;
            case 'engage':
                this.performEngage();
                break;
            case 'solve_item':
                this.solveWithItem();
                break;
            case 'solve_skill':
                this.solveWithSkill();
                break;
            
            // Salvage Actions
            case 'loot_cargo':
                this.performSalvage('cargo');
                break;
            case 'loot_bridge':
                this.performSalvage('bridge');
                break;
            case 'finish_salvage':
                this.finishSalvage();
                break;
        }
    }

    updateUI() {
        this.renderContent(document.getElementById('encounter-content'));
        this.renderOptions(document.getElementById('encounter-options'));
    }

    performScan() {
        const radar = this.gameState.ship.radar || 0;
        const detectionChance = 30 + (radar * 20); // Base 30% + 20% per level
        
        this.hasScanned = true;

        if (this.scenario.type === 'AMBUSH') {
            if (Math.random() * 100 < detectionChance) {
                this.scanResults = true;
                this.actionLog.push("Scan successful! Ambush detected.");
            } else {
                this.actionLog.push("Scan inconclusive. Readings unclear.");
            }
        } else {
            this.scanResults = true; // Always scan successful for non-ambush
            this.actionLog.push("Scan complete. Ship manifest analyzed.");
        }
        
        this.updateUI();
    }

    performEngage() {
        // AMBUSH CHECK
        if (this.scenario.type === 'AMBUSH') {
            this.triggerAmbush();
            return;
        }

        // Proceed to Action Phase
        this.phase = 'ACTION';
        this.updateUI();
    }

    triggerAmbush() {
        this.log("IT'S A TRAP! Pirates decloaking!", '#f66');
        
        // Generate Pirate
        const tier = Math.ceil(this.gameState.systemsVisited / 20) + 1;
        const pirateData = {
            name: "Ambush Raider",
            tier: tier,
            hull: 80 + (tier * 10),
            maxHull: 80 + (tier * 10),
            damage: 6 + tier,
            accuracy: 60,
            icon: 'fa-skull'
        };

        // Swap to Combat
        if (this.encounterManager) {
            const combat = new CombatEncounter(this.player, pirateData, this.gameState, {
                type: 'pirate',
                title: 'AMBUSH!',
                iconClass: 'fa-skull'
            });
            // Hook win to loot
            combat.options.onWin = () => {
                this.gameState.credits += 500 * tier;
                combat.end({ result: 'win' });
            };
            
            this.encounterManager.currentEncounter = combat;
            combat.start();
        }
    }

    /* ==========================================================================
       SOLUTION LOGIC
    ========================================================================== */

    solveWithItem() {
        // Consume Item
        const itemIdx = this.gameState.cargo.findIndex(i => i.id === this.scenario.reqItem);
        if (itemIdx > -1) {
            this.gameState.cargo[itemIdx].quantity -= 1;
            if (this.gameState.cargo[itemIdx].quantity <= 0) {
                this.gameState.cargo.splice(itemIdx, 1);
            }
        }

        // Success
        this.success = true;
        this.resultMessage = "Supplies delivered successfully. The crew sends their gratitude.";
        this.rewards = [`+${this.scenario.rewardCR} Credits`];
        this.gameState.credits += this.scenario.rewardCR;
        
        this.phase = 'RESULTS';
        this.updateUI();
    }

    solveWithSkill() {
        // RNG Calculation based on ship health (Engineering capacity abstraction)
        const engineeringSkill = this.gameState.ship.hull / 2; // Max 50
        const difficulty = this.scenario.difficulty;
        const roll = Math.random() * 100;
        
        if (roll + engineeringSkill > difficulty) {
            this.success = true;
            this.resultMessage = "Miraculously, you bypassed the damaged systems. Ship stabilized.";
            this.rewards = [`+${this.scenario.rewardCR} Credits`];
            this.gameState.credits += this.scenario.rewardCR;
        } else {
            this.success = false;
            const dmg = 10 + Math.floor(Math.random() * 15);
            this.gameState.ship.hull -= dmg;
            this.resultMessage = `Critical failure during repairs! Explosion caused ${dmg}% hull damage.`;
            this.rewards = ["Reputation Lost"];
            
            // Check Death
            if (this.gameState.ship.hull <= 0) {
                this.end();
                document.getElementById('game-over-screen').style.display = 'flex';
                return;
            }
        }

        this.phase = 'RESULTS';
        this.updateUI();
    }

    /* ==========================================================================
       SALVAGE MINI-GAME
    ========================================================================== */

    performSalvage(area) {
        if (this.salvageActions <= 0) return;
        this.salvageActions--;

        const roll = Math.random();
        let msg = "";
        
        if (roll < 0.4) {
            msg = "Found nothing but dust and debris.";
        } else if (roll < 0.7) {
            // Find small loot (Credit chip)
            const creds = 50 + Math.floor(Math.random() * 200);
            this.gameState.credits += creds;
            msg = `Recovered data pad with ${creds} CR access codes.`;
            this.actionLog.push(`+ ${creds} CR`);
        } else if (roll < 0.9) {
            // Find Item
            const goods = this.gameState.goods.filter(g => !g.illegal);
            const item = goods[Math.floor(Math.random() * goods.length)];
            this.addItemToCargo(item);
            msg = `Salvaged 1x ${item.name} from containment.`;
        } else {
            // Trap/Hazard
            const dmg = 5 + Math.floor(Math.random() * 10);
            this.gameState.ship.hull -= dmg;
            msg = `WARNING: Structural collapse! Took ${dmg}% damage.`;
            
            if (this.gameState.ship.hull <= 0) {
                this.end();
                document.getElementById('game-over-screen').style.display = 'flex';
                return;
            }
        }

        this.actionLog.push(msg);
        this.updateUI();

        if (this.salvageActions === 0) {
            setTimeout(() => this.finishSalvage(), 1500);
        }
    }

    finishSalvage() {
        this.success = true;
        this.resultMessage = "Salvage operations complete. Departing derelict.";
        this.rewards = ["Salvage retained in cargo"];
        this.phase = 'RESULTS';
        this.updateUI();
    }

    /* ==========================================================================
       HELPERS
    ========================================================================== */

    checkPlayerHasItem(id) {
        return this.gameState.cargo.some(i => i.id === id);
    }

    getItemCount(id) {
        const item = this.gameState.cargo.find(i => i.id === id);
        return item ? item.quantity : 0;
    }

    addItemToCargo(good) {
        const existing = this.gameState.cargo.find(i => i.id === good.id);
        if (existing) {
            existing.quantity++;
        } else {
            this.gameState.cargo.push({
                id: good.id,
                name: good.name,
                quantity: 1,
                buyPrice: 0,
                illegal: good.illegal
            });
        }
    }
}