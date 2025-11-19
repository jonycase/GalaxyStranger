import { 
    EconomyProfiles, 
    CustomSystems, 
    getWeightedRandom, 
    generateSystemName,
    generatePosition
} from './SystemGen.js';

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
            rotation: 0,
            radar: 0
        };

        this.currentSystem = null;
        this.targetSystem = null;
        this.galaxy = [];
        this.galaxySize = 200;
        this.galaxyWidth = 800;
        this.galaxyHeight = 500;
        this.galaxyShape = 'balanced';
        this.minDistance = 30;

        this.totalDaysTraveled = 0;
        this.distanceTraveled = 0;
        this.systemsVisited = 0;
        this.restockIntervalMin = 7;
        this.restockIntervalMax = 10;
        this.fullRestockIntervalMin = 11;
        this.fullRestockIntervalMax = 14;
        this.bounty = 0;
        this.contracts = [];
        this.upgrades = [];
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
            { id: 'hull', name: 'Reinforced Hull', description: 'Increases hull strength', cost: 5000, effect: 10, icon: 'fas fa-shield-alt' },
            { id: 'weapons', name: 'Plasma Cannons', description: 'Increases weapon damage', cost: 3500, effect: 5, icon: 'fas fa-gem' },
            { id: 'engine', name: 'Quantum Engine', description: 'Increases evasion chance', cost: 2500, effect: 5, icon: 'fas fa-tachometer-alt' },
            { id: 'shields', name: 'Deflector Shields', description: 'Increases shield strength', cost: 3500, effect: 10, icon: 'fas fa-atom' },
            { id: 'cargo', name: 'Expanded Cargo', description: 'Increases cargo capacity', cost: 2500, effect: 10, icon: 'fas fa-boxes' },
            { id: 'fuel', name: 'Fuel Tanks', description: 'Increases fuel capacity', cost: 2500, effect: 5, icon: 'fas fa-gas-pump' },
            { id: 'radar', name: 'Long-Range Radar', description: 'Allows scanning nearby systems', cost: 5000, effect: 15, icon: 'fas fa-satellite' }
        ];
        
        this.encounters = [
            { type: 'pirate', name: 'Pirate Attack', weight: 30 },
            { type: 'police', name: 'Police Inspection', weight: 30 },
            { type: 'trader', name: 'Wandering Trader', weight: 10 },
            { type: 'debris', name: 'Space Debris Field', weight: 15 },
            { type: 'distress', name: 'Distress Signal', weight: 10 },
            { type: 'anomaly', name: 'Spatial Anomaly', weight: 10 }
        ];
        
        this.distanceTraveled = 0;
        this.systemsVisited = 1;
        this.gameOver = false;
    }

    initGame(size, callback) {
        this.galaxySize = size;
        this.calculateGalaxyDimensions();
        this.showLoadingScreen();

        setTimeout(async () => {
            await this.generateGalaxy();
            this.generateContracts();
            this.hideLoadingScreen();
            callback?.();
        }, 80);
    }

    calculateGalaxyDimensions() {
        switch (this.galaxyShape) {
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
        this.minDistance = 30 * Math.sqrt(40 / Math.max(40, this.galaxySize));
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

    async generateGalaxy() {
        this.galaxy = [];
        const names = new Set(CustomSystems.map(sys => sys.name));
        const nameCount = this.galaxySize + CustomSystems.length;

        while (names.size < nameCount) {
            names.add(generateSystemName());
        }
        const nameArray = Array.from(names);

        const points = [];
        const minDist = this.minDistance;

        CustomSystems.forEach((customSystem, idx) => {
            const pos = {
                x: (typeof customSystem.x === 'number') ? customSystem.x : Math.random() * this.galaxyWidth,
                y: (typeof customSystem.y === 'number') ? customSystem.y : Math.random() * this.galaxyHeight
            };
            const sys = {
                ...customSystem,
                id: idx,
                name: customSystem.name,
                x: pos.x,
                y: pos.y,
                market: {},
                lastRestock: 0,
                daysSinceRestock: 0,
                discovered: true
            };
            this.generateMarket(sys);
            points.push({ x: sys.x, y: sys.y });
            this.galaxy.push(sys);
        });

        const totalToCreate = Math.max(0, this.galaxySize - CustomSystems.length);
        const chunkSize = Math.max(20, Math.floor(totalToCreate / 40));
        let created = 0;
        let nextId = CustomSystems.length;

        while (created < totalToCreate) {
            const end = Math.min(created + chunkSize, totalToCreate);
            for (let c = created; c < end; c++, nextId++) {
                const position = generatePosition(this.galaxyWidth, this.galaxyHeight, minDist, points);
                const economy = this.selectWeightedEconomy();
                const profile = EconomyProfiles[economy] || {};

                const system = {
                    id: nextId,
                    name: nameArray[nextId] || `System-${nextId}`,
                    x: position.x,
                    y: position.y,
                    economy: economy,
                    techLevel: this.pickWeighted(profile.techLevelWeights, ['none', 'low', 'medium', 'high']),
                    security: this.pickWeighted(profile.securityLevelWeights, ['none', 'low', 'medium', 'high']),
                    hasShipyard: Math.random() < (profile.hasShipyardChance || 0),
                    hasRefuel: !!profile.hasRefuel,
                    hasMarket: !!profile.hasMarket,
                    hasSpecial: Math.random() < 0.2,
                    market: {},
                    lastRestock: 0,
                    daysSinceRestock: 0,
                    discovered: false
                };

                if (system.hasMarket) this.generateMarket(system);
                points.push({ x: system.x, y: system.y });
                this.galaxy.push(system);

                if ((nextId - CustomSystems.length) % Math.max(1, Math.floor(chunkSize / 2)) === 0) {
                    const pct = Math.round((nextId + 1) / this.galaxySize * 100);
                    this.updateLoadingProgress(pct, `Creating system: ${system.name}`);
                }
            }

            created = end;
            await new Promise(resolve => setTimeout(resolve, 10));
        }

        this.setStartingSystem();
        this.updateLoadingProgress(100, "Galaxy generation complete");
    }

    selectWeightedEconomy() {
        const keys = Object.keys(EconomyProfiles);
        const weights = keys.map(k => EconomyProfiles[k].weight || 0);
        const chosen = getWeightedRandom(keys, weights);
        return chosen || keys[0];
    }

    pickWeighted(weights = [], values = []) {
        if (!weights || weights.length === 0) return values[0] || null;
        const total = weights.reduce((s, w) => s + w, 0);
        let r = Math.random() * total;
        for (let i = 0; i < weights.length; i++) {
            if (r < weights[i]) return values[i] || values[0];
            r -= weights[i];
        }
        return values[0] || null;
    }

    generateMarket(system) {
        if (system.economy === 'custom' && system.marketOverrides) {
            Object.entries(system.marketOverrides).forEach(([goodId, data]) => {
                const good = this.goods.find(g => g.id === goodId);
                if (good) {
                    system.market[goodId] = {
                        name: good.name,
                        buyPrice: data.buyPrice,
                        sellPrice: data.sellPrice,
                        illegal: good.illegal,
                        quantity: data.quantity,
                        maxQuantity: data.quantity
                    };
                }
            });
            return;
        }
        
        const profile = EconomyProfiles[system.economy];
        if (!profile || !profile.hasMarket) return;
        
        this.goods.forEach(good => {
            if (good.illegal && system.security === 'high') return;
            
            let baseModifier = 1;
            let quantityModifier = 1;
            
            if (profile.marketModifiers?.[good.id]) {
                baseModifier = profile.marketModifiers[good.id].baseModifier;
                quantityModifier = profile.marketModifiers[good.id].quantityMultiplier;
            } else if (good.production.includes(system.economy)) {
                baseModifier = 0.5 + Math.random() * 0.3;
                quantityModifier = 1.5;
            } else {
                baseModifier = 1.2 + Math.random() * 0.4;
                quantityModifier = 0.8;
            }
            
            switch(system.techLevel) {
                case 'low': baseModifier *= 1.3; break;
                case 'high': baseModifier *= 0.9; break;
            }
            
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
        if (this.galaxy.length === 0) return;
        const populated = this.galaxy.filter(sys => 
            sys.economy !== 'unpopulated' && sys.economy !== 'custom'
        );
        
        this.currentSystem = populated.length > 0 
            ? populated[Math.floor(Math.random() * populated.length)]
            : this.galaxy[0];
            
        this.ship.x = this.currentSystem.x;
        this.ship.y = this.currentSystem.y;
    }

    calculateDistance(systemA, systemB) {
        if (!systemA || !systemB) return 0;
        const dx = systemB.x - systemA.x;
        const dy = systemB.y - systemA.y;
        return Math.sqrt(dx * dx + dy * dy) / 15;
    }

    travelToSystem() {
        if (!this.targetSystem || this.targetSystem === this.currentSystem) {
            return { success: false, message: 'Select a system to travel to!' };
        }
        
        const distance = this.calculateDistance(this.currentSystem, this.targetSystem);
        const fuelCost = Math.ceil(distance);
        
        if (this.fuel < fuelCost) {
            return { success: false, message: 'Not enough fuel!' };
        }
        
        this.fuel -= fuelCost;
        
        this.ship.traveling = true;
        this.ship.travelProgress = 0;
        this.ship.x = this.currentSystem.x;
        this.ship.y = this.currentSystem.y;
        this.ship.targetX = this.targetSystem.x;
        this.ship.targetY = this.targetSystem.y;
        
        // Update ship rotation for HUD
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
        
        if (!this.currentSystem.discovered) {
            this.currentSystem.discovered = true;
        }
        
        const distance = this.calculateDistance(
            {x: this.ship.x, y: this.ship.y}, 
            {x: this.ship.targetX, y: this.ship.targetY}
        );
        this.totalDaysTraveled += Math.round(distance);
        this.distanceTraveled += distance;
        this.systemsVisited++;
        
        this.restockSystem(this.currentSystem);
        
        return { success: true, message: `Arrived at ${this.currentSystem.name}` };
    }
    
    scanNearbySystems() {
        if (this.ship.radar === 0) {
            return { success: false, message: "You need radar to scan systems!" };
        }
        const baseCost = 25;
        const baseRadius = 15;
        const cost = Math.max(5, baseCost - this.ship.radar);
        const radius = baseRadius + (5 * this.ship.radar);

        if (this.fuel < cost) {
            return { success: false, message: `Not enough fuel! Need ${cost} units.` };
        }
        
        this.fuel -= cost;
        
        let discoveredCount = 0;
        this.galaxy.forEach(system => {
            if (system === this.currentSystem) return;
            
            const distance = this.calculateDistance(this.currentSystem, system);
            if (distance <= radius && !system.discovered) {
                system.discovered = true;
                discoveredCount++;
            }
        });
        
        return { 
            success: true, 
            message: `Discovered ${discoveredCount} systems within ${radius} LY!`,
            discoveredCount
        };
    }
    
    refuelShip() {
        if (!this.currentSystem.hasRefuel) {
            return { success: false, message: 'No refueling facilities available!' };
        }
    
        const fuelNeeded = this.maxFuel - this.fuel;
        if (fuelNeeded <= 0) {
            return { success: false, message: 'Fuel tank full!' };
        }
    
        let costPerUnit = 15;
        if (this.currentSystem.hasMarket && this.currentSystem.market['fuel']) {
            costPerUnit = this.currentSystem.market['fuel'].buyPrice;
        } else {
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
    
    tradeItem(goodId, action) {
        if (!this.currentSystem.hasMarket) {
            return { success: false, message: 'No marketplace available!' };
        }
        const marketItem = this.currentSystem.market[goodId];
        if (!marketItem) return { success: false, message: 'Item not traded here' };
        
        if (action === 'buy') {
            if (this.credits < marketItem.buyPrice) {
                return { success: false, message: 'Not enough credits!' };
            }
            if (marketItem.quantity <= 0) {
                return { success: false, message: 'Item out of stock!' };
            }
            const cargoSpace = this.cargo.reduce((sum, item) => sum + item.quantity, 0);
            if (cargoSpace >= this.cargoCapacity) {
                return { success: false, message: 'Cargo hold full!' };
            }
            
            this.credits -= marketItem.buyPrice;
            marketItem.quantity--;
            
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
            const cargoItem = this.cargo.find(item => item.id === goodId);
            if (!cargoItem || cargoItem.quantity < 1) {
                return { success: false, message: 'Not enough in cargo!' };
            }
            
            this.credits += marketItem.sellPrice;
            cargoItem.quantity--;
            
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
            case 'radar':
                this.ship.radar += 1;
                return { 
                    success: true, 
                    message: `Radar upgraded to level ${this.ship.radar}!`
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
    
    handleContract(contractId) {
        const contract = this.contracts.find(c => c.id === contractId);
        if (!contract) return { success: false, message: 'Contract not found' };
        
        if (contract.type === 'hunt') {
            this.targetSystem = contract.targetSystem;
            return { 
                success: true, 
                message: `Heading to ${contract.targetSystem.name} for pirate hunt.`
            };
        } else if (contract.type === 'delivery') {
            if (contract.originSystem === this.currentSystem) {
                const cargoSpace = this.cargo.reduce((sum, item) => sum + item.quantity, 0);
                if (cargoSpace + contract.quantity > this.cargoCapacity) {
                    return { 
                        success: false, 
                        message: "Not enough cargo space for contract goods!" 
                    };
                }
                
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
                const cargoItem = this.cargo.find(item => item.id === contract.good && item.contractId === contract.id);
                if (!cargoItem || cargoItem.quantity < contract.quantity) {
                    return { 
                        success: false, 
                        message: "You don't have the contract goods!" 
                    };
                }
                
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
    
    checkGameOver() {
        if (this.ship.hull <= 0) {
            this.gameOver = true;
            return true;
        }
        return false;
    }
    
    takeDamage(amount) {
        this.ship.hull -= amount;
        this.ship.hull = Math.max(0, this.ship.hull);
        return this.checkGameOver();
    }
    
    restockSystem(system) {
        const daysPassed = this.totalDaysTraveled - system.lastRestock;
        
        if (daysPassed >= this.restockIntervalMin && daysPassed < this.fullRestockIntervalMin) {
            this.goods.forEach(good => {
                if (system.market[good.id]) {
                    const maxQuantity = system.market[good.id].maxQuantity;
                    const currentQuantity = system.market[good.id].quantity;
                    const targetQuantity = Math.floor(maxQuantity * 0.5);
                    if (currentQuantity < targetQuantity) {
                        system.market[good.id].quantity = Math.min(targetQuantity, currentQuantity + 5);
                    }
                }
            });
            system.lastRestock = this.totalDaysTraveled - (this.fullRestockIntervalMin - daysPassed - 1);
        } 
        else if (daysPassed >= this.fullRestockIntervalMin) {
            this.goods.forEach(good => {
                if (system.market[good.id]) {
                    const maxQuantity = system.market[good.id].maxQuantity;
                    const currentQuantity = system.market[good.id].quantity;
                    const targetQuantity = maxQuantity;
                    if (currentQuantity < targetQuantity) {
                        system.market[good.id].quantity = Math.min(targetQuantity, currentQuantity + 10);
                    }
                }
            });
            system.lastRestock = this.totalDaysTraveled;
        }
        
        system.daysSinceRestock = daysPassed;
    }
    
    generateContracts() {
        this.contracts = [];
        
        if (this.galaxy.length === 0) {
            console.error("Cannot generate contracts - galaxy is empty");
            return;
        }
        
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
        
        for (let i = 0; i < 2; i++) {
            const origin = this.galaxy[Math.floor(Math.random() * this.galaxy.length)];
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
}