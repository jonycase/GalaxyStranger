// SystemGen.js
export const EconomyProfiles = {
    agricultural: {
        weight: 10,
        techLevelWeights: [0, 4, 5, 1],
        securityLevelWeights: [0, 5, 4, 1],
        hasShipyardChance: 0.3,
        hasRefuel: true,
        hasMarket: true,
        marketModifiers: {
            food: { baseModifier: 0.5, quantityMultiplier: 1.8 },
            water: { baseModifier: 0.6, quantityMultiplier: 1.6 },
            luxury: { baseModifier: 1.3, quantityMultiplier: 0.8 },
            spice: { baseModifier: 1.1, quantityMultiplier: 1.2 }
        },
        description: "Fertile worlds focused on food production"
    },
    industrial: {
        weight: 8,
        techLevelWeights: [0, 3, 6, 1],
        securityLevelWeights: [0, 4, 5, 1],
        hasShipyardChance: 0.7,
        hasRefuel: true,
        hasMarket: true,
        marketModifiers: {
            ore: { baseModifier: 0.5, quantityMultiplier: 1.7 },
            fuel: { baseModifier: 0.7, quantityMultiplier: 1.5 },
            robotics: { baseModifier: 0.9, quantityMultiplier: 1.3 },
            weapons: { baseModifier: 1.4, quantityMultiplier: 0.7 }
        },
        description: "Manufacturing hubs with heavy industry"
    },
    tech: {
        weight: 7,
        techLevelWeights: [0, 1, 4, 5],
        securityLevelWeights: [0, 3, 4, 3],
        hasShipyardChance: 0.6,
        hasRefuel: true,
        hasMarket: true,
        marketModifiers: {
            medicine: { baseModifier: 0.6, quantityMultiplier: 1.4 },
            tech: { baseModifier: 0.5, quantityMultiplier: 1.6 },
            ai: { baseModifier: 0.8, quantityMultiplier: 1.1 },
            robotics: { baseModifier: 0.7, quantityMultiplier: 1.3 }
        },
        description: "Advanced research and development centers"
    },
    mining: {
        weight: 9,
        techLevelWeights: [0, 5, 4, 1],
        securityLevelWeights: [0, 4, 5, 1],
        hasShipyardChance: 0.5,
        hasRefuel: true,
        hasMarket: true,
        marketModifiers: {
            ore: { baseModifier: 0.4, quantityMultiplier: 1.8 },
            crystals: { baseModifier: 0.5, quantityMultiplier: 1.7 },
            water: { baseModifier: 0.8, quantityMultiplier: 1.4 },
            artifacts: { baseModifier: 0.7, quantityMultiplier: 1.3 }
        },
        description: "Resource extraction operations on mineral-rich worlds"
    },
    trade: {
        weight: 6,
        techLevelWeights: [0, 2, 5, 3],
        securityLevelWeights: [0, 3, 5, 2],
        hasShipyardChance: 0.4,
        hasRefuel: true,
        hasMarket: true,
        marketModifiers: {
            luxury: { baseModifier: 0.7, quantityMultiplier: 1.5 },
            artifacts: { baseModifier: 0.8, quantityMultiplier: 1.4 },
            tech: { baseModifier: 1.1, quantityMultiplier: 1.2 },
            medicine: { baseModifier: 1.2, quantityMultiplier: 1.1 }
        },
        description: "Commercial hubs and free trade zones"
    },
    military: {
        weight: 5,
        techLevelWeights: [0, 1, 3, 6],
        securityLevelWeights: [0, 1, 3, 6],
        hasShipyardChance: 0.9,
        hasRefuel: true,
        hasMarket: true,
        marketModifiers: {
            weapons: { baseModifier: 0.6, quantityMultiplier: 1.6 },
            robotics: { baseModifier: 0.7, quantityMultiplier: 1.4 },
            fuel: { baseModifier: 0.5, quantityMultiplier: 1.8 }
        },
        description: "Strategic defense installations and naval bases"
    },
    unpopulated: {
        weight: 4,
        techLevelWeights: [10, 0, 0, 0],
        securityLevelWeights: [10, 0, 0, 0],
        hasShipyardChance: 0,
        hasRefuel: false,
        hasMarket: false,
        marketModifiers: {},
        description: "Uninhabited systems with no established infrastructure"
    },
    custom: {
        weight: 0,
        fixedProperties: true,
        description: "Unique systems with special properties"
    }
};

