/* --- START OF FILE AnomalyEncounter.js --- */

import { Encounter } from './Encounter.js';

/**
 * Configuration for the various types of anomalies.
 * Defines the flavor text, risk calculations, and potential rewards for each type.
 */
const ANOMALY_TYPES = {
    WORMHOLE: {
        id: 'WORMHOLE',
        name: "Unstable Wormhole",
        icon: "fa-dizzy", // Swirly icon
        color: "#b088ff", // Purple
        description: "A tear in space-time detected. Gravitational shear is extreme.",
        scanText: "Analyzing event horizon stability...",
        phases: ['APPROACH', 'STABILIZE', 'TRAVERSE'],
        statCheck: 'evasion', // Engines help navigate shear
        riskLabel: "Gravitational Crush",
        successReward: "Hyper-Jump (Distance Travelled)",
        failPenalty: "Hull Crush"
    },
    NEBULA: {
        id: 'NEBULA',
        name: "Protoplanetary Nebula",
        icon: "fa-cloud",
        color: "#ff88cc", // Pinkish
        description: "A dense cloud of ionized gas and forming crystals. Highly volatile.",
        scanText: "Mapping ionization pockets...",
        phases: ['APPROACH', 'SHIELD_MOD', 'HARVEST'],
        statCheck: 'shields', // Shields protect from radiation
        riskLabel: "Radiation Burn",
        successReward: "Exotic Fuel & Crystals",
        failPenalty: "Shield Collapse"
    },
    MONOLITH: {
        id: 'MONOLITH',
        name: "Alien Monolith",
        icon: "fa-cube",
        color: "#66ffcc", // Teal
        description: "A geometric object of unknown origin broadcasting on all frequencies.",
        scanText: "Deciphering linguistic matrix...",
        phases: ['HAIL', 'DECRYPT', 'DOWNLOAD'],
        statCheck: 'radar', // Tech level helps decode
        riskLabel: "System Virus",
        successReward: "Ancient Tech Data (Credits)",
        failPenalty: "Computer Wipe (Fuel/Nav data loss)"
    },
    TEMPORAL: {
        id: 'TEMPORAL',
        name: "Temporal Rift",
        icon: "fa-clock",
        color: "#ccaaff", // Pale purple
        description: "Chronoton particle density critical. Time is flowing backwards locally.",
        scanText: "Calculating temporal variance...",
        phases: ['OBSERVE', 'SYNC', 'EXTRACT'],
        statCheck: 'evasion', // Speed determines escape velocity
        riskLabel: "Aging Acceleration",
        successReward: "Pre-Cognitive Market Data",
        failPenalty: "Structural Rust (Max Hull reduction)"
    },
    VOID_RIFT: {
        id: 'VOID_RIFT',
        name: "Abyssal Void",
        icon: "fa-eye",
        color: "#ffffff", // White/Black
        description: "Sensors detect nothing. Literally nothing. A hole in reality.",
        scanText: "Staring into the abyss...",
        phases: ['APPROACH', 'COMMUNE', 'ESCAPE'],
        statCheck: 'hull', // Mental/Physical integrity
        riskLabel: "Madness",
        successReward: "Void Essence (High Value)",
        failPenalty: "Reality Failure (Random Stat Down)"
    }
};

export class AnomalyEncounter extends Encounter {
    constructor(player, gameState) {
        super(player, gameState, {
            type: 'anomaly',
            title: 'SPATIAL ANOMALY DETECTED',
            iconClass: 'fa-atom'
        });

        // 1. Procedural Generation
        this.anomaly = this.generateAnomaly();
        
        // 2. State Management
        this.phase = 'DETECTED'; // DETECTED -> SCANNED -> CALIBRATING -> RESOLVING -> RESULT
        this.scanData = {
            integrity: 0,   // 0-100%
            risk: 0,        // 0-100%
            potential: 0    // 0-100% (Reward scale)
        };
        this.calibration = 50; // Player sets this (0 = Safe, 100 = Greedy)
        
        // 3. Logger State
        this.scienceLog = [];
    }

    /**
     * Selects an anomaly type based on randomness and potentially current system biome.
     */
    generateAnomaly() {
        const keys = Object.keys(ANOMALY_TYPES);
        const typeKey = keys[Math.floor(Math.random() * keys.length)];
        return ANOMALY_TYPES[typeKey];
    }

    /* ==========================================================================
       RENDER LOGIC
       Handles the complex UI states for the scientific mini-game.
    ========================================================================== */

