/* --- START OF FILE EncounterManager.js --- */

import { PirateEncounter } from './PirateEncounter.js';
import { PoliceEncounter } from './PoliceEncounter.js';
import { DebrisEncounter } from './DebrisEncounter.js';
import { TraderEncounter } from './TraderEncounter.js';
import { DistressEncounter } from './DistressEncounter.js';
import { AnomalyEncounter } from './AnomalyEncounter.js';
import { Encounter } from './Encounter.js'; 

const ENCOUNTER_CONFIG = {
    // Global Base Chance (0.0 to 1.0)
    // 0.9 = 90% chance every jump
    BASE_CHANCE: 0.2, 

    // Modifiers based on System Security
    // These are added to BASE_CHANCE
    SECURITY_MODS: {
        'high': -0.2,   // 0.9 - 0.2 = 70% chance
        'medium': 0.0,  // 0.9 + 0.0 = 90% chance
        'low': 0.1,     // 0.9 + 0.1 = 100% chance
        'none': 0.1     // 100% chance
    }
};

export class EncounterManager {
    constructor(gameState) {
        this.gameState = gameState;
        this.ui = null;
        this.currentEncounter = null;
        this.handleInput = this.handleInput.bind(this);
        this.setupEventListeners();
    }

    setUI(ui) { this.ui = ui; }

    setupEventListeners() {
        const optionsContainer = document.getElementById('encounter-options');
        if (!optionsContainer) return;

        const newContainer = optionsContainer.cloneNode(false);
        optionsContainer.parentNode.replaceChild(newContainer, optionsContainer);
        
        newContainer.addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            if (btn && btn.dataset.action) this.handleInput(btn.dataset.action);
        });
    }

    /**
     * Step 1: Check IF an encounter happens.
     */
    shouldTriggerEncounter() {
        // Safety Check
        if (!this.gameState.currentSystem) {
            console.error("EncounterManager: Current System is null!");
            return false;
        }

        const sec = this.gameState.currentSystem.security;
        
        // Calculate Probability
        let chance = ENCOUNTER_CONFIG.BASE_CHANCE;
        
        if (ENCOUNTER_CONFIG.SECURITY_MODS[sec] !== undefined) {
            chance += ENCOUNTER_CONFIG.SECURITY_MODS[sec];
        }

        // Clamp (0 to 1)
        chance = Math.max(0, Math.min(1, chance));

        const roll = Math.random();
        const triggered = roll < chance;

        console.log(`%c[Encounter Check] System: ${sec} | Chance: ${(chance*100).toFixed(0)}% | Roll: ${(roll*100).toFixed(0)}% -> ${triggered ? 'TRIGGERED' : 'SAFE'}`, triggered ? 'color: #6f9' : 'color: #aaa');
        
        return triggered;
    }

    /**
     * Step 2: Calculate WHICH encounter happens.
     */
    calculateEncounterWeights() {
        const sys = this.gameState.currentSystem;
        
        // 1. Validate Data
        if (!sys) return { trader: 100 }; // Fail safe

        // 2. Base Weights (Arbitrary Integers)
        // High numbers = High probability relative to others
        const baseWeights = {
            'high':     { police: 1000, trader: 500,  distress: 200, debris: 50,   pirate: 20,   anomaly: 50 },
            'medium':   { police: 300,  trader: 400,  distress: 300, debris: 150,  pirate: 150,  anomaly: 100 },
            'low':      { police: 100,  trader: 150,  distress: 200, debris: 300,  pirate: 600,  anomaly: 150 },
            'none':     { police: 0,    trader: 50,   distress: 150, debris: 400,  pirate: 1000, anomaly: 200 }
        };

        // 3. Economy Bonuses (Additive)
        const ecoModifiers = {
            'agricultural': { trader: 300, distress: 100 },
            'mining':       { debris: 500, pirate: 100 }, 
            'industrial':   { trader: 300, police: 200 },
            'tech':         { anomaly: 500, police: 100 }, 
            'military':     { police: 800, pirate: 200 },
            'tourism':      { trader: 500, distress: 200 },
        };

        // 4. Merge
        let currentWeights = { ...baseWeights[sys.security] };
        const mods = ecoModifiers[sys.economy] || {};

        for (const [type, bonus] of Object.entries(mods)) {
            if (currentWeights[type] !== undefined) {
                currentWeights[type] += bonus;
            } else {
                currentWeights[type] = bonus;
            }
        }

        return currentWeights;
    }

    getRandomEncounter() {
        const weights = this.calculateEncounterWeights();
        this.logProbabilities(weights); // See console for exact %
        
        const type = this.pickFromTable(weights);
        return { type };
    }

    pickFromTable(weights) {
        const total = Object.values(weights).reduce((sum, w) => sum + w, 0);
        let rand = Math.random() * total;
        
        for (const [type, weight] of Object.entries(weights)) {
            if (rand < weight) return type;
            rand -= weight;
        }
        return 'trader';
    }

    logProbabilities(weights) {
        const total = Object.values(weights).reduce((a, b) => a + b, 0);
        const probs = {};
        for (const [k, v] of Object.entries(weights)) {
            probs[k] = Math.round((v / total) * 100) + '%';
        }
        console.log('Encounter Table:', probs);
    }

    startEncounter(type) {
        if (this.currentEncounter) {
            this.currentEncounter.end({ quiet: true });
            this.currentEncounter = null;
        }

        console.log(`EncounterManager: Starting ${type}`);

        switch (type) {
            case 'pirate':   this.spawnPirate(); break;
            case 'police':   this.currentEncounter = new PoliceEncounter(this.gameState.ship, this.gameState, { encounterManager: this }); break;
            case 'debris':   this.currentEncounter = new DebrisEncounter(this.gameState.ship, this.gameState); break;
            case 'trader':   this.currentEncounter = new TraderEncounter(this.gameState.ship, this.gameState); break;
            case 'distress': this.currentEncounter = new DistressEncounter(this.gameState.ship, this.gameState, { encounterManager: this }); break;
            case 'anomaly':  this.currentEncounter = new AnomalyEncounter(this.gameState.ship, this.gameState); break;
            default:         this.currentEncounter = new TraderEncounter(this.gameState.ship, this.gameState); break;
        }

        if (this.currentEncounter) {
            if (this.currentEncounter.setUI) this.currentEncounter.setUI(this.ui);
            this.currentEncounter.start();
        }
    }

    spawnPirate() {
        // Pirate tier logic... (Same as before)
        const progress = this.gameState.systemsVisited || 0;
        const baseTier = 1 + Math.floor(progress / 15);
        let tier = baseTier + (Math.floor(Math.random() * 4) - 1);
        tier = Math.max(1, Math.min(10, tier));

        const hull = 40 + (tier * 20);
        const damage = 5 + (tier * 2.5);
        
        const pirateShip = {
            name: `Pirate Raider (T${tier})`,
            tier: tier,
            hull: hull,
            maxHull: hull,
            damage: damage,
            accuracy: Math.min(95, 50 + (tier * 3)),
            icon: 'fa-skull-crossbones'
        };

        this.currentEncounter = new PirateEncounter(this.gameState.ship, pirateShip, this.gameState);
    }

    handleInput(action) {
        if (!this.currentEncounter || !this.currentEncounter.active) return;
        this.currentEncounter.handleAction(action);
        if (this.ui) this.ui.updateUI();
    }
}