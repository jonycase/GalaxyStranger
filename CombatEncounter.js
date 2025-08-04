import { Encounter } from './Encounter.js';

export class CombatEncounter extends Encounter {
    constructor(player, opponent, gameState, options = {}) {
        super(player, gameState, {
            ...options,
            type: options.type || 'combat',
            title: options.title || 'COMBAT ENCOUNTER',
            iconClass: options.iconClass || 'fa-skull'
        });
        
        this.opponent = opponent;
        this.playerStats = {
            hull: player.hull,
            damage: player.damage,
            evasion: player.evasion,
            shields: player.shields
        };
        this.opponentStats = {
            hull: opponent.hull,
            damage: opponent.damage,
            accuracy: opponent.accuracy || 60
        };
    }

    renderContent(contentEl) {
        contentEl.innerHTML = `
            <div class="ships-container">
                <div class="ship-display">
                    <div class="ship-icon"><i class="fas fa-rocket"></i></div>
                    <h3>Your Ship</h3>
                    <div class="ship-stats">
                        <div>Hull: <span id="player-hull">${this.playerStats.hull}%</span></div>
                        <div>Damage: <span id="player-damage">${this.playerStats.damage}</span></div>
                        <div>Evasion: <span id="player-evasion">${this.playerStats.evasion}%</span></div>
                        <div>Shields: <span id="player-shields">${this.playerStats.shields}%</span></div>
                    </div>
                </div>
                <div class="ship-display">
                    <div class="ship-icon"><i class="fas ${this.opponent.icon || 'fa-pirate-ship'}"></i></div>
                    <h3 id="opponent-name">${this.opponent.name}</h3>
                    <div class="ship-stats">
                        <div>Hull: <span id="opponent-hull">${this.opponentStats.hull}%</span></div>
                        <div>Damage: <span id="opponent-damage">${this.opponentStats.damage}</span></div>
                        <div>Accuracy: <span id="opponent-accuracy">${this.opponentStats.accuracy}%</span></div>
                        <div>Tier: <span id="opponent-tier">${this.opponent.tier ? 'T' + this.opponent.tier : ''}</span></div>
                    </div>
                </div>
            </div>
        `;
    }

    renderOptions() {
        const optionsEl = document.getElementById('encounter-options');
        if (!optionsEl) return;
        
        optionsEl.innerHTML = '';
        
        // Add combat action buttons
        const actions = [
            { id: 'attack', icon: 'fa-fist-raised', label: 'ATTACK', className: 'attack' },
            { id: 'evade', icon: 'fa-sync-alt', label: 'EVADE', className: 'evade' },
            { id: 'escape', icon: 'fa-running', label: 'ESCAPE', className: 'escape' }
        ];
        
        actions.forEach(action => {
            const button = document.createElement('button');
            button.className = `combat-btn ${action.className}`;
            button.innerHTML = `<i class="fas ${action.icon}"></i> ${action.label}`;
            button.dataset.action = action.id;
            optionsEl.appendChild(button);
        });
    }

    processTurn(action) {
        let result = {
            playerDamage: 0,
            opponentDamage: 0,
            playerEffect: '',
            opponentEffect: '',
            encounterContinues: true
        };
        
        switch (action) {
            case 'attack':
                result = this.handleAttack();
                break;
            case 'evade':
                result = this.handleEvade();
                break;
            case 'escape':
                result = this.handleEscape();
                break;
        }
        
        return result;
    }

    handleAttack() {
        // Player attacks opponent
        const damageDealt = Math.max(1, this.playerStats.damage - Math.floor(Math.random() * 3));
        this.opponentStats.hull -= damageDealt;
        
        let playerEffect = `You deal ${damageDealt} damage!`;
        let encounterContinues = true;
        
        // Check if opponent is defeated
        if (this.opponentStats.hull <= 0) {
            this.opponentStats.hull = 0;
            playerEffect += `<br><strong>${this.opponent.name} destroyed!</strong>`;
            encounterContinues = false;
        }
        
        // Opponent attacks player (if still alive)
        let opponentDamage = 0;
        let opponentEffect = '';
        
        if (this.opponentStats.hull > 0 && Math.random() * 100 < this.opponentStats.accuracy) {
            opponentDamage = Math.max(1, this.opponentStats.damage - Math.floor(Math.random() * 2));
            
            // Apply shield reduction
            if (this.playerStats.shields > 0) {
                const shieldReduction = Math.min(this.playerStats.shields, opponentDamage);
                opponentDamage -= shieldReduction;
                this.playerStats.shields -= shieldReduction;
                opponentEffect += `Shields absorbed ${shieldReduction} damage!<br>`;
            }
            
            this.playerStats.hull -= opponentDamage;
            opponentEffect += `Opponent deals ${opponentDamage} damage!`;
            
            // Check if player is defeated
            if (this.playerStats.hull <= 0) {
                this.playerStats.hull = 0;
                opponentEffect += `<br><strong>Your ship destroyed!</strong>`;
                encounterContinues = false;
            }
        } else if (this.opponentStats.hull > 0) {
            opponentEffect = "Opponent attack missed!";
        }
        
        return {
            playerDamage: damageDealt,
            opponentDamage: opponentDamage,
            playerEffect: playerEffect,
            opponentEffect: opponentEffect,
            encounterContinues: encounterContinues
        };
    }