    renderContent(contentEl) {
        if (!contentEl) return;

        // Dynamic Header Color
        const themeColor = this.anomaly.color;
        
        // --- HEADER ---
        let html = `
            <div style="display:flex; align-items:center; justify-content:center; gap:15px; margin-bottom:15px; border-bottom:1px solid ${themeColor}; padding-bottom:10px;">
                <i class="fas ${this.anomaly.icon}" style="font-size:32px; color:${themeColor}; text-shadow:0 0 10px ${themeColor};"></i>
                <div>
                    <h3 style="margin:0; font-size:18px; color:#fff; text-transform:uppercase; letter-spacing:2px;">${this.anomaly.name}</h3>
                    <div style="font-size:10px; color:#aaa;">CLASS ${Math.ceil(Math.random()*5)} PHENOMENON</div>
                </div>
            </div>
        `;

        // --- BODY ---
        switch (this.phase) {
            case 'DETECTED':
                html += `
                    <p style="font-size:14px; color:#ccc; margin-bottom:20px;">
                        "${this.anomaly.description}"
                    </p>
                    <div style="background:rgba(255,255,255,0.05); padding:15px; border-radius:6px; text-align:left;">
                        <div style="font-size:11px; color:#888; margin-bottom:5px;">PRELIMINARY READINGS</div>
                        <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                            <span>Primary Hazard:</span>
                            <span style="color:#f66;">${this.anomaly.riskLabel}</span>
                        </div>
                        <div style="display:flex; justify-content:space-between;">
                            <span>Required Systems:</span>
                            <span style="color:#6cf;">${this.getSystemLabel()}</span>
                        </div>
                    </div>
                `;
                break;

            case 'SCANNED':
                html += this.renderScanResults(themeColor);
                break;

            case 'CALIBRATING':
                html += this.renderCalibrationUI(themeColor);
                break;

            case 'RESULT':
                html += this.renderResultScreen(themeColor);
                break;
        }

        // --- SCIENCE LOG ---
        if (this.scienceLog.length > 0) {
            html += `
                <div style="margin-top:15px; background:#000; border:1px solid #333; padding:8px; height:80px; overflow-y:auto; font-family:monospace; font-size:11px; color:#0f0; text-align:left;">
                    ${this.scienceLog.map(l => `<div>> ${l}</div>`).join('')}
                    <div class="cursor-blink">_</div>
                </div>
            `;
        }

        contentEl.innerHTML = html;
        
        // Auto-scroll log
        const logContainer = contentEl.querySelector('div[style*="overflow-y:auto"]');
        if (logContainer) logContainer.scrollTop = logContainer.scrollHeight;
    }

    renderScanResults(color) {
        // Visual representation of the scan data
        const getBar = (val, color) => `
            <div style="height:6px; width:100%; background:#222; margin-top:3px; border-radius:3px; overflow:hidden;">
                <div style="height:100%; width:${val}%; background:${color}; transition:width 1s ease-out;"></div>
            </div>
        `;

        return `
            <div style="text-align:left; padding:10px;">
                <div style="margin-bottom:15px;">
                    <div style="display:flex; justify-content:space-between; font-size:12px;">
                        <span>Structural Integrity</span>
                        <span>${this.scanData.integrity}%</span>
                    </div>
                    ${getBar(this.scanData.integrity, '#6f9')}
                </div>
                
                <div style="margin-bottom:15px;">
                    <div style="display:flex; justify-content:space-between; font-size:12px;">
                        <span>Risk Factor</span>
                        <span>${this.scanData.risk}%</span>
                    </div>
                    ${getBar(this.scanData.risk, '#f66')}
                </div>

                <div style="margin-bottom:15px;">
                    <div style="display:flex; justify-content:space-between; font-size:12px;">
                        <span>Energy Potential</span>
                        <span>${this.scanData.potential}%</span>
                    </div>
                    ${getBar(this.scanData.potential, color)}
                </div>
                
                <p style="font-size:12px; color:#aaa; margin-top:10px;">
                    Analysis complete. Initiate system calibration to attempt interaction.
                </p>
            </div>
        `;
    }

    renderCalibrationUI(color) {
        return `
            <div style="padding:10px;">
                <p style="font-size:12px; color:#ccc;">Adjust system harmonics. Higher output increases yield but destabilizes the anomaly.</p>
                
                <div style="margin:20px 0; position:relative; height:40px; background:#222; border-radius:20px; border:2px solid #444; overflow:hidden;">
                    <!-- The Bar -->
                    <div style="position:absolute; top:0; left:0; height:100%; width:${this.calibration}%; background:linear-gradient(90deg, #6f9, #ea0, #f66);"></div>
                    
                    <!-- The Marker Text -->
                    <div style="position:absolute; top:0; left:0; width:100%; height:100%; display:flex; align-items:center; justify-content:center; text-shadow:0 0 5px #000; font-weight:bold; color:#fff;">
                        ${this.calibration < 40 ? 'SAFE' : (this.calibration < 75 ? 'BALANCED' : 'UNSTABLE')} (${this.calibration}%)
                    </div>
                </div>

                <div style="display:flex; justify-content:center; gap:10px; margin-bottom:10px;">
                    <button class="combat-btn" style="padding:5px 15px;" data-action="cal_down"><i class="fas fa-minus"></i></button>
                    <button class="combat-btn" style="padding:5px 15px;" data-action="cal_up"><i class="fas fa-plus"></i></button>
                </div>
            </div>
        `;
    }

