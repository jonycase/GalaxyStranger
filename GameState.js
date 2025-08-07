import { EconomyProfiles, CustomSystems, getWeightedRandom, generateSystemName } from './SystemGen.js';

export class GameState {
    constructor() {
        this.credits = 10000;
        this.fuel = 15;
        this.maxFuel = 15;
        this.cargo = [];
        this.cargoCapacity = 50;
        this.ship = {
            x: 0,
            y: 0,
            targetX: 0,
            targetY: 0,
            traveling: false,
            travelProgress: 0,
            hull: 100,
            maxHull: 100,
            damage: 10,
            evasion: 15,
            shields: 20,
            engine: 1,
            rotation: 0
        };
        this.currentSystem = null;
        this.targetSystem = null;
        this.galaxy = [];
        this.galaxySize = 200;
        this.totalDaysTraveled = 0;
        this.restockIntervalMin = 7;
        this.restockIntervalMax = 10;
        this.fullRestockIntervalMin = 11;
        this.fullRestockIntervalMax = 14;
        
        this.goods = [
            { id: 'food', name: 'Food Rations', basePrice: 10, volatility: 3, production: ['agricultural'], illegal: false },
            { id: 'water', name: 'Water', basePrice: 5, volatility: 2, production: ['agricultural', 'mining'], illegal: false },
            { id: 'ore', name: 'Titanium Ore', basePrice: 30, volatility: 8, production: ['mining', 'industrial'], illegal: false },
            { id: 'medicine', name: 'Medi-Gel', basePrice: 50, volatility: 12, production: ['tech', 'agricultural'], illegal: false },
            { id: 'tech', name: 'Tech Parts', basePrice: 80, volatility: 15, production: ['tech', 'industrial'], illegal: false },
            { id: 'luxury', name: 'Luxury Goods', basePrice: 120, volatility: 20, production: ['trade', 'tech'], illegal: false },
            { id: 'artifacts', name: 'Alien Artifacts', basePrice: 200, volatility: 40, production: ['mining', 'trade'], illegal: false },
            { id: 'fuel', name: 'Hyperfuel', basePrice: 25, volatility: 5, production: ['industrial', 'mining'], illegal: false },
            { id: 'robotics', name: 'Robotics', basePrice: 150, volatility: 25, production: ['tech', 'industrial'], illegal: false },
            { id: 'crystals', name: 'Quantum Crystals', basePrice: 180, volatility: 30, production: ['mining', 'tech'], illegal: false },
            { id: 'drugs', name: 'Neural Stimulants', basePrice: 300, volatility: 60, production: ['tech'], illegal: true },
            { id: 'weapons', name: 'Plasma Rifles', basePrice: 450, volatility: 70, production: ['military'], illegal: true },
            { id: 'spice', name: 'Andromedan Spice', basePrice: 500, volatility: 80, production: ['agricultural'], illegal: true },
            { id: 'bio', name: 'Bio-Enhancers', basePrice: 350, volatility: 65, production: ['tech'], illegal: true },
            { id: 'ai', name: 'Sentient AI Cores', basePrice: 800, volatility: 90, production: ['tech'], illegal: true }
        ];
        
        this.economyTypes = Object.keys(EconomyProfiles);
        this.techLevels = ['none', 'low', 'medium', 'high'];
        this.securityLevels = ['none', 'low', 'medium', 'high'];
        
        this.upgrades = [
            { id: 'hull', name: 'Reinforced Hull', description: 'Increases hull strength', cost: 2000, effect: 10, icon: 'fas fa-shield-alt' },
            { id: 'weapons', name: 'Plasma Cannons', description: 'Increases weapon damage', cost: 3000, effect: 5, icon: 'fas fa-gem' },
            { id: 'engine', name: 'Quantum Engine', description: 'Increases evasion chance', cost: 2500, effect: 5, icon: 'fas fa-tachometer-alt' },
            { id: 'shields', name: 'Deflector Shields', description: 'Increases shield strength', cost: 3500, effect: 10, icon: 'fas fa-atom' },
            { id: 'cargo', name: 'Expanded Cargo', description: 'Increases cargo capacity', cost: 1500, effect: 10, icon: 'fas fa-boxes' },
            { id: 'fuel', name: 'Fuel Tanks', description: 'Increases fuel capacity', cost: 1800, effect: 5, icon: 'fas fa-gas-pump' }
        ];
        
        this.loan = {
            amount: 0,
            dueDate: 0,
            interest: 0.1
        };
        
        this.contracts = [];
        this.encounters = [
            { type: 'pirate', name: 'Pirate Attack', weight: 30 },
            { type: 'police', name: 'Police Inspection', weight: 20 },
            { type: 'trader', name: 'Wandering Trader', weight: 15 },
            { type: 'debris', name: 'Space Debris Field', weight: 15 },
            { type: 'distress', name: 'Distress Signal', weight: 10 },
            { type: 'anomaly', name: 'Spatial Anomaly', weight: 10 }
        ];
        
        this.distanceTraveled = 0;
        this.systemsVisited = 1;
        this.gameOver = false;
        
        // Galaxy dimensions
        this.galaxyWidth = 0;
        this.galaxyHeight = 0;
        this.minDistance = 0;
        this.galaxyShape = 'balanced';
    }
    
    initGame(size, callback) {
        // Reset state
        this.credits = 10000;
        this.fuel = 15;
        this.maxFuel = 15;
        this.cargo = [];
        this.cargoCapacity = 50;
        this.ship = {
            x: 0,
            y: 0,
            targetX: 0,
            targetY: 0,
            traveling: false,
            travelProgress: 0,
            hull: 100,
            maxHull: 100,
            damage: 10,
            evasion: 15,
            shields: 20,
            engine: 1,
            rotation: 0
        };
        this.currentSystem = null;
        this.targetSystem = null;
        this.galaxy = [];
        this.galaxySize = size;
        this.totalDaysTraveled = 0;
        this.distanceTraveled = 0;
        this.systemsVisited = 1;
        this.gameOver = false;
        
        // Calculate galaxy dimensions
        this.calculateGalaxyDimensions();
        
        this.showLoadingScreen();
        setTimeout(() => {
            this.generateGalaxy();
            this.generateContracts();
            this.hideLoadingScreen();
            callback?.();
        }, 100);
    }
    
    calculateGalaxyDimensions() {
        switch(this.galaxyShape) {
            case 'wide':
                this.galaxyWidth = 800 + this.galaxySize;
                this.galaxyHeight = 400 + this.galaxySize * 0.3;
                break;
            case 'tall':
                this.galaxyWidth = 500 + this.galaxySize;
                this.galaxyHeight = 700 + this.galaxySize * 0.7;
                break;
            default: // balanced
                this.galaxyWidth = 600 + this.galaxySize;
                this.galaxyHeight = 500 + this.galaxySize * 0.5;
        }
        this.minDistance = 30 * Math.sqrt(40 / this.galaxySize);
    }
    
    showLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) loadingScreen.style.display = 'flex';
        this.updateLoadingProgress(0, "Initializing galaxy generation");
    }
    
    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) loadingScreen.style.display = 'none';
    }
    
    updateLoadingProgress(percent, message) {
        const progressBar = document.getElementById('progress-bar');
        const loadingText = document.getElementById('loading-text');
        if (progressBar) progressBar.style.width = percent + '%';
        if (loadingText) loadingText.textContent = message;
    }
    
    generateGalaxy() {
        this.galaxy = [];
        const names = new Set();
        const nameCount = this.galaxySize + CustomSystems.length;
        
        while (names.size < nameCount) {
            const name = generateSystemName();
            names.add(name);
        }
        
        const nameArray = Array.from(names);
        const points = this.generateSystemPositions();
        
        // Create custom systems first
        CustomSystems.forEach((customSystem, index) => {
            const system = {
                ...customSystem,
                id: index,
                name: nameArray[index],
                x: customSystem.x,
                y: customSystem.y,
                market: {},
                lastRestock: 0,
                daysSinceRestock: 0
            };
            this.generateMarket(system);
            this.galaxy.push(system);
        });
        
        // Create regular systems
        for (let i = CustomSystems.length; i < points.length && i < this.galaxySize; i++) {
            const point = points[i];
            const economy = this.selectWeightedEconomy();
            const profile = EconomyProfiles[economy];
        
            const system = {
                id: i,
                name: nameArray[i],
                x: point.x,
                y: point.y,
                economy: economy,
                techLevel: getWeightedRandom(this.techLevels, profile.techLevelWeights),
                security: getWeightedRandom(this.securityLevels, profile.securityLevelWeights),
                hasShipyard: Math.random() < profile.hasShipyardChance,
                hasRefuel: profile.hasRefuel,
                hasMarket: profile.hasMarket,
                hasSpecial: Math.random() < profile.hasSpecialChance,
                market: {},
                lastRestock: 0,
                daysSinceRestock: 0
            };
            
            if (system.hasMarket) {
                this.generateMarket(system);
            }
            
            this.galaxy.push(system);
            this.updateLoadingProgress(
                Math.round((i + 1) / this.galaxySize * 100),
                `Creating system: ${system.name}`
            );
        }
        
        this.setStartingSystem();
    }
    
    generateSystemPositions() {
        const points = [];
        const active = [];
        const width = this.galaxyWidth;
        const height = this.galaxyHeight;
        const minDist = this.minDistance;
        const maxAttempts = 30;
        
        // First point (center of galaxy)
        const firstPoint = {
            x: width/2 + (Math.random() - 0.5) * width * 0.2,
            y: height/2 + (Math.random() - 0.5) * height * 0.2
        };
        points.push(firstPoint);
        active.push(0);
        
        // Generate points using Poisson disk sampling
        while (active.length > 0 && points.length < this.galaxySize + CustomSystems.length) {
            const randIndex = Math.floor(Math.random() * active.length);
            const point = points[active[randIndex]];
            let found = false;
            
            for (let i = 0; i < maxAttempts; i++) {
                const angle = Math.random() * Math.PI * 2;
                const distance = minDist + Math.random() * minDist;
                const newPoint = {
                    x: point.x + Math.cos(angle) * distance,
                    y: point.y + Math.sin(angle) * distance
                };
                
                // Check boundaries
                if (newPoint.x < 100 || newPoint.x > width - 100 ||
                    newPoint.y < 100 || newPoint.y > height - 100) {
                    continue;
                }
                
                // Check distance to other points
                let valid = true;
                for (const p of points) {
                    const dx = p.x - newPoint.x;
                    const dy = p.y - newPoint.y;
                    if (Math.sqrt(dx*dx + dy*dy) < minDist) {
                        valid = false;
                        break;
                    }
                }
                
                if (valid) {
                    points.push(newPoint);
                    active.push(points.length - 1);
                    found = true;
                    break;
                }
            }
            
            if (!found) {
                active.splice(randIndex, 1);
            }
            
            // Update loading
            const percent = Math.round(points.length / (this.galaxySize + CustomSystems.length) * 100);
            this.updateLoadingProgress(percent, `Positioning systems: ${points.length}/${this.galaxySize}`);
        }
        
        return points;
    }
    
    selectWeightedEconomy() {
        const economies = Object.keys(EconomyProfiles).filter(e => e !== 'custom');
        const weights = economies.map(e => EconomyProfiles[e].weight);
        return getWeightedRandom(economies, weights);
    }
    generateMarket(system) {
        // Handle custom system market overrides
        if (system.economy === 'custom' && system.marketOverrides) {
            Object.entries(system.marketOverrides).forEach(([goodId, data]) => {
                system.market[goodId] = {
                    name: this.goods.find(g => g.id === goodId).name,
                    buyPrice: data.buyPrice,
                    sellPrice: data.sellPrice,
                    quantity: data.quantity,
                    maxQuantity: data.quantity
                };
            });
            return;
        }
        
        const profile = EconomyProfiles[system.economy];
        
        this.goods.forEach(good => {
            // Skip illegal goods in high-security systems
            if (good.illegal && system.security === 'high') {
                return;
            }
            
            // Apply economy-specific modifiers
            let baseModifier = 1;
            let quantityModifier = 1;
            
            if (profile.marketModifiers[good.id]) {
                baseModifier = profile.marketModifiers[good.id].baseModifier;
                quantityModifier = profile.marketModifiers[good.id].quantityMultiplier;
            } else if (good.production.includes(system.economy)) {
                baseModifier = 0.5 + Math.random() * 0.3;
                quantityModifier = 1.5;
            } else {
                baseModifier = 1.2 + Math.random() * 0.4;
                quantityModifier = 0.8;
            }
            
            // Tech level adjustments
            switch(system.techLevel) {
                case 'low': baseModifier *= 1.3; break;
                case 'high': baseModifier *= 0.9; break;
            }
            
            // Calculate price and quantity
            const rand = 0.8 + Math.random() * 0.4;
            const price = Math.round(good.basePrice * baseModifier * rand);
            
            let maxQuantity;
            switch(system.techLevel) {
                case 'low': maxQuantity = 40; break;
                case 'medium': maxQuantity = 80; break;
                case 'high': maxQuantity = 120; break;
                default: maxQuantity = 60;
            }
            
            let quantity = Math.round(
                maxQuantity * 
                (1 - (good.basePrice / 800)) * 
                quantityModifier
            );
            
            quantity = Math.max(5, Math.min(maxQuantity, quantity));
            
            system.market[good.id] = {
                name: good.name,
                buyPrice: price,
                sellPrice: Math.round(price * (0.7 + Math.random() * 0.3)),
                illegal: good.illegal,
                quantity: quantity,
                maxQuantity: maxQuantity
            };
        });
    }
    
    setStartingSystem() {
        if (this.galaxy.length > 0) {
            // Find a populated system to start in
            const populated = this.galaxy.filter(sys => 
                sys.economy !== 'unpopulated' && sys.economy !== 'custom'
            );
            
            this.currentSystem = populated.length > 0 
                ? populated[Math.floor(Math.random() * populated.length)]
                : this.galaxy[0];
                
            this.ship.x = this.currentSystem.x;
            this.ship.y = this.currentSystem.y;
        } else {
            console.error("Failed to generate galaxy - no systems created");
        }
    }
    /**
     * Generates a set of unique names for the systems.
     * @returns {Set<string>} A set of unique names.
     */
    generateUniqueNames() {
        const systemNames = [
            'Sol Prime', 'Proxima', 'Vega', 'Sirius', 'Arcturus', 'Betelgeuse', 'Rigel',
            'Endorsun', 'Orion', 'Pegasus', 'Cygnus', 'Lyra', 'Draco', 'Centaurus',
            'Aquila', 'Astrem', 'Orpheus', 'Sanctus', 'Tiberus', 'Nicta', 'Melocor',
            'Veviron', 'Babylon', 'Torgus', 'Harald', 'Svenus', 'Gion', 'Lectan',
            'Drouran', 'Zeta Centauri', 'Yota Centauri', 'Tauri', 'Ceti', 'Eridani',
            'Lacaille', 'Hercules', 'Perseus', 'Tucana', 'Phoenix'
        ];
        const prefixes = ['New', 'Old', 'Great', 'Little', 'Upper', 'Lower', 'East', 'West', 'North', 'South', 'Elder', 'Ancestor', 'High'];
        const suffixes = ['Prime', 'Secundus', 'Tertius', 'Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Psy', 'Jeta', 'Nigmus'];
        const nameParts = ['Vega', 'Sirius', 'Orion', 'Centauri', 'Andromeda', 'Persei', 'Cygni', 'Draconis', 'Lyrae', 'Aquilae', 'Pegasi', 'Tauri'];

        const names = new Set(systemNames);
        // Add custom system names to the set to ensure they are not duplicated
        systemProfiles.customSystems.forEach(s => names.add(s.name));

        while (names.size < this.galaxySize) {
            const pattern = Math.random();
            let nameCandidate;

            if (pattern < 0.3) {
                const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
                const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
                nameCandidate = `${prefix} ${suffix}`;
            } else if (pattern < 0.6) {
                const namePart = nameParts[Math.floor(Math.random() * nameParts.length)];
                const num = Math.floor(1000 + Math.random() * 9000);
                nameCandidate = `${namePart}-${num}`;
            } else {
                const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
                const namePart = nameParts[Math.floor(Math.random() * nameParts.length)];
                nameCandidate = `${prefix} ${namePart}`;
            }

            if (!names.has(nameCandidate)) {
                names.add(nameCandidate);
            }
        }
        return names;
    }

    /**
     * Generates system positions using Poisson Disk Sampling.
     * @returns {Array<object>} An array of {x, y} points.
     */
    generateSystemPositions() {
        let galaxyWidth, galaxyHeight;
        if (this.galaxyShape === 'wide') {
            galaxyWidth = 800 + this.galaxySize;
            galaxyHeight = 400 + this.galaxySize * 0.3;
        } else if (this.galaxyShape === 'tall') {
            galaxyWidth = 500 + this.galaxySize;
            galaxyHeight = 700 + this.galaxySize * 0.7;
        } else {
            galaxyWidth = 600 + this.galaxySize;
            galaxyHeight = 500 + this.galaxySize * 0.5;
        }

        const points = [];
        const active = [];
        const maxAttempts = 30;
        const firstPoint = {
            x: galaxyWidth / 2 + (Math.random() - 0.5) * galaxyWidth * 0.2,
            y: galaxyHeight / 2 + (Math.random() - 0.5) * galaxyHeight * 0.2
        };
        points.push(firstPoint);
        active.push(0);

        while (active.length > 0 && points.length < this.galaxySize) {
            const randIndex = Math.floor(Math.random() * active.length);
            const point = points[active[randIndex]];
            let found = false;
            for (let i = 0; i < maxAttempts; i++) {
                const angle = Math.random() * Math.PI * 2;
                const distance = this.minDistance + Math.random() * this.minDistance;
                const newPoint = {
                    x: point.x + Math.cos(angle) * distance,
                    y: point.y + Math.sin(angle) * distance
                };

                if (newPoint.x < 100 || newPoint.x > galaxyWidth - 100 || newPoint.y < 100 || newPoint.y > galaxyHeight - 100) {
                    continue;
                }

                let valid = true;
                for (const p of points) {
                    const dx = p.x - newPoint.x;
                    const dy = p.y - newPoint.y;
                    if (Math.sqrt(dx * dx + dy * dy) < this.minDistance) {
                        valid = false;
                        break;
                    }
                }

                if (valid) {
                    points.push(newPoint);
                    active.push(points.length - 1);
                    found = true;
                    break;
                }
            }
            if (!found) {
                active.splice(randIndex, 1);
            }
        }
        return points;
    }

    /**
     * Placeholder for updating a loading UI.
     * @param {number} percent - The percentage complete.
     * @param {string} message - The current status message.
     */
    updateLoadingProgress(percent, message) {
        // This should interact with your game's UI
        console.log(`Loading: ${percent}% - ${message}`);
    }

    // Restock system based on days traveled
    restockSystem(system) {
        const daysPassed = this.totalDaysTraveled - system.lastRestock;
        
        // Calculate partial restock (7-10 days)
        if (daysPassed >= this.restockIntervalMin && daysPassed < this.fullRestockIntervalMin) {
            this.goods.forEach(good => {
                if (system.market[good.id]) {
                    const maxQuantity = system.market[good.id].maxQuantity;
                    const currentQuantity = system.market[good.id].quantity;
                    // Restock to half of max
                    const targetQuantity = Math.floor(maxQuantity * 0.5);
                    if (currentQuantity < targetQuantity) {
                        system.market[good.id].quantity = Math.min(targetQuantity, currentQuantity + 5);
                    }
                }
            });
            system.lastRestock = this.totalDaysTraveled - (this.fullRestockIntervalMin - daysPassed - 1);
        } 
        // Calculate full restock (11-14 days)
        else if (daysPassed >= this.fullRestockIntervalMin) {
            this.goods.forEach(good => {
                if (system.market[good.id]) {
                    const maxQuantity = system.market[good.id].maxQuantity;
                    const currentQuantity = system.market[good.id].quantity;
                    // Restock to full
                    const targetQuantity = maxQuantity;
                    if (currentQuantity < targetQuantity) {
                        system.market[good.id].quantity = Math.min(targetQuantity, currentQuantity + 10);
                    }
                }
            });
            // Update last restock time
            system.lastRestock = this.totalDaysTraveled;
        }
        
        system.daysSinceRestock = daysPassed;
    }
    
    // Generate contracts
    generateContracts() {
        this.contracts = [];
        
        // Only generate contracts if we have systems
        if (this.galaxy.length === 0) {
            console.error("Cannot generate contracts - galaxy is empty");
            return;
        }
        
        // Pirate hunt contracts
        for (let i = 0; i < 3; i++) {
            const system = this.galaxy[Math.floor(Math.random() * this.galaxy.length)];
            const tier = 3 + Math.floor(Math.random() * 8);
            const reward = 500 + tier * 300;
            this.contracts.push({
                id: `hunt-${i}`,
                type: 'hunt',
                name: `Pirate Hunt in ${system.name}`,
                targetSystem: system,
                tier: tier,
                reward: reward,
                completed: false,
                description: `Eliminate a Tier ${tier} pirate operating in the ${system.name} system.`
            });
        }
        
        // Delivery contracts
        for (let i = 0; i < 2; i++) {
            const origin = this.galaxy[Math.floor(Math.random() * this.galaxy.length)];
            // Make sure destination is different from origin
            let destination;
            do {
                destination = this.galaxy[Math.floor(Math.random() * this.galaxy.length)];
            } while (destination === origin && this.galaxy.length > 1);
            
            const good = this.goods[Math.floor(Math.random() * this.goods.length)];
            const quantity = 5 + Math.floor(Math.random() * 10);
            const reward = good.basePrice * quantity * 1.5;
            
            this.contracts.push({
                id: `delivery-${i}`,
                type: 'delivery',
                name: `Deliver ${good.name} to ${destination.name}`,
                originSystem: origin,
                targetSystem: destination,
                good: good.id,
                quantity: quantity,
                reward: reward,
                completed: false,
                description: `Pick up ${quantity} units of ${good.name} in ${origin.name} and deliver to ${destination.name}.`
            });
        }
    }
    
    // Calculate distance between systems (in LY)
    calculateDistance(systemA, systemB) {
        const dx = systemB.x - systemA.x;
        const dy = systemB.y - systemA.y;
        return Math.sqrt(dx * dx + dy * dy) / 15;
    }
    
    // Travel to target system
    travelToSystem() {
        if (!this.targetSystem || this.targetSystem === this.currentSystem) {
            return { success: false, message: 'Select a system to travel to!' };
        }
        
        const distance = this.calculateDistance(this.currentSystem, this.targetSystem);
        const fuelCost = Math.ceil(distance);
        
        if (this.fuel < fuelCost) {
            return { success: false, message: 'Not enough fuel!' };
        }
        
        // Deduct fuel
        this.fuel -= fuelCost;
        
        // Update game state for travel
        this.ship.traveling = true;
        this.ship.travelProgress = 0;
        this.ship.x = this.currentSystem.x; // Set ship's starting X
        this.ship.y = this.currentSystem.y; // Set ship's starting Y
        this.ship.targetX = this.targetSystem.x;
        this.ship.targetY = this.targetSystem.y;
        
        // Calculate rotation angle for ship
        const dx = this.ship.targetX - this.ship.x;
        const dy = this.ship.targetY - this.ship.y;
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        this.ship.rotation = angle;
        
        return { 
            success: true, 
            message: `Traveling to ${this.targetSystem.name}...`,
            distance: distance,
            fuelCost: fuelCost
        };
    }
    
    completeTravel() {
        this.ship.traveling = false;
        this.currentSystem = this.targetSystem;
        this.targetSystem = null;
        
        // Add days traveled to total
        const distance = this.calculateDistance(
            {x: this.ship.x, y: this.ship.y}, 
            {x: this.ship.targetX, y: this.ship.targetY}
        );
        this.totalDaysTraveled += Math.round(distance);
        this.distanceTraveled += distance;
        this.systemsVisited++;
        
        // Restock current system
        this.restockSystem(this.currentSystem);
        
        // No need to reset mapOffsetX/Y, camera handles positioning
        
        return { success: true, message: `Arrived at ${this.currentSystem.name}` };
    }
    
    // Refuel ship
// Refuel ship
    refuelShip() {
        if (!this.currentSystem.hasRefuel) {
            return { success: false, message: 'No refueling facilities available!' };
        }
    
        const fuelNeeded = this.maxFuel - this.fuel;
        if (fuelNeeded <= 0) {
            return { success: false, message: 'Fuel tank full!' };
        }
    
        // Default cost per unit if no market exists
        let costPerUnit = 15;
    
        // Check if the current system has a market and a price for 'fuel'
        if (this.currentSystem.hasMarket && this.currentSystem.market['fuel']) {
            costPerUnit = this.currentSystem.market['fuel'].buyPrice;
        } else {
            // Fallback to tech-level based price if no market data
            switch(this.currentSystem.techLevel) {
                case 'high': costPerUnit = 10; break;
                case 'medium': costPerUnit = 15; break;
                case 'low': costPerUnit = 20; break;
                default: costPerUnit = 15;
            }
        }
    
        const totalCost = fuelNeeded * costPerUnit;
        if (this.credits < totalCost) {
            return { success: false, message: `Need ${totalCost} CR` };
        }
    
        this.credits -= totalCost;
        this.fuel = this.maxFuel;
        return { 
            success: true, 
            message: `Refueled to ${this.maxFuel} units`,
            cost: totalCost
        };
    }
    
    // Handle trade actions (buy/sell)
    tradeItem(goodId, action) {
        if (!this.currentSystem.hasMarket) {
            return { success: false, message: 'No marketplace available!' };
        }
        const marketItem = this.currentSystem.market[goodId];
        
        if (action === 'buy') {
            // Check if player has enough credits
            if (this.credits < marketItem.buyPrice) {
                return { success: false, message: 'Not enough credits!' };
            }
            
            // Check if item is in stock
            if (marketItem.quantity <= 0) {
                return { success: false, message: 'Item out of stock!' };
            }
            
            // Check cargo space
            const cargoSpace = this.cargo.reduce((sum, item) => sum + item.quantity, 0);
            if (cargoSpace >= this.cargoCapacity) {
                return { success: false, message: 'Cargo hold full!' };
            }
            
            // Process transaction
            this.credits -= marketItem.buyPrice;
            marketItem.quantity--; // Reduce stock
            
            // Add to cargo
            const existingItem = this.cargo.find(item => item.id === goodId);
            if (existingItem) {
                existingItem.quantity++;
            } else {
                this.cargo.push({
                    id: goodId,
                    name: marketItem.name,
                    quantity: 1,
                    buyPrice: marketItem.buyPrice,
                    illegal: marketItem.illegal
                });
            }
            
            return { 
                success: true, 
                message: `Purchased 1 ${marketItem.name}`,
                cost: marketItem.buyPrice
            };
        } 
        else if (action === 'sell' || action === 'sell-one') {
            // Find the cargo item
            const cargoItem = this.cargo.find(item => item.id === goodId);
            if (!cargoItem || cargoItem.quantity < 1) {
                return { success: false, message: 'Not enough in cargo!' };
            }
            
            // Process transaction
            this.credits += marketItem.sellPrice;
            cargoItem.quantity--;
            
            // Remove if quantity is 0
            if (cargoItem.quantity === 0) {
                this.cargo = this.cargo.filter(item => item.id !== goodId);
            }
            
            return { 
                success: true, 
                message: `Sold 1 ${marketItem.name}`,
                revenue: marketItem.sellPrice
            };
        }
        
        return { success: false, message: 'Invalid trade action' };
    }
    
    // Handle ship upgrades
    upgradeShip(upgradeId) {
        const upgrade = this.upgrades.find(u => u.id === upgradeId);
        
        if (this.credits < upgrade.cost) {
            return { success: false, message: `Need ${upgrade.cost} CR` };
        }
        
        this.credits -= upgrade.cost;
        
        switch(upgradeId) {
            case 'hull':
                this.ship.maxHull += upgrade.effect;
                this.ship.hull = this.ship.maxHull;
                return { 
                    success: true, 
                    message: `Hull upgraded to ${this.ship.maxHull}%`
                };
            case 'weapons':
                this.ship.damage += upgrade.effect;
                return { 
                    success: true, 
                    message: `Weapon damage increased!`
                };
            case 'engine':
                this.ship.evasion += upgrade.effect;
                return { 
                    success: true, 
                    message: `Evasion increased!`
                };
            case 'shields':
                this.ship.shields += upgrade.effect;
                return { 
                    success: true, 
                    message: `Shields upgraded!`
                };
            case 'cargo':
                this.cargoCapacity += upgrade.effect;
                return { 
                    success: true, 
                    message: `Cargo capacity increased!`
                };
            case 'fuel':
                this.maxFuel += upgrade.effect;
                this.fuel = this.maxFuel;
                return { 
                    success: true, 
                    message: `Fuel capacity increased to ${this.maxFuel}!`
                };
        }
        
        return { success: false, message: 'Invalid upgrade' };
    }
    
    // Handle contract actions
    handleContract(contractId) {
        const contract = this.contracts.find(c => c.id === contractId);
        if (!contract) return { success: false, message: 'Contract not found' };
        
        if (contract.type === 'hunt') {
            // Set target system for pirate hunt
            this.targetSystem = contract.targetSystem;
            return { 
                success: true, 
                message: `Heading to ${contract.targetSystem.name} for pirate hunt.`
            };
        } else if (contract.type === 'delivery') {
            if (contract.originSystem === this.currentSystem) {
                // Pick up goods
                // Check if cargo space is available
                const cargoSpace = this.cargo.reduce((sum, item) => sum + item.quantity, 0);
                if (cargoSpace + contract.quantity > this.cargoCapacity) {
                    return { 
                        success: false, 
                        message: "Not enough cargo space for contract goods!" 
                    };
                }
                
                // Add goods to cargo
                const existingItem = this.cargo.find(item => item.id === contract.good);
                if (existingItem) {
                    existingItem.quantity += contract.quantity;
                } else {
                    const good = this.goods.find(g => g.id === contract.good);
                    this.cargo.push({
                        id: contract.good,
                        name: good.name,
                        quantity: contract.quantity,
                        buyPrice: 0,
                        illegal: good.illegal,
                        contractId: contract.id
                    });
                }
                
                return { 
                    success: true, 
                    message: `Picked up ${contract.quantity} units of ${good.name} for delivery.`
                };
            } else if (contract.targetSystem === this.currentSystem) {
                // Deliver goods
                const cargoItem = this.cargo.find(item => item.id === contract.good && item.contractId === contract.id);
                if (!cargoItem || cargoItem.quantity < contract.quantity) {
                    return { 
                        success: false, 
                        message: "You don't have the contract goods!" 
                    };
                }
                
                // Complete delivery
                cargoItem.quantity -= contract.quantity;
                if (cargoItem.quantity === 0) {
                    this.cargo = this.cargo.filter(item => item.id !== contract.good || item.quantity > 0);
                }
                
                this.credits += contract.reward;
                contract.completed = true;
                return { 
                    success: true, 
                    message: `Contract completed! Received ${contract.reward} CR.`,
                    reward: contract.reward
                };
            }
        }
        
        return { success: false, message: 'Invalid contract action' };
    }
    
    // Check if game is over
    checkGameOver() {
        if (this.ship.hull <= 0) {
            this.gameOver = true;
            return true;
        }
        return false;
    }
    
    // Handle damage to ship
    takeDamage(amount) {
        this.ship.hull -= amount;
        this.ship.hull = Math.max(0, this.ship.hull);
        return this.checkGameOver();
    }
}