    handleEvade() {
        let playerEffect = '';
        let opponentDamage = 0;
        let encounterContinues = true;
        
        // Attempt to evade
        if (Math.random() * 100 < this.playerStats.evasion) {
            playerEffect = "Evasion successful!";
        } else {
            opponentDamage = Math.max(1, this.opponentStats.damage - Math.floor(Math.random() * 2));
            this.playerStats.hull -= opponentDamage;
            playerEffect = `Evasion failed! ${opponentDamage} damage.`;
            
            // Check if player is defeated
            if (this.playerStats.hull <= 0) {
                this.playerStats.hull = 0;
                playerEffect += `<br><strong>Your ship destroyed!</strong>`;
                encounterContinues = false;
            }
        }
        
        return {
            playerDamage: 0,
            opponentDamage: opponentDamage,
            playerEffect: playerEffect,
            opponentEffect: '',
            encounterContinues: encounterContinues
        };
    }

    handleEscape() {
        let playerEffect = '';
        let opponentDamage = 0;
        let encounterContinues = false;
        
        // Attempt to escape
        if (Math.random() > 0.3) {
            playerEffect = "Escape successful!";
        } else {
            opponentDamage = Math.max(3, this.opponentStats.damage + Math.floor(Math.random() * 5));
            this.playerStats.hull -= opponentDamage;
            playerEffect = `Escape failed! ${opponentDamage} damage.`;
            
            // Check if player is defeated
            if (this.playerStats.hull <= 0) {
                this.playerStats.hull = 0;
                playerEffect += `<br><strong>Your ship destroyed!</strong>`;
            } else {
                encounterContinues = true;
            }
        }
        
        return {
            playerDamage: 0,
            opponentDamage: opponentDamage,
            playerEffect: playerEffect,
            opponentEffect: '',
            encounterContinues: encounterContinues
        };
    }

    updateStatsUI() {
        const playerHullEl = document.getElementById('player-hull');
        const playerDamageEl = document.getElementById('player-damage');
        const playerEvasionEl = document.getElementById('player-evasion');
        const playerShieldsEl = document.getElementById('player-shields');
        const opponentHullEl = document.getElementById('opponent-hull');
        const opponentDamageEl = document.getElementById('opponent-damage');
        const opponentAccuracyEl = document.getElementById('opponent-accuracy');
        
        if (playerHullEl) playerHullEl.textContent = `${this.playerStats.hull}%`;
        if (playerDamageEl) playerDamageEl.textContent = this.playerStats.damage;
        if (playerEvasionEl) playerEvasionEl.textContent = `${this.playerStats.evasion}%`;
        if (playerShieldsEl) playerShieldsEl.textContent = `${this.playerStats.shields}%`;
        if (opponentHullEl) opponentHullEl.textContent = `${this.opponentStats.hull}%`;
        if (opponentDamageEl) opponentDamageEl.textContent = this.opponentStats.damage;
        if (opponentAccuracyEl) opponentAccuracyEl.textContent = `${this.opponentStats.accuracy}%`;
    }

    handleAction(action) {
        if (action === 'close') {
            this.end();
            this.closeEncounterModal();
            return;
        }
        
        const result = this.processTurn(action);
        
        // Log results
        if (result.playerEffect) this.log(result.playerEffect);
        if (result.opponentEffect) this.log(result.opponentEffect);
        
        // Update UI
        this.updateStatsUI();
        
        // Check if encounter should end
        if (!result.encounterContinues) {
            setTimeout(() => {
                this.end();
                this.closeEncounterModal();
            }, 2000);
        }
    }
    
    end(result = {}) {
        const encounterResult = super.end(result);
        
        // Update game state
        this.gameState.ship.hull = this.playerStats.hull;
        this.gameState.ship.shields = this.playerStats.shields;
        
        // Update UI
        this.updateMainUI();
        
        return encounterResult;
    }
}