export const CustomSystems = [
    {
        name: "Earth Prime",
        economy: "custom",
        x: 350,
        y: 275,
        techLevel: "high",
        security: "high",
        hasShipyard: true,
        hasRefuel: true,
        hasMarket: true,
        hasSpecial: true,
        marketOverrides: {
            food: { buyPrice: 8, sellPrice: 6, quantity: 120 },
            medicine: { buyPrice: 45, sellPrice: 35, quantity: 90 },
            tech: { buyPrice: 70, sellPrice: 55, quantity: 110 }
        }
    },
    {
        name: "Neo Titan",
        economy: "custom",
        x: 650,
        y: 400,
        techLevel: "medium",
        security: "low",
        hasShipyard: true,
        hasRefuel: true,
        hasMarket: true,
        hasSpecial: false,
        marketOverrides: {
            ore: { buyPrice: 100, sellPrice: 80, quantity: 500 },
            robotics: { buyPrice: 120, sellPrice: 100, quantity: 850 },
            fuel: { buyPrice: 60, sellPrice: 40, quantity: 900 }
        }
    }
];

export const getWeightedRandom = (items, weights) => {
    if (!weights || weights.length === 0) return items[0];
    
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    let random = Math.random() * totalWeight;
    
    for (let i = 0; i < items.length; i++) {
        if (random < weights[i]) {
            return items[i];
        }
        random -= weights[i];
    }
    
    return items[0];
};

export const generateSystemName = () => {
    const prefixes = ['New', 'Old', 'Great', 'Little', 'Upper', 'Lower', 'East', 
                     'West', 'North', 'South', 'Elder', 'Ancestor', 'High'];
    const suffixes = ['Prime', 'Secundus', 'Tertius', 'Quartus', 'Quintus', 'Alpha',
                     'Beta', 'Gamma', 'Delta', 'Epsilon', 'Psy', 'Jeta', 'Nigmus'];
    const nameParts = ['Vega', 'Sirius', 'Orion', 'Centauri', 'Andromeda', 'Persei',
                       'Cygni', 'Draconis', 'Lyrae', 'Aquilae', 'Pegasi', 'Tauri'];
    
    const pattern = Math.random();
    if (pattern < 0.3) {
        return `${prefixes[Math.floor(Math.random() * prefixes.length)]} ${
                suffixes[Math.floor(Math.random() * suffixes.length)]}`;
    }
    if (pattern < 0.6) {
        return `${nameParts[Math.floor(Math.random() * nameParts.length)]} ${
                1000 + Math.floor(Math.random() * 9000)}`;
    }
    return `${prefixes[Math.floor(Math.random() * prefixes.length)]} ${
            nameParts[Math.floor(Math.random() * nameParts.length)]}`;
};

export const generatePosition = (width, height, minDist, existingPoints) => {
    let attempts = 0;
    let newPoint;
    
    while (attempts < 100) {
        newPoint = {
            x: 100 + Math.random() * (width - 200),
            y: 100 + Math.random() * (height - 200)
        };
        
        let valid = true;
        for (const point of existingPoints) {
            const dx = point.x - newPoint.x;
            const dy = point.y - newPoint.y;
            if (Math.sqrt(dx*dx + dy*dy) < minDist) {
                valid = false;
                break;
            }
        }
        
        if (valid) return newPoint;
        attempts++;
    }
    
    // Fallback if no valid position found
    return {
        x: 100 + Math.random() * (width - 200),
        y: 100 + Math.random() * (height - 200)
    };
};