import { Encounter } from './Encounter.js';
import { CombatEncounter } from './CombatEncounter.js';
import { PirateEncounter } from './PirateEncounter.js';
import { PoliceEncounter } from './PoliceEncounter.js';
import { TraderEncounter } from './TraderEncounter.js';
import { DebrisEncounter } from './DebrisEncounter.js';
import { DistressEncounter } from './DistressEncounter.js';
import { AnomalyEncounter } from './AnomalyEncounter.js';

export class EncounterManager {
    constructor(gameState) {
        this.gameState = gameState;
        this.currentEncounter = null;
    }
    
    getRandomEncounter() {
        const security = this.gameState.currentSystem.security;
        let pirateWeight = 30;
        let policeWeight = 10;
        
        // Adjust weights based on security level
        switch(security) {
            case 'high':
                pirateWeight = 5;
                policeWeight = 30;
                break;
            case 'medium':
                pirateWeight = 20;
                policeWeight = 20;
                break;
            case 'low':
                pirateWeight = 30;
                policeWeight = 10;
                break;
            case 'none':
                pirateWeight = 40;
                policeWeight = 0;
                break;
        }
        
        const encounters = [
            { type: 'pirate', name: 'Pirate Attack', weight: pirateWeight },
            { type: 'police', name: 'Police Inspection', weight: policeWeight },
            { type: 'trader', name: 'Wandering Trader', weight: 15 },
            { type: 'debris', name: 'Space Debris Field', weight: 15 },
            { type: 'distress', name: 'Distress Signal', weight: 10 },
            { type: 'anomaly', name: 'Spatial Anomaly', weight: 10 }
        ];
        
        let totalWeight = 0;
        encounters.forEach(encounter => {
            totalWeight += encounter.weight;
        });
        
        let random = Math.random() * totalWeight;
        for (const encounter of encounters) {
            if (random < encounter.weight) {
                return encounter;
            }
            random -= encounter.weight;
        }
        
        return encounters[0];
    }
    
    startEncounter(encounterType) {
        // Close any existing encounter
        if (this.currentEncounter) {
            this.currentEncounter.end();
            this.currentEncounter = null;
        }
        
        // Create the appropriate encounter
        switch(encounterType) {
            case 'pirate':
                // Determine pirate tier based on system tech level
                const techLevels = ['none', 'low', 'medium', 'high'];
                const tier = Math.min(techLevels.indexOf(this.gameState.currentSystem.techLevel) + 1 + Math.floor(Math.random() * 3), 10);
                
                // Create pirate ship
                const pirateNames = ['Bandit', 'Marauder', 'Corsair', 'Raider', 'Reaver', 'Vandal', 'Ravager'];
                const pirateTypes = ['Interceptor', 'Frigate', 'Cruiser', 'Battleship', 'Dreadnought'];
                
                // Base pirate stats with 20% boost and additional 10% per tier
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
                
                this.currentEncounter = new PirateEncounter(this.gameState.ship, pirateData, this.gameState);
                break;
                
            case 'police':
                this.currentEncounter = new PoliceEncounter(
                    this.gameState.ship, 
                    this.gameState, 
                    {
                        encounterManager: this
                    }
                );
                break;
                
            case 'trader':
                this.currentEncounter = new TraderEncounter(this.gameState.ship, this.gameState);
                break;
                
            case 'debris':
                this.currentEncounter = new DebrisEncounter(this.gameState.ship, this.gameState);
                break;
                
            case 'distress':
                this.currentEncounter = new DistressEncounter(this.gameState.ship, this.gameState);
                break;
                
            case 'anomaly':
                this.currentEncounter = new AnomalyEncounter(this.gameState.ship, this.gameState);
                break;
                
            default:
                console.warn(`Unknown encounter type: ${encounterType}`);
                return;
        }
        
        // Start the encounter
        this.currentEncounter.start();
    }
    
    handleEncounterAction(action) {
        if (!this.currentEncounter || !this.currentEncounter.active) {
            console.warn('No active encounter to handle action for');
            return;
        }
        
        // Let the encounter handle its own action
        this.currentEncounter.handleAction(action);
    }
}