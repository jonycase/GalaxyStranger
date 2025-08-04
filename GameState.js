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
            mapOffsetX: 0,
            mapOffsetY: 0,
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
    }
    
    initGame(size, callback) {
        this.galaxySize = size;
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
    
    // Generate galaxy with star systems
    generateGalaxy() {
        this.galaxy = [];
        const systemNames = [
            'Sol Prime', 'Alpha Centauri', 'Proxima', 'Vega', 'Sirius', 'Arcturus', 'Betelgeuse', 'Rigel',
            'Andromeda', 'Orion', 'Pegasus', 'Cygnus', 'Lyra', 'Draco', 'Centaurus', 'Aquila',
            'Tauri', 'Ceti', 'Eridani', 'Lacaille', 'Hercules', 'Perseus', 'Tucana', 'Phoenix'
        ];
        const prefixes = ['New', 'Old', 'Great', 'Little', 'Upper', 'Lower', 'East', 'West', 'North', 'South'];
        const suffixes = ['Prime', 'Secundus', 'Tertius', 'Quartus', 'Quintus', 'Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon'];
        
        // Generate unique system names
        const names = new Set();
        let nameCount = 0;
        
        // Use fixed names first
        for (let i = 0; i < systemNames.length && names.size < this.galaxySize; i++) {
            names.add(systemNames[i]);
            nameCount++;
        }
        
        // Generate unique names for remaining systems
        while (names.size < this.galaxySize) {
            const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
            const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
            const num = Math.floor(1000 + Math.random() * 9000);
            const nameCandidate = `${prefix} ${suffix} ${num}`;
            if (!names.has(nameCandidate)) {
                names.add(nameCandidate);
                nameCount++;
            }
        }
        
        // Create systems with minimum distance
        const nameArray = Array.from(names);
        const minDistance = 30;
        let i = 0;
        
        // Ensure we don't try to create more systems than we have names
        const totalSystems = Math.min(this.galaxySize, nameArray.length);
        
        for (i = 0; i < totalSystems; i++) {
            let validPosition = false;
            let x, y;
            let attempts = 0;
            while (!validPosition && attempts < 100) {
                x = 100 + Math.random() * 600;
                y = 100 + Math.random() * 400;
                validPosition = true;
                
                // Check distance to existing systems
                for (const system of this.galaxy) {
                    const dx = system.x - x;
                    const dy = system.y - y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    if (distance < minDistance) {
                        validPosition = false;
                        break;
                    }
                }
                attempts++;
            }
            
            // If we couldn't find a valid position, skip this system
            if (!validPosition) {
                continue;
            }
            
            const economy = this.economyTypes[Math.floor(Math.random() * this.economyTypes.length)];
            const techLevel = this.techLevels[Math.floor(Math.random() * this.techLevels.length)];
            const security = this.securityLevels[Math.floor(Math.random() * this.securityLevels.length)];
            
            const system = {
                id: i,
                name: nameArray[i],
                x: x,
                y: y,
                economy: economy,
                techLevel: techLevel,
                security: security,
                market: {},
                hasShipyard: Math.random() > 0.7,
                lastRestock: 0,
                daysSinceRestock: 0
            };
            
            // Generate market prices based on production type
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
                
                // Calculate quantity based on production
                let baseQuantity = 20;
                if (good.production.includes(economy)) {
                    baseQuantity = 30 + Math.floor(Math.random() * 20);
                } else {
                    baseQuantity = 10 + Math.floor(Math.random() * 15);
                }
                
                system.market[good.id] = {
                    name: good.name,
                    buyPrice: price,
                    sellPrice: Math.round(price * (0.7 + Math.random() * 0.3)),
                    illegal: good.illegal,
                    quantity: baseQuantity,
                    maxQuantity: baseQuantity * 2
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
        this.ship.x = this.currentSystem.x;
        this.ship.y = this.currentSystem.y;
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
        
        // Restock current system
        this.restockSystem(this.currentSystem);
        
        // Reset map position
        this.ship.mapOffsetX = 0;
        this.ship.mapOffsetY = 0;
        
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
}