/* --- START OF FILE CombatEncounter.js --- */

import { Encounter } from './Encounter.js';

export class CombatEncounter extends Encounter {
    constructor(player, opponent, gameState, options = {}) {
        super(player, gameState, {
            ...options,
            type: options.type || 'combat',
            title: options.title || 'COMBAT ALERT',
            iconClass: options.iconClass || 'fa-crosshairs'
        });
        
        this.opponent = opponent;
        
        // Snapshot player stats so we don't mutate global state until end
        // (Except hull/shields which act as health)
        this.playerStats = {
            hull: player.hull,
            maxHull: player.maxHull,
            shields: player.shields,
            damage: player.damage,
            evasion: player.evasion
        };

        // Normalize opponent stats
        this.opponentStats = {
            hull: opponent.hull,
            maxHull: opponent.maxHull || opponent.hull,
            damage: opponent.damage || 5,
            accuracy: opponent.accuracy || 60
        };

        this.turnLocked = false;
    }

    renderContent(contentEl) {
        if (!contentEl) return;

        // Using flexbox for side-by-side view
        contentEl.innerHTML = `
            <div style="display: flex; gap: 15px; align-items: stretch; margin-bottom: 15px;">
                <!-- PLAYER CARD -->
                <div style="flex:1; background:rgba(0,0,0,0.3); padding:10px; border-left:3px solid #66ccff; text-align:left;">
                    <div style="color:#66ccff; font-weight:bold; font-size:12px;">COMMANDER</div>
                    
                    <div style="margin-top:5px; font-size:11px;">HULL</div>
                    <div style="background:#222; height:6px; width:100%; margin-bottom:2px;">
                        <div id="p-hull-bar" style="background:#66ccff; height:100%; width:${(this.playerStats.hull/this.playerStats.maxHull)*100}%"></div>
                    </div>
                    <div id="p-hull-text" style="text-align:right; font-size:10px;">${Math.round(this.playerStats.hull)}/${this.playerStats.maxHull}</div>

                    <div style="margin-top:5px; font-size:11px;">SHIELDS: <span id="p-shields-text" style="color:#fff;">${this.playerStats.shields}</span></div>
                </div>

                <!-- VS ICON -->
                <div style="display:flex; align-items:center; justify-content:center; color:#555; font-weight:900; font-size:18px;">VS</div>

                <!-- ENEMY CARD -->
                <div style="flex:1; background:rgba(0,0,0,0.3); padding:10px; border-right:3px solid #ff6666; text-align:right;">
                    <div style="color:#ff6666; font-weight:bold; font-size:12px;">${this.opponent.name}</div>
                    
                    <div style="margin-top:5px; font-size:11px;">HULL</div>
                    <div style="background:#222; height:6px; width:100%; display:flex; justify-content:flex-end; margin-bottom:2px;">
                        <div id="e-hull-bar" style="background:#ff6666; height:100%; width:${(this.opponentStats.hull/this.opponentStats.maxHull)*100}%"></div>
                    </div>
                    <div id="e-hull-text" style="text-align:left; font-size:10px;">${Math.round(this.opponentStats.hull)}/${this.opponentStats.maxHull}</div>
                    
                    <div style="margin-top:5px; font-size:11px;">THREAT: <span style="color:#f66;">HIGH</span></div>
                </div>
            </div>
        `;
    }

    renderOptions(optionsEl) {
        if (!optionsEl) return;
        
        optionsEl.innerHTML = `
            <button class="combat-btn attack" data-action="attack" style="border-bottom:2px solid #a33;">
                <i class="fas fa-crosshairs"></i> FIRE
            </button>
            <button class="combat-btn evade" data-action="evade" style="border-bottom:2px solid #38a;">
                <i class="fas fa-shield-alt"></i> EVADE
            </button>
            <button class="combat-btn escape" data-action="flee" style="border-bottom:2px solid #555;">
                <i class="fas fa-running"></i> FLEE
            </button>
        `;
    }

    updateStatsUI() {
        const pPct = (this.playerStats.hull / this.playerStats.maxHull) * 100;
        const ePct = (this.opponentStats.hull / this.opponentStats.maxHull) * 100;

        const el = (id) => document.getElementById(id);

        if(el('p-hull-bar')) el('p-hull-bar').style.width = `${Math.max(0, pPct)}%`;
        if(el('e-hull-bar')) el('e-hull-bar').style.width = `${Math.max(0, ePct)}%`;
        
        if(el('p-hull-text')) el('p-hull-text').textContent = `${Math.round(Math.max(0, this.playerStats.hull))}`;
        if(el('e-hull-text')) el('e-hull-text').textContent = `${Math.round(Math.max(0, this.opponentStats.hull))}`;
        
        if(el('p-shields-text')) el('p-shields-text').textContent = this.playerStats.shields;
    }

    handleAction(action) {
        if (this.turnLocked) return;

        switch(action) {
            case 'attack':
                this.performPlayerAttack();
                break;
            case 'evade':
                this.performPlayerEvade();
                break;
            case 'flee':
                this.performPlayerFlee();
                break;
            default:
                super.handleAction(action);
        }
    }

    // --- TURN LOGIC ---

    performPlayerAttack() {
        this.turnLocked = true;
        
        // Damage calc with slight variance (0.9 to 1.1 multiplier)
        const variance = 0.9 + (Math.random() * 0.2);
        const dmg = Math.floor(this.playerStats.damage * variance);

        this.opponentStats.hull -= dmg;
        this.log(`Weapons fire hits target for <strong>${dmg}</strong> damage!`, '#66ccff');
        this.updateStatsUI();

        if (this.checkWinCondition()) return;

        // Pass turn to enemy
        setTimeout(() => this.performEnemyTurn(), 800);
    }

    performPlayerEvade() {
        this.turnLocked = true;
        this.log(`Initiating evasive maneuvers...`, '#ffcc66');
        
        // Boost evasion for next turn only
        const baseEvasion = this.playerStats.evasion;
        this.playerStats.evasion += 35; // Significant boost

        setTimeout(() => {
            this.performEnemyTurn();
            // Restore evasion after enemy attack is calculated
            this.playerStats.evasion = baseEvasion;
        }, 800);
    }

    performPlayerFlee() {
        this.turnLocked = true;
        this.log(`Charging FTL drives...`, '#fff');

        // Chance = Base 30% + Evasion Score
        const escapeChance = 30 + (this.playerStats.evasion);
        const roll = Math.random() * 100;

        setTimeout(() => {
            if (roll < escapeChance) {
                this.log(`Jump successful! Escaping combat zone.`, '#66ff99');
                setTimeout(() => this.end(), 1000);
            } else {
                this.log(`FTL Drive Locked! Escape failed.`, '#ff6666');
                setTimeout(() => this.performEnemyTurn(), 600);
            }
        }, 800);
    }

    performEnemyTurn() {
        if (this.opponentStats.hull <= 0) return;

        // Calc Hit Chance
        const hitChance = this.opponentStats.accuracy - this.playerStats.evasion;
        const roll = Math.random() * 100;

        if (roll < hitChance) {
            // HIT
            let dmg = Math.floor(this.opponentStats.damage * (0.8 + Math.random() * 0.4));
            
            // Shield Mitigation
            let shieldAbsorb = 0;
            if (this.playerStats.shields > 0) {
                // Shields absorb up to 50% of damage, but degrade
                const absorbAmt = Math.min(this.playerStats.shields, Math.ceil(dmg * 0.5));
                shieldAbsorb = absorbAmt;
                this.playerStats.shields -= Math.ceil(absorbAmt * 0.5); // Shields take damage too
                dmg -= absorbAmt;
            }

            this.playerStats.hull -= dmg;
            
            // Sync to Global State immediately so UI updates
            this.gameState.ship.hull = this.playerStats.hull;
            this.gameState.ship.shields = this.playerStats.shields;

            let msg = `Enemy fires! Hull took <strong>${dmg}</strong> damage.`;
            if(shieldAbsorb > 0) msg += ` (Shields absorbed ${shieldAbsorb})`;
            
            this.log(msg, '#ff6666');
            this.updateStatsUI();

            if (this.checkLossCondition()) return;

        } else {
            // MISS
            this.log(`Enemy weapons fire missed!`, '#888');
        }

        // Unlock turn for player
        this.turnLocked = false;
    }

    checkWinCondition() {
        if (this.opponentStats.hull <= 0) {
            this.updateStatsUI();
            this.log(`Target destroyed. Hostiles neutralized.`, '#66ff99');
            
            // Hook for subclasses (Pirate loot, etc)
            if (this.options.onWin) this.options.onWin();
            else setTimeout(() => this.end({ result: 'win' }), 1500);
            
            return true;
        }
        return false;
    }

    checkLossCondition() {
        if (this.playerStats.hull <= 0) {
            this.updateStatsUI();
            this.log(`CRITICAL FAILURE. SHIP DESTROYED.`, '#ff0000');
            
            // Trigger global game over
            setTimeout(() => {
                this.end({ result: 'loss' });
                document.getElementById('game-over-screen').style.display = 'flex';
            }, 1500);
            return true;
        }
        return false;
    }
}