    renderResultScreen(color) {
        const isSuccess = this.result.success;
        const icon = isSuccess ? 'fa-check-circle' : 'fa-radiation-alt';
        const iconColor = isSuccess ? '#6f9' : '#f66';
        
        return `
            <div style="text-align:center; padding:20px;">
                <i class="fas ${icon}" style="font-size:48px; color:${iconColor}; margin-bottom:15px;"></i>
                <h2 style="color:${iconColor}; font-size:18px; margin:0 0 10px 0;">${isSuccess ? 'OPERATION SUCCESSFUL' : 'CRITICAL FAILURE'}</h2>
                <p style="color:#ccc; font-size:13px;">${this.result.message}</p>
                
                ${isSuccess ? `
                <div style="margin-top:15px; padding:10px; background:rgba(100,255,100,0.1); border-radius:4px;">
                    <div style="color:#8f8; font-size:11px; font-weight:bold;">ACQUIRED</div>
                    <div style="color:#fff;">${this.result.reward}</div>
                </div>` : ''}
            </div>
        `;
    }

    getSystemLabel() {
        switch(this.anomaly.statCheck) {
            case 'shields': return 'Deflector Shields';
            case 'evasion': return 'Impulse Engines';
            case 'radar': return 'Sensor Array';
            default: return 'Structural Integrity';
        }
    }

    /* ==========================================================================
       OPTIONS & INPUT HANDLING
    ========================================================================== */

    renderOptions(optionsEl) {
        if (!optionsEl) return;
        let html = '';

        switch (this.phase) {
            case 'DETECTED':
                html += `
                    <button class="combat-btn evade" data-action="scan">
                        <i class="fas fa-satellite-dish"></i> SCAN (${this.gameState.ship.radar || 0})
                    </button>
                    <button class="combat-btn escape" data-action="close">
                        <i class="fas fa-times"></i> AVOID
                    </button>
                `;
                break;

            case 'SCANNED':
                html += `
                    <button class="combat-btn attack" data-action="calibrate">
                        <i class="fas fa-sliders-h"></i> CALIBRATE
                    </button>
                    <button class="combat-btn escape" data-action="close">LEAVE</button>
                `;
                break;

            case 'CALIBRATING':
                // Note: The Up/Down buttons are in the content area for better layout control
                // These are the commit buttons
                html += `
                    <button class="combat-btn attack" data-action="execute">
                        <i class="fas fa-power-off"></i> INITIATE
                    </button>
                `;
                break;

            case 'RESULT':
                html += `<button class="combat-btn escape" data-action="close">CONTINUE</button>`;
                break;
        }

        optionsEl.innerHTML = html;
        
        // Attach listeners for calibration buttons specifically if they exist
        // Note: The Main EncounterManager delegate handles the clicks, but we need to ensure the data-actions match handleAction
    }

    handleAction(action) {
        switch (action) {
            case 'close':
                this.end();
                break;
            case 'scan':
                this.performScan();
                break;
            case 'calibrate':
                this.phase = 'CALIBRATING';
                this.addToLog("Initializing control interface...");
                this.updateUI();
                break;
            case 'cal_up':
                this.adjustCalibration(10);
                break;
            case 'cal_down':
                this.adjustCalibration(-10);
                break;
            case 'execute':
                this.executeInteraction();
                break;
        }
    }

    updateUI() {
        this.renderContent(document.getElementById('encounter-content'));
        this.renderOptions(document.getElementById('encounter-options'));
    }

    addToLog(msg) {
        this.scienceLog.push(msg);
        if (this.scienceLog.length > 5) this.scienceLog.shift();
    }

    /* ==========================================================================
       GAMEPLAY LOGIC
    ========================================================================== */

    performScan() {
        this.addToLog("Sensors locked. Gathering telemetry...");
        
        // Base stats
        const radar = this.gameState.ship.radar || 0;
        
        // Generate pseudo-random data
        // Risk: 10-50% base, reduced by Radar
        this.scanData.risk = Math.max(5, Math.floor((Math.random() * 50) - (radar * 5)));
        
        // Integrity: How stable the anomaly is (10-90%)
        this.scanData.integrity = 10 + Math.floor(Math.random() * 80);
        
        // Potential: Value (50-100%)
        this.scanData.potential = 50 + Math.floor(Math.random() * 50);

        setTimeout(() => {
            this.addToLog(`Analysis complete. Risk detected: ${this.scanData.risk}%`);
            this.phase = 'SCANNED';
            this.updateUI();
        }, 800);
        
        this.updateUI(); // Immediate update to show log
    }

    adjustCalibration(amount) {
        this.calibration = Math.max(0, Math.min(100, this.calibration + amount));
        this.updateUI();
    }

    executeInteraction() {
        this.addToLog("Sequence initiated. Engaging...");
        
        // 1. Calculate Success Chance
        // Formula: (ShipStat * 2) + (AnomalyIntegrity / 2) - (CalibrationRisk)
        
        let shipStatVal = 0;
        switch(this.anomaly.statCheck) {
            case 'shields': shipStatVal = this.gameState.ship.shields; break;
            case 'evasion': shipStatVal = this.gameState.ship.evasion * 2; break; // Evasion is usually lower (0-50)
            case 'radar': shipStatVal = (this.gameState.ship.radar || 0) * 15; break;
            case 'hull': shipStatVal = this.gameState.ship.hull; break;
        }

        // Calibration Factor: High calibration = Higher Reward Potential BUT Higher Failure Chance
        const calibrationPenalty = this.calibration * 0.5; // Up to -50% chance
        const baseChance = 50;
        
        const successChance = baseChance + (shipStatVal * 0.5) - this.scanData.risk - calibrationPenalty;
        const roll = Math.random() * 100;

        const success = roll < successChance;

        setTimeout(() => {
            if (success) {
                this.resolveSuccess();
            } else {
                this.resolveFailure();
            }
        }, 1000);
    }

    resolveSuccess() {
        // Calculate Reward Multiplier based on Calibration
        const multiplier = 1 + (this.calibration / 100);
        const baseReward = this.scanData.potential * 10;
        const finalValue = Math.floor(baseReward * multiplier);

        let rewardText = "";
        
        switch(this.anomaly.id) {
            case 'WORMHOLE':
                const dist = 50 + Math.floor(this.calibration);
                this.gameState.totalDaysTraveled += 0; // Instant travel
                // Abstract reward: Distance data sold
                this.gameState.credits += finalValue;
                rewardText = `Nav Data Sold (${finalValue} CR) & ${dist} LY Jump`;
                break;
            case 'NEBULA':
                // Fuel
                const fuel = 5 + Math.floor(this.calibration / 5);
                this.gameState.fuel = Math.min(this.gameState.maxFuel, this.gameState.fuel + fuel);
                this.gameState.credits += finalValue;
                rewardText = `Harvested ${fuel} Fuel & Rare Gas (${finalValue} CR)`;
                break;
            default:
                this.gameState.credits += finalValue;
                rewardText = `${finalValue} Credits (Data Value)`;
        }

        this.result = {
            success: true,
            message: `Synchronization stable. Resources extracted successfully.`,
            reward: rewardText
        };
        this.phase = 'RESULT';
        this.updateUI();
        
        // Update global UI
        if (this.ui) this.ui.updateUI();
        const credEl = document.getElementById('credits');
        if(credEl) credEl.textContent = `${Math.floor(this.gameState.credits).toLocaleString()} CR`;
    }

    resolveFailure() {
        // Calculate Damage
        const dmg = 10 + Math.floor(this.calibration / 3);
        
        if (this.anomaly.statCheck === 'shields' && this.gameState.ship.shields > 0) {
            const absorb = Math.min(this.gameState.ship.shields, dmg);
            this.gameState.ship.shields -= absorb;
            this.result = {
                success: false,
                message: `Feedback loop! Shields overloaded, absorbing ${absorb} damage.`
            };
        } else {
            this.gameState.ship.hull -= dmg;
            this.result = {
                success: false,
                message: `Containment breached! Hull took ${dmg}% damage from ${this.anomaly.riskLabel}.`
            };
            
            if (this.gameState.ship.hull <= 0) {
                this.end();
                document.getElementById('game-over-screen').style.display = 'flex';
                return;
            }
        }
        
        this.phase = 'RESULT';
        this.updateUI();
        
        // Update global UI
        const hullEl = document.getElementById('hull');
        if(hullEl) hullEl.textContent = `${Math.round(this.gameState.ship.hull)}%`;
    }
}