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
            // Removed mapOffsetX and mapOffsetY as camera handles this
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
        this.economyTypes = ['agricultural', 'industrial', 'tech', 'mining', 'trade', 'military'];
        this.techLevels = ['low', 'medium', 'high'];
        this.securityLevels = ['low', 'medium', 'high'];
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
        
        // New properties for galaxy dimensions and shape
        this.galaxyWidth = 0;
        this.galaxyHeight = 0;
        this.minDistance = 0;
        this.galaxyShape = 'balanced'; // Default shape
    }
    
    initGame(size, callback) {
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
            // Removed mapOffsetX and mapOffsetY
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
        
        // Calculate galaxy dimensions based on size
        this.galaxyWidth = 600 + size;
        this.galaxyHeight = 400 + size * 0.5;
        
        // Adjust minimum distance between systems
        this.minDistance = 30 * Math.sqrt(40 / size); // Scale distance based on galaxy size
        
        this.showLoadingScreen();
        // Use a timeout to allow the loading screen to render
        setTimeout(() => {
            this.generateGalaxy();
            this.generateContracts();
            this.hideLoadingScreen();
            
            // Call the callback if provided
            if (callback && typeof callback === 'function') {
                callback();
            }
        }, 100);
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
    
    // Updated generateGalaxy method
    generateGalaxy() {
        this.galaxy = [];
        const systemNames = [
            'Sol Prime', 'Alpha Centauri', 'Proxima', 'Vega', 'Sirius', 'Arcturus',
            'Betelgeuse', 'Rigel', 'Endorsun', 'Orion', 'Pegasus', 'Cygnus', 'Lyra',
            'Draco', 'Centaurus', 'Aquila', 'Astrem', 'Orpheus', 'Sanctus', 'Tiberus',
            'Nicta', 'Melocor', 'Veviron', 'Babylon', 'Torgus', 'Harald', 'Svenus',
            'Gion', 'Lectan', 'Drouran', 'Zeta Centauri', 'Yota Centauri', 'Tauri',
            'Ceti', 'Eridani', 'Lacaille', 'Hercules', 'Perseus', 'Tucana', 'Phoenix'
        ];
        
        // Improved name generation with prefix/suffix combinations
        const prefixes = ['New', 'Old', 'Great', 'Little', 'Upper', 'Lower', 'East',
                         'West', 'North', 'South', 'Elder', 'Ancestor', 'High'];
        const suffixes = ['Prime', 'Secundus', 'Tertius', 'Quartus', 'Quintus', 'Alpha',
                          'Beta', 'Gamma', 'Delta', 'Epsilon', 'Psy', 'Jeta', 'Nigmus'];
        const nameParts = ['Vega', 'Sirius', 'Orion', 'Centauri', 'Andromeda', 'Persei',
                           'Cygni', 'Draconis', 'Lyrae', 'Aquilae', 'Pegasi', 'Tauri'];
        
        // Generate unique system names
        const names = new Set(systemNames);
        
        // Create unique names for remaining systems
        while (names.size < this.galaxySize) {
            const pattern = Math.random();
            let nameCandidate;
            
            if (pattern < 0.3) {
                // Prefix + Suffix pattern
                const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
                const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
                nameCandidate = `${prefix} ${suffix}`;
            } else if (pattern < 0.6) {
                // NamePart + Number pattern
                const namePart = nameParts[Math.floor(Math.random() * nameParts.length)];
                const num = Math.floor(1000 + Math.random() * 9000);
                nameCandidate = `${namePart} ${num}`;
            } else {
                // Prefix + NamePart pattern
                const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
                const namePart = nameParts[Math.floor(Math.random() * nameParts.length)];
                nameCandidate = `${prefix} ${namePart}`;
            }
            
            if (!names.has(nameCandidate)) {
                names.add(nameCandidate);
            }
        }
        
        const nameArray = Array.from(names);
        
        // Adjust dimensions based on selected shape
        if (this.galaxyShape === 'wide') {
            this.galaxyWidth = 800 + this.galaxySize;
            this.galaxyHeight = 400 + this.galaxySize * 0.3;
        } else if (this.galaxyShape === 'tall') {
            this.galaxyWidth = 500 + this.galaxySize;
            this.galaxyHeight = 700 + this.galaxySize * 0.7;
        } else {
            // Balanced (default)
            this.galaxyWidth = 600 + this.galaxySize;
            this.galaxyHeight = 500 + this.galaxySize * 0.5;
        }

        // Create systems with minimum distance using Poisson disk sampling
        const points = [];
        const active = [];
        const width = this.galaxyWidth;
        const height = this.galaxyHeight;
        const minDist = this.minDistance;
        const maxAttempts = 30;
        
        // First point
        const firstPoint = {
            x: width/2 + (Math.random() - 0.5) * width * 0.2,
            y: height/2 + (Math.random() - 0.5) * height * 0.2
        };
        points.push(firstPoint);
        active.push(0);
        
        // Generate other points
        while (active.length > 0 && points.length < this.galaxySize) {
            const randIndex = Math.floor(Math.random() * active.length);
            const point = points[active[randIndex]];
            let found = false;
            
            for (let i = 0; i < maxAttempts; i++) {
                // Generate point in annular region around existing point
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
            
            // Update loading progress
            const percent = Math.round(points.length / this.galaxySize * 100);
            this.updateLoadingProgress(percent, `Creating system: ${points.length}/${this.galaxySize}`);
        }
        
        // Create systems at generated points
        for (let i = 0; i < points.length && i < this.galaxySize; i++) {
            const point = points[i];
            const economy = this.economyTypes[Math.floor(Math.random() * this.economyTypes.length)];
            const techLevel = this.techLevels[Math.floor(Math.random() * this.techLevels.length)];
            const security = this.securityLevels[Math.floor(Math.random() * this.securityLevels.length)];
            
            const system = {
                id: i,
                name: nameArray[i],
                x: point.x,
                y: point.y,
                economy: economy,
                techLevel: techLevel,
                security: security,
                market: {},
                hasShipyard: Math.random() > 0.7,
                lastRestock: 0,
                daysSinceRestock: 0
            };
            
            // Generate market prices (existing code)
            this.goods.forEach(good => {
                // Base price modifier based on production
                let baseModifier = 1;
                if (good.production.includes(economy)) {
                    baseModifier = 0.5 + Math.random() * 0.3;
                } else {
                    baseModifier = 1.2 + Math.random() * 0.4;
                }
                
                // Adjust for tech level
                if (techLevel === 'low') baseModifier *= 1.3;
                if (techLevel === 'high') baseModifier *= 0.9;
                
                // Random volatility
                const rand = 0.8 + Math.random() * 0.4;
                const price = Math.round(good.basePrice * baseModifier * rand);
                
                // Calculate quantity based on tech level and base price
                let maxQuantity;
                switch(techLevel) {
                    case 'low': maxQuantity = 40; break;
                    case 'medium': maxQuantity = 80; break;
                    case 'high': maxQuantity = 120; break;
                    default: maxQuantity = 60;
                }
                
                // Higher quantity for lower price items
                const highestBasePrice = 800; // Highest base price in the game
                let quantity = Math.round(maxQuantity * (1 - (good.basePrice / highestBasePrice)));
                
                // Add bonus for matching economy type (50% more)
                if (good.production.includes(economy)) {
                    quantity = Math.round(quantity * 1.5);
                }
                
                // Ensure quantity is within reasonable bounds
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
            
            this.galaxy.push(system);
            
            // Update progress
            const percent = Math.round((i + 1) / this.galaxySize * 100);
            this.updateLoadingProgress(percent, `Creating system: ${system.name}`);
        }
        
        // Set starting system only if we have systems
        if (this.galaxy.length > 0) {
            this.currentSystem = this.galaxy[Math.floor(Math.random() * this.galaxy.length)];
            this.ship.x = this.currentSystem.x;
            this.ship.y = this.currentSystem.y;
        } else {
            console.error("Failed to generate galaxy - no systems created");
        }
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
    refuelShip() {
        const fuelNeeded = this.maxFuel - this.fuel;
        if (fuelNeeded <= 0) {
            return { success: false, message: 'Fuel tank full!' };
        }
        
        // Cost per unit based on tech level
        let costPerUnit;
        switch(this.currentSystem.techLevel) {
            case 'high': costPerUnit = 10; break;
            case 'medium': costPerUnit = 15; break;
            case 'low': costPerUnit = 20; break;
            default: costPerUnit = 15;
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
