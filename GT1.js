        /**
 * Universal Animation Handler
 * 
 * This script automatically applies Animate.css animations to elements
 * based on their class names and data attributes. It ensures animations
 * play to completion even if the trigger event ends early (e.g., hover).
 * 
 * Supported Triggers:
 * - On Appearance: Element animates when it first enters the screen.
 * - On Hover:      Element animates on mouseenter.
 * - On Press:      Element animates on mousedown.
 * - On Release:    Element animates on mouseup.
 * - On Hold:       Element animates after being held down for a set time.
 */
document.addEventListener('DOMContentLoaded', () => {

    /**
     * Core function to apply an animation to an element.
     * It adds the necessary classes and removes them after the animation ends.
     * @param {HTMLElement} element - The element to animate.
     * @param {string} animationName - The name of the Animate.css animation (e.g., 'bounce', 'flash').
     */
    const applyAnimation = (element, animationName) => {
        // Don't restart if the element is already animating
        if (element.classList.contains('animate__animated')) return;

        // Add the classes to trigger the animation
        element.classList.add('animate__animated', `animate__${animationName}`);

        // Listen for the animation to end, then clean up the classes.
        // { once: true } automatically removes the event listener after it runs.
        element.addEventListener('animationend', () => {
            element.classList.remove('animate__animated', `animate__${animationName}`);
        }, { once: true });
    };

    // --- 1. ON APPEARANCE Animations ---
    // Animates elements when they first scroll into view.
    const elementsToAnimateOnAppear = document.querySelectorAll('.anim-on-appear');
    if (elementsToAnimateOnAppear.length > 0) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const animationName = entry.target.dataset.appearAnimation || 'fadeIn';
                    applyAnimation(entry.target, animationName);
                    // Stop observing the element after it has animated once
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 }); // Trigger when 10% of the element is visible

        elementsToAnimateOnAppear.forEach(element => observer.observe(element));
    }

    // --- 2. ON HOVER Animations ---
    // Animates on mouseenter.
    const elementsToAnimateOnHover = document.querySelectorAll('.anim-on-hover');
    elementsToAnimateOnHover.forEach(element => {
        element.addEventListener('mouseenter', () => {
            const animationName = element.dataset.hoverAnimation || 'pulse';
            applyAnimation(element, animationName);
        });
    });

    // --- 3. ON PRESS Animations ---
    // Animates on mousedown.
    const elementsToAnimateOnPress = document.querySelectorAll('.anim-on-press');
    elementsToAnimateOnPress.forEach(element => {
        element.addEventListener('mousedown', () => {
            const animationName = element.dataset.pressAnimation || 'tada';
            applyAnimation(element, animationName);
        });
    });
    
    // --- 4. ON RELEASE Animations ---
    // Animates on mouseup.
    const elementsToAnimateOnRelease = document.querySelectorAll('.anim-on-release');
    elementsToAnimateOnRelease.forEach(element => {
        element.addEventListener('mouseup', () => {
            const animationName = element.dataset.releaseAnimation || 'bounceOut';
            applyAnimation(element, animationName);
        });
    });

    // --- 5. ON HOLD Animations ---
    // Animates after the mouse is held down for a specified duration.
    const elementsToAnimateOnHold = document.querySelectorAll('.anim-on-hold');
    elementsToAnimateOnHold.forEach(element => {
        let holdTimer = null;
        const holdDuration = parseInt(element.dataset.holdTime, 10) || 700; // 700ms default

        const startHold = () => {
            // Start a timer. If it completes, run the animation.
            holdTimer = setTimeout(() => {
                const animationName = element.dataset.holdAnimation || 'shakeX';
                applyAnimation(element, animationName);
                holdTimer = null; // Reset timer
            }, holdDuration);
        };

        const cancelHold = () => {
            // If the mouse is released or moves away too early, cancel the timer.
            clearTimeout(holdTimer);
        };
        
        element.addEventListener('mousedown', startHold);
        element.addEventListener('mouseup', cancelHold);
        element.addEventListener('mouseleave', cancelHold);
    });

});
        const gameState = {
            credits: 10000,
            fuel: 15,
            maxFuel: 15,
            cargo: [],
            cargoCapacity: 50,
            shipCondition: 100,
            currentSystem: null,
            targetSystem: null,
            galaxy: [],
            galaxySize: 200,
            goods: [
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
            ],
            economyTypes: ['agricultural', 'industrial', 'tech', 'mining', 'trade', 'military'],
            techLevels: ['low', 'medium', 'high'],
            securityLevels: ['low', 'medium', 'high'],
            ship: {
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
                mapOffsetY: 0
            },
            pirateEncounter: null,
            upgrades: [
                { id: 'hull', name: 'Reinforced Hull', description: 'Increases hull strength', cost: 2000, effect: 10, icon: 'fas fa-shield-alt' },
                { id: 'weapons', name: 'Plasma Cannons', description: 'Increases weapon damage', cost: 3000, effect: 5, icon: 'fas fa-gem' },
                { id: 'engine', name: 'Quantum Engine', description: 'Increases evasion chance', cost: 2500, effect: 5, icon: 'fas fa-tachometer-alt' },
                { id: 'shields', name: 'Deflector Shields', description: 'Increases shield strength', cost: 3500, effect: 10, icon: 'fas fa-atom' },
                { id: 'cargo', name: 'Expanded Cargo', description: 'Increases cargo capacity', cost: 1500, effect: 10, icon: 'fas fa-boxes' },
                { id: 'fuel', name: 'Fuel Tanks', description: 'Increases fuel capacity', cost: 1800, effect: 5, icon: 'fas fa-gas-pump' }
            ],
            loan: {
                amount: 0,
                dueDate: 0,
                interest: 0.1
            },
            contracts: [],
            encounters: [
                { type: 'pirate', name: 'Pirate Attack', weight: 30 },
                { type: 'police', name: 'Police Inspection', weight: 20 },
                { type: 'trader', name: 'Wandering Trader', weight: 15 },
                { type: 'debris', name: 'Space Debris Field', weight: 15 },
                { type: 'distress', name: 'Distress Signal', weight: 10 },
                { type: 'anomaly', name: 'Spatial Anomaly', weight: 10 }
            ]
        };

        // Initialize the game
        function initGame(size) {
            gameState.galaxySize = size;
            showLoadingScreen();
            
            setTimeout(() => {
                generateGalaxy();
                setupCanvas();
                setupEventListeners();
                generateContracts();
                updateUI();
                hideLoadingScreen();
                
                showNotification(`Welcome to ${gameState.currentSystem.name}!`);
            }, 100);
        }
        
        // Show loading screen
        function showLoadingScreen() {
            const loadingScreen = document.getElementById('loading-screen');
            if (loadingScreen) loadingScreen.style.display = 'flex';
            updateLoadingProgress(0, "Initializing galaxy generation");
        }
        
        // Hide loading screen
        function hideLoadingScreen() {
            const loadingScreen = document.getElementById('loading-screen');
            if (loadingScreen) loadingScreen.style.display = 'none';
        }
        
        // Update loading progress
        function updateLoadingProgress(percent, message) {
            const progressBar = document.getElementById('progress-bar');
            const loadingText = document.getElementById('loading-text');
            
            if (progressBar) progressBar.style.width = percent + '%';
            if (loadingText) loadingText.textContent = message;
        }

        // Generate galaxy with star systems
        function generateGalaxy() {
            gameState.galaxy = [];
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
            for (let i = 0; i < systemNames.length && names.size < gameState.galaxySize; i++) {
                names.add(systemNames[i]);
                nameCount++;
            }
            
            // Generate unique names for remaining systems
            while (names.size < gameState.galaxySize) {
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
            
            for (let i = 0; i < gameState.galaxySize; i++) {
                let validPosition = false;
                let x, y;
                let attempts = 0;
                
                while (!validPosition && attempts < 100) {
                    x = 100 + Math.random() * 600;
                    y = 100 + Math.random() * 400;
                    validPosition = true;
                    
                    // Check distance to existing systems
                    for (const system of gameState.galaxy) {
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
                
                const economy = gameState.economyTypes[Math.floor(Math.random() * gameState.economyTypes.length)];
                const techLevel = gameState.techLevels[Math.floor(Math.random() * gameState.techLevels.length)];
                const security = gameState.securityLevels[Math.floor(Math.random() * gameState.securityLevels.length)];
                
                const system = {
                    id: i,
                    name: nameArray[i],
                    x: x,
                    y: y,
                    economy: economy,
                    techLevel: techLevel,
                    security: security,
                    market: {},
                    hasShipyard: Math.random() > 0.7
                };
                
                // Generate market prices based on production type
                gameState.goods.forEach(good => {
                    let baseModifier = 1;
                    
                    if (good.production.includes(economy)) {
                        baseModifier = 0.5 + Math.random() * 0.3;
                    } else {
                        baseModifier = 1.2 + Math.random() * 0.4;
                    }
                    
                    if (techLevel === 'low') baseModifier *= 1.3;
                    if (techLevel === 'high') baseModifier *= 0.9;
                    
                    const rand = 0.8 + Math.random() * 0.4;
                    const price = Math.round(good.basePrice * baseModifier * rand);
                    
                    system.market[good.id] = {
                        name: good.name,
                        buyPrice: price,
                        sellPrice: Math.round(price * (0.7 + Math.random() * 0.3)),
                        illegal: good.illegal
                    };
                });
                
                gameState.galaxy.push(system);
                
                // Update progress
                const percent = Math.round((i + 1) / gameState.galaxySize * 100);
                updateLoadingProgress(percent, `Creating system: ${system.name}`);
            }
            
            // Set starting system
            gameState.currentSystem = gameState.galaxy[Math.floor(Math.random() * gameState.galaxy.length)];
            gameState.ship.x = gameState.currentSystem.x;
            gameState.ship.y = gameState.currentSystem.y;
        }

        // Generate contracts
        function generateContracts() {
            gameState.contracts = [];
            
            // Pirate hunt contracts
            for (let i = 0; i < 3; i++) {
                const system = gameState.galaxy[Math.floor(Math.random() * gameState.galaxy.length)];
                const tier = 3 + Math.floor(Math.random() * 8);
                const reward = 500 + tier * 300;
                
                gameState.contracts.push({
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
                const origin = gameState.galaxy[Math.floor(Math.random() * gameState.galaxy.length)];
                const destination = gameState.galaxy[Math.floor(Math.random() * gameState.galaxy.length)];
                const good = gameState.goods[Math.floor(Math.random() * gameState.goods.length)];
                const quantity = 5 + Math.floor(Math.random() * 10);
                const reward = good.basePrice * quantity * 1.5;
                
                gameState.contracts.push({
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

        // Canvas setup and rendering
        function setupCanvas() {
            const galaxyCanvas = document.getElementById('galaxy-canvas');
            const systemContainer = document.getElementById('system-container');
            const shipContainer = document.getElementById('ship-container');
            
            if (!galaxyCanvas || !systemContainer || !shipContainer) return;
            
            galaxyCanvas.width = galaxyCanvas.offsetWidth;
            galaxyCanvas.height = galaxyCanvas.offsetHeight;
            
            const galaxyCtx = galaxyCanvas.getContext('2d');
            
            // Draw galaxy background
            galaxyCtx.fillStyle = '#000033';
            galaxyCtx.fillRect(0, 0, galaxyCanvas.width, galaxyCanvas.height);
            
            // Draw stars
            galaxyCtx.fillStyle = '#ffffff';
            for (let i = 0; i < 800; i++) {
                const x = Math.random() * galaxyCanvas.width;
                const y = Math.random() * galaxyCanvas.height;
                const size = Math.random() * 2;
                galaxyCtx.beginPath();
                galaxyCtx.arc(x, y, size, 0, Math.PI * 2);
                galaxyCtx.fill();
            }
            
            // Draw nebulae
            const nebulaeColors = ['#330066', '#660033', '#006633', '#663300'];
            for (let i = 0; i < 4; i++) {
                const x = Math.random() * galaxyCanvas.width;
                const y = Math.random() * galaxyCanvas.height;
                const radius = 50 + Math.random() * 80;
                const color = nebulaeColors[Math.floor(Math.random() * nebulaeColors.length)];
                
                const gradient = galaxyCtx.createRadialGradient(x, y, 0, x, y, radius);
                gradient.addColorStop(0, color);
                gradient.addColorStop(1, 'transparent');
                
                galaxyCtx.fillStyle = gradient;
                galaxyCtx.beginPath();
                galaxyCtx.arc(x, y, radius, 0, Math.PI * 2);
                galaxyCtx.fill();
            }
            
            // Draw star systems as DOM elements
            systemContainer.innerHTML = '';
            gameState.galaxy.forEach(system => {
                const systemDot = document.createElement('div');
                systemDot.className = 'system-dot';
                systemDot.dataset.id = system.id;
                systemDot.style.left = `${system.x - 6 + gameState.ship.mapOffsetX}px`;
                systemDot.style.top = `${system.y - 6 + gameState.ship.mapOffsetY}px`;
                
                // Set color based on economy
                let color;
                switch (system.economy) {
                    case 'agricultural': color = '#66cc66'; break;
                    case 'industrial': color = '#cc6666'; break;
                    case 'tech': color = '#6666cc'; break;
                    case 'mining': color = '#cccc66'; break;
                    case 'trade': color = '#cc66cc'; break;
                    case 'military': color = '#cc6666'; break;
                    default: color = '#aaaaaa';
                }
                
                systemDot.style.backgroundColor = color;
                
                // Add name label
                const systemName = document.createElement('div');
                systemName.className = 'system-name';
                systemName.textContent = system.name;
                systemName.style.left = `${system.x + 10 + gameState.ship.mapOffsetX}px`;
                systemName.style.top = `${system.y - 25 + gameState.ship.mapOffsetY}px`;
                
                systemContainer.appendChild(systemDot);
                systemContainer.appendChild(systemName);
                
                // Highlight current system
                if (system === gameState.currentSystem) {
                    systemDot.classList.add('selected-system');
                    
                    // Draw ship
                    const shipIndicator = document.createElement('div');
                    shipIndicator.className = 'ship-indicator';
                    shipIndicator.style.left = `${system.x - 12 + gameState.ship.mapOffsetX}px`;
                    shipIndicator.style.top = `${system.y - 12 + gameState.ship.mapOffsetY}px`;
                    shipContainer.appendChild(shipIndicator);
                }
            });
        }

        // Move the galaxy map
        function moveMap(dx, dy) {
            gameState.ship.mapOffsetX += dx;
            gameState.ship.mapOffsetY += dy;
            
            // Constrain movement to reasonable bounds
            gameState.ship.mapOffsetX = Math.max(-300, Math.min(300, gameState.ship.mapOffsetX));
            gameState.ship.mapOffsetY = Math.max(-200, Math.min(200, gameState.ship.mapOffsetY));
            
            setupCanvas();
        }

        // Create travel animation effect
        function createTravelEffect() {
            const effectContainer = document.getElementById('travel-effect');
            if (!effectContainer) return;
            
            effectContainer.innerHTML = '';
            
            const trail = document.createElement('div');
            trail.className = 'star-trail';
            effectContainer.appendChild(trail);
            
            // Animate the trail
            setTimeout(() => {
                trail.style.opacity = '1';
                trail.style.transition = 'opacity 1s ease-out';
                
                setTimeout(() => {
                    trail.style.opacity = '0';
                }, 1500);
            }, 100);
        }

        // UI Update
        function updateUI() {
            // Update stats
            const creditsEl = document.getElementById('credits');
            const fuelEl = document.getElementById('fuel');
            const hullEl = document.getElementById('hull');
            const cargoSpaceEl = document.getElementById('cargo-space');
            const targetSystemEl = document.getElementById('target-system');
            const distanceEl = document.getElementById('distance');
            const fuelCostEl = document.getElementById('fuel-cost');
            
            if (creditsEl) creditsEl.textContent = gameState.credits.toLocaleString() + ' CR';
            if (fuelEl) fuelEl.textContent = `${Math.round(gameState.fuel)}/${gameState.maxFuel}`;
            if (hullEl) hullEl.textContent = gameState.ship.hull + '%';
            
            const cargoSpace = gameState.cargo.reduce((sum, item) => sum + item.quantity, 0);
            if (cargoSpaceEl) cargoSpaceEl.textContent = `${cargoSpace}/${gameState.cargoCapacity}`;
            
            // Update target system info
            if (gameState.targetSystem) {
                if (targetSystemEl) targetSystemEl.textContent = gameState.targetSystem.name;
                
                const distance = calculateDistance(gameState.currentSystem, gameState.targetSystem);
                if (distanceEl) distanceEl.textContent = Math.round(distance * 10) / 10 + ' LY';
                
                const fuelCost = Math.ceil(distance);
                if (fuelCostEl) fuelCostEl.textContent = fuelCost;
            } else {
                if (targetSystemEl) targetSystemEl.textContent = 'None';
                if (distanceEl) distanceEl.textContent = '0 LY';
                if (fuelCostEl) fuelCostEl.textContent = '0';
            }
            
            // Update market
            const marketContainer = document.querySelector('.market-grid');
            if (marketContainer) {
                marketContainer.innerHTML = `
                    <div class="market-header">COMMODITY</div>
                    <div class="market-header">BUY</div>
                    <div class="market-header">SELL</div>
                    <div class="market-header">ACTIONS</div>
                `;
                
                gameState.goods.forEach(good => {
                    const marketItem = gameState.currentSystem.market[good.id];
                    const marketElement = document.createElement('div');
                    marketElement.className = 'market-item';
                    
                    const illegalIndicator = marketItem.illegal ? '<i class="fas fa-exclamation-triangle" style="color: #ff6666;"></i> ' : '';
                    
                    marketElement.innerHTML = `
                        <span>${illegalIndicator}${marketItem.name}</span>
                        <span>${marketItem.buyPrice} CR</span>
                        <span>${marketItem.sellPrice} CR</span>
                        <div style="display: flex; gap: 5px; justify-content: center;">
                            <button class="btn btn-buy" data-good="${good.id}" data-action="buy">BUY</button>
                            <button class="btn btn-sell" data-good="${good.id}" data-action="sell">SELL</button>
                        </div>
                    `;
                    marketContainer.appendChild(marketElement);
                });
            }
            
            // Update cargo hold
            const cargoContainer = document.getElementById('cargo-hold');
            if (cargoContainer) {
                cargoContainer.innerHTML = '';
                
                if (gameState.cargo.length === 0) {
                    const emptyItem = document.createElement('div');
                    emptyItem.className = 'cargo-item';
                    emptyItem.innerHTML = '<span style="grid-column: 1 / span 3; text-align: center; color: #8888ff;">Cargo hold is empty</span>';
                    cargoContainer.appendChild(emptyItem);
                } else {
                    gameState.cargo.forEach(item => {
                        const marketItem = gameState.currentSystem.market[item.id];
                        const illegalIndicator = marketItem.illegal ? '<i class="fas fa-exclamation-triangle" style="color: #ff6666;"></i> ' : '';
                        
                        const cargoItem = document.createElement('div');
                        cargoItem.className = 'cargo-item';
                        cargoItem.innerHTML = `
                            <span>${illegalIndicator}${item.name}</span>
                            <span>${item.quantity}</span>
                            <button class="btn btn-sell" data-good="${item.id}" data-action="sell-one">SELL</button>
                        `;
                        cargoContainer.appendChild(cargoItem);
                    });
                }
            }
            
            // Update ship upgrades
            const shipyardContainer = document.getElementById('ship-upgrades');
            if (shipyardContainer) {
                shipyardContainer.innerHTML = '';
                
                const shipyardStatusEl = document.getElementById('shipyard-status');
                if (shipyardStatusEl) {
                    if (gameState.currentSystem.hasShipyard) {
                        shipyardStatusEl.textContent = 'Available upgrades:';
                        
                        gameState.upgrades.forEach(upgrade => {
                            const upgradeCard = document.createElement('div');
                            upgradeCard.className = 'upgrade-card';
                            upgradeCard.innerHTML = `
                                <div class="upgrade-header">
                                    <i class="${upgrade.icon}"></i>
                                    <h3 style="font-size: 16px;">${upgrade.name}</h3>
                                </div>
                                <p style="font-size: 14px; margin: 5px 0;">${upgrade.description}</p>
                                <div style="display: flex; justify-content: space-between; margin-top: 8px;">
                                    <span style="font-size: 14px;">Cost: ${upgrade.cost} CR</span>
                                    <button class="btn btn-buy" data-upgrade="${upgrade.id}">UPGRADE</button>
                                </div>
                            `;
                            shipyardContainer.appendChild(upgradeCard);
                        });
                    } else {
                        shipyardStatusEl.textContent = 'Shipyard services not available in this system';
                    }
                }
            }
            
            // Update system overview
            updateSystemOverview();
            
            // Update contracts
            updateContractsList();
            
            // Setup market and cargo button event listeners
            document.querySelectorAll('[data-good]').forEach(button => {
                button.addEventListener('click', handleTradeAction);
            });
            
            // Setup upgrade button event listeners
            document.querySelectorAll('[data-upgrade]').forEach(button => {
                button.addEventListener('click', handleUpgrade);
            });
            
            // Update galaxy view
            updateGalaxyView();
        }

        // Update system overview panel
        function updateSystemOverview() {
            const currentSystemName = document.getElementById('current-system-name');
            const currentSystemEconomy = document.getElementById('current-system-economy');
            const currentSystemSecurity = document.getElementById('current-system-security');
            const overviewFuel = document.getElementById('overview-fuel');
            const overviewRefuelCost = document.getElementById('overview-refuel-cost');
            const overviewCargo = document.getElementById('overview-cargo');
            const overviewCargoValue = document.getElementById('overview-cargo-value');
            const overviewThreat = document.getElementById('overview-threat');
            const overviewPirateChance = document.getElementById('overview-pirate-chance');
            const nearbySystems = document.getElementById('nearby-systems');
            
            if (currentSystemName) currentSystemName.textContent = gameState.currentSystem.name;
            if (currentSystemEconomy) currentSystemEconomy.textContent = `Economy: ${gameState.currentSystem.economy.charAt(0).toUpperCase() + gameState.currentSystem.economy.slice(1)}`;
            if (currentSystemSecurity) currentSystemSecurity.textContent = `Security: ${gameState.currentSystem.security.charAt(0).toUpperCase() + gameState.currentSystem.security.slice(1)}`;
            
            if (overviewFuel) overviewFuel.textContent = `${gameState.fuel}/${gameState.maxFuel} units`;
            
            // Calculate refuel cost
            let costPerUnit;
            switch(gameState.currentSystem.techLevel) {
                case 'high': costPerUnit = 10; break;
                case 'medium': costPerUnit = 15; break;
                case 'low': costPerUnit = 20; break;
                default: costPerUnit = 15;
            }
            const fuelNeeded = gameState.maxFuel - gameState.fuel;
            const totalCost = fuelNeeded * costPerUnit;
            if (overviewRefuelCost) overviewRefuelCost.textContent = `Refuel cost: ${totalCost} CR`;
            
            // Calculate cargo value
            const cargoSpace = gameState.cargo.reduce((sum, item) => sum + item.quantity, 0);
            let cargoValue = 0;
            gameState.cargo.forEach(item => {
                const marketItem = gameState.currentSystem.market[item.id];
                cargoValue += marketItem.sellPrice * item.quantity;
            });
            
            if (overviewCargo) overviewCargo.textContent = `${cargoSpace}/${gameState.cargoCapacity} units`;
            if (overviewCargoValue) overviewCargoValue.textContent = `Value: ${cargoValue.toLocaleString()} CR`;
            
            // Calculate threat level
            let threatLevel = "Low";
            let pirateChance = 0.4;
            if (gameState.currentSystem.security === 'low') {
                threatLevel = "High";
                pirateChance = 0.5;
            } else if (gameState.currentSystem.security === 'medium') {
                threatLevel = "Medium";
                pirateChance = 0.4;
            } else {
                threatLevel = "Low";
                pirateChance = 0.3;
            }
            
            if (overviewThreat) overviewThreat.textContent = threatLevel;
            if (overviewPirateChance) overviewPirateChance.textContent = `${Math.round(pirateChance * 100)}%`;
            
            // Show nearby systems
            if (nearbySystems) {
                nearbySystems.innerHTML = '';
                
                // Find nearby systems (within 50 LY)
                const nearby = gameState.galaxy.filter(system => {
                    if (system === gameState.currentSystem) return false;
                    const distance = calculateDistance(gameState.currentSystem, system);
                    return distance <= 50;
                });
                
                // Sort by distance
                nearby.sort((a, b) => {
                    const distA = calculateDistance(gameState.currentSystem, a);
                    const distB = calculateDistance(gameState.currentSystem, b);
                    return distA - distB;
                });
                
                // Show up to 5 nearest systems
                nearby.slice(0, 5).forEach(system => {
                    const distance = calculateDistance(gameState.currentSystem, system);
                    const systemEl = document.createElement('div');
                    systemEl.className = 'system-overview-item';
                    systemEl.innerHTML = `
                        <div><strong>${system.name}</strong></div>
                        <div>${Math.round(distance)} LY</div>
                        <div>${system.economy.charAt(0).toUpperCase() + system.economy.slice(1)}</div>
                        <div>Security: ${system.security.charAt(0).toUpperCase() + system.security.slice(1)}</div>
                    `;
                    nearbySystems.appendChild(systemEl);
                });
                
                if (nearby.length === 0) {
                    nearbySystems.innerHTML = '<div style="text-align: center; padding: 10px; color: #8888ff;">No nearby systems</div>';
                }
            }
        }

        // Update contracts list
        function updateContractsList() {
            const contractsList = document.getElementById('contracts-list');
            if (!contractsList) return;
            
            contractsList.innerHTML = '';
            
            if (gameState.contracts.length === 0) {
                contractsList.innerHTML = '<div style="text-align: center; padding: 10px; color: #8888ff;">No contracts available</div>';
                return;
            }
            
            gameState.contracts.forEach(contract => {
                if (contract.completed) return;
                
                const contractEl = document.createElement('div');
                contractEl.className = 'contract-item';
                
                let buttonText = "Accept";
                if (contract.type === 'delivery' && contract.originSystem === gameState.currentSystem) {
                    buttonText = "Pick Up";
                } else if (contract.type === 'delivery' && contract.targetSystem === gameState.currentSystem) {
                    buttonText = "Deliver";
                }
                
                contractEl.innerHTML = `
                    <div class="contract-header">
                        <h3>${contract.name}</h3>
                        <div class="contract-reward">${contract.reward.toLocaleString()} CR</div>
                    </div>
                    <div class="contract-details">${contract.description}</div>
                    <button class="btn contract-button" data-contract="${contract.id}">${buttonText}</button>
                `;
                
                contractsList.appendChild(contractEl);
            });
        }

        // Update galaxy view
        function updateGalaxyView() {
            const systemContainer = document.getElementById('system-container');
            const shipContainer = document.getElementById('ship-container');
            
            if (!systemContainer || !shipContainer) return;
            
            // Clear ship container
            shipContainer.innerHTML = '';
            
            // Update all systems
            systemContainer.querySelectorAll('.system-dot').forEach(dot => {
                const systemId = parseInt(dot.dataset.id);
                const system = gameState.galaxy.find(s => s.id === systemId);
                
                dot.style.left = `${system.x - 6 + gameState.ship.mapOffsetX}px`;
                dot.style.top = `${system.y - 6 + gameState.ship.mapOffsetY}px`;
                
                if (system === gameState.currentSystem) {
                    dot.classList.add('selected-system');
                    
                    // Draw ship
                    const shipIndicator = document.createElement('div');
                    shipIndicator.className = 'ship-indicator';
                    shipIndicator.style.left = `${system.x - 12 + gameState.ship.mapOffsetX}px`;
                    shipIndicator.style.top = `${system.y - 12 + gameState.ship.mapOffsetY}px`;
                    shipContainer.appendChild(shipIndicator);
                } else {
                    dot.classList.remove('selected-system');
                }
                
                if (system === gameState.targetSystem) {
                    dot.style.boxShadow = '0 0 10px #ffcc66, 0 0 20px #ffcc66';
                } else {
                    dot.style.boxShadow = '0 0 10px currentColor';
                }
            });
            
            // Update system names
            systemContainer.querySelectorAll('.system-name').forEach(nameEl => {
                const systemId = parseInt(nameEl.parentElement.querySelector('.system-dot').dataset.id);
                const system = gameState.galaxy.find(s => s.id === systemId);
                nameEl.style.left = `${system.x + 10 + gameState.ship.mapOffsetX}px`;
                nameEl.style.top = `${system.y - 25 + gameState.ship.mapOffsetY}px`;
            });
        }

        // Calculate distance between systems (in LY)
        function calculateDistance(systemA, systemB) {
            const dx = systemB.x - systemA.x;
            const dy = systemB.y - systemA.y;
            return Math.sqrt(dx * dx + dy * dy) / 15;
        }

        // Handle trade actions (buy/sell)
        function handleTradeAction(e) {
            const goodId = e.target.dataset.good;
            const action = e.target.dataset.action;
            const marketItem = gameState.currentSystem.market[goodId];
            
            if (action === 'buy') {
                // Check if player has enough credits
                if (gameState.credits < marketItem.buyPrice) {
                    showNotification('Not enough credits!');
                    return;
                }
                
                // Check cargo space
                const cargoSpace = gameState.cargo.reduce((sum, item) => sum + item.quantity, 0);
                if (cargoSpace >= gameState.cargoCapacity) {
                    showNotification('Cargo hold full!');
                    return;
                }
                
                // Process transaction
                gameState.credits -= marketItem.buyPrice;
                
                // Add to cargo
                const existingItem = gameState.cargo.find(item => item.id === goodId);
                if (existingItem) {
                    existingItem.quantity++;
                } else {
                    gameState.cargo.push({
                        id: goodId,
                        name: marketItem.name,
                        quantity: 1,
                        buyPrice: marketItem.buyPrice,
                        illegal: marketItem.illegal
                    });
                }
                
                showNotification(`Purchased 1 ${marketItem.name}`);
            } 
            else if (action === 'sell' || action === 'sell-one') {
                // Find the cargo item
                const cargoItem = gameState.cargo.find(item => item.id === goodId);
                if (!cargoItem || cargoItem.quantity < 1) {
                    showNotification('Not enough in cargo!');
                    return;
                }
                
                // Process transaction
                gameState.credits += marketItem.sellPrice;
                cargoItem.quantity--;
                
                // Remove if quantity is 0
                if (cargoItem.quantity === 0) {
                    gameState.cargo = gameState.cargo.filter(item => item.id !== goodId);
                }
                
                showNotification(`Sold 1 ${marketItem.name}`);
            }
            
            updateUI();
        }

        // Handle ship upgrades
        function handleUpgrade(e) {
            const upgradeId = e.target.dataset.upgrade;
            const upgrade = gameState.upgrades.find(u => u.id === upgradeId);
            
            if (gameState.credits < upgrade.cost) {
                showNotification(`Need ${upgrade.cost} CR`);
                return;
            }
            
            gameState.credits -= upgrade.cost;
            
            switch(upgradeId) {
                case 'hull':
                    gameState.ship.maxHull += upgrade.effect;
                    gameState.ship.hull = gameState.ship.maxHull;
                    showNotification(`Hull upgraded to ${gameState.ship.maxHull}%`);
                    break;
                case 'weapons':
                    gameState.ship.damage += upgrade.effect;
                    showNotification(`Weapon damage increased!`);
                    break;
                case 'engine':
                    gameState.ship.evasion += upgrade.effect;
                    showNotification(`Evasion increased!`);
                    break;
                case 'shields':
                    gameState.ship.shields += upgrade.effect;
                    showNotification(`Shields upgraded!`);
                    break;
                case 'cargo':
                    gameState.cargoCapacity += upgrade.effect;
                    showNotification(`Cargo capacity increased!`);
                    break;
                case 'fuel':
                    gameState.maxFuel += upgrade.effect;
                    gameState.fuel = gameState.maxFuel;
                    showNotification(`Fuel capacity increased to ${gameState.maxFuel}!`);
                    break;
            }
            
            updateUI();
        }

        // Travel to target system
        function travelToSystem() {
            if (!gameState.targetSystem || gameState.targetSystem === gameState.currentSystem) {
                showNotification('Select a system to travel to!');
                return;
            }
            
            const distance = calculateDistance(gameState.currentSystem, gameState.targetSystem);
            const fuelCost = Math.ceil(distance);
            
            if (gameState.fuel < fuelCost) {
                showNotification('Not enough fuel!');
                return;
            }
            
            // Deduct fuel
            gameState.fuel -= fuelCost;
            
            // Start travel animation
            gameState.ship.traveling = true;
            gameState.ship.travelProgress = 0;
            gameState.ship.x = gameState.currentSystem.x;
            gameState.ship.y = gameState.currentSystem.y;
            gameState.ship.targetX = gameState.targetSystem.x;
            gameState.ship.targetY = gameState.targetSystem.y;
            
            showNotification(`Traveling to ${gameState.targetSystem.name}...`);
            createTravelEffect();
            
            // Animate travel
            const startTime = Date.now();
            const travelDuration = 3000;
            
            function animateTravel() {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / travelDuration, 1);
                gameState.ship.travelProgress = progress;
                
                // Draw ship at current position
                const shipContainer = document.getElementById('ship-container');
                if (shipContainer) {
                    shipContainer.innerHTML = '';
                    
                    const currentX = gameState.ship.x + (gameState.ship.targetX - gameState.ship.x) * progress;
                    const currentY = gameState.ship.y + (gameState.ship.targetY - gameState.ship.y) * progress;
                    
                    const shipIndicator = document.createElement('div');
                    shipIndicator.className = 'ship-indicator';
                    shipIndicator.style.left = `${currentX - 12 + gameState.ship.mapOffsetX}px`;
                    shipIndicator.style.top = `${currentY - 12 + gameState.ship.mapOffsetY}px`;
                    shipContainer.appendChild(shipIndicator);
                }
                
                if (progress < 1) {
                    requestAnimationFrame(animateTravel);
                } else {
                    // Travel complete
                    gameState.ship.traveling = false;
                    gameState.currentSystem = gameState.targetSystem;
                    gameState.targetSystem = null;
                    
                    // Reset map position
                    gameState.ship.mapOffsetX = 0;
                    gameState.ship.mapOffsetY = 0;
                    
                    // Determine encounter chance based on security
                    let pirateChance = 0.4;
                    if (gameState.currentSystem.security === 'low') pirateChance = 0.5;
                    else if (gameState.currentSystem.security === 'high') pirateChance = 0.3;
                    
                    // Random event chance
                    if (Math.random() < pirateChance) {
                        const encounter = getRandomEncounter();
                        if (encounter.type === 'pirate') {
                            startPirateEncounter();
                        } else if (encounter.type === 'police') {
                            startPoliceEncounter();
                        } else {
                            handleOtherEncounter(encounter);
                        }
                    } else {
                        showNotification(`Arrived at ${gameState.currentSystem.name}`);
                    }
                    
                    updateUI();
                }
            }
            
            animateTravel();
        }

        // Get a random encounter
        function getRandomEncounter() {
            let totalWeight = 0;
            gameState.encounters.forEach(encounter => {
                totalWeight += encounter.weight;
            });
            
            let random = Math.random() * totalWeight;
            for (const encounter of gameState.encounters) {
                if (random < encounter.weight) {
                    return encounter;
                }
                random -= encounter.weight;
            }
            
            return gameState.encounters[0];
        }

        // Start pirate encounter
        function startPirateEncounter() {
            // Determine pirate tier based on system tech level
            const techLevels = ['low', 'medium', 'high'];
            const tier = Math.min(techLevels.indexOf(gameState.currentSystem.techLevel) + 1 + Math.floor(Math.random() * 3), 10);
            
            // Create pirate ship
            const pirateNames = ['Bandit', 'Marauder', 'Corsair', 'Raider', 'Reaver', 'Vandal', 'Ravager'];
            const pirateTypes = ['Interceptor', 'Frigate', 'Cruiser', 'Battleship', 'Dreadnought'];
            
            // Base pirate stats with 20% boost and additional 10% per tier
            const baseHull = 70 + tier * 10;
            const baseDamage = 5 + tier * 3;
            
            const pirateMultiplier = 1.2 + (0.10 * (tier - 1));
            
            gameState.pirateEncounter = {
                name: `${pirateNames[Math.floor(Math.random() * pirateNames.length)]} ${pirateTypes[Math.floor(Math.random() * pirateTypes.length)]}`,
                hull: Math.round(baseHull * pirateMultiplier),
                damage: Math.round(baseDamage * pirateMultiplier),
                accuracy: 40 + tier * 5,
                tier: tier
            };
            
            // Update combat UI
            const pirateNameEl = document.getElementById('pirate-name');
            const pirateHullEl = document.getElementById('pirate-hull');
            const pirateDamageEl = document.getElementById('pirate-damage');
            const pirateAccuracyEl = document.getElementById('pirate-accuracy');
            const pirateTierEl = document.getElementById('pirate-tier');
            const playerHullEl = document.getElementById('player-hull');
            const playerDamageEl = document.getElementById('player-damage');
            const playerEvasionEl = document.getElementById('player-evasion');
            const playerShieldsEl = document.getElementById('player-shields');
            const combatLogEl = document.getElementById('combat-log');
            
            if (pirateNameEl) pirateNameEl.textContent = gameState.pirateEncounter.name;
            if (pirateHullEl) pirateHullEl.textContent = gameState.pirateEncounter.hull + '%';
            if (pirateDamageEl) pirateDamageEl.textContent = gameState.pirateEncounter.damage;
            if (pirateAccuracyEl) pirateAccuracyEl.textContent = gameState.pirateEncounter.accuracy + '%';
            if (pirateTierEl) pirateTierEl.textContent = 'T' + tier;
            
            if (playerHullEl) playerHullEl.textContent = gameState.ship.hull + '%';
            if (playerDamageEl) playerDamageEl.textContent = gameState.ship.damage;
            if (playerEvasionEl) playerEvasionEl.textContent = gameState.ship.evasion + '%';
            if (playerShieldsEl) playerShieldsEl.textContent = gameState.ship.shields + '%';
            
            if (combatLogEl) combatLogEl.innerHTML = '<p>Pirates are attacking! Choose your action.</p>';
            
            // Show combat modal
            const combatModal = document.getElementById('combat-modal');
            if (combatModal) {
                combatModal.style.opacity = '1';
                combatModal.style.pointerEvents = 'all';
            }
        }

        // Start police encounter
        function startPoliceEncounter() {
            // Show police modal
            const policeModal = document.getElementById('police-modal');
            if (policeModal) {
                // Check for illegal goods
                const illegalGoods = gameState.cargo.filter(item => item.illegal);
                
                if (illegalGoods.length > 0) {
                    // Illegal goods found
                    const illegalGoodsEl = document.getElementById('illegal-goods-found');
                    const confiscatedGoodsEl = document.getElementById('confiscated-goods');
                    const fineAmountEl = document.getElementById('fine-amount');
                    const noIllegalGoodsEl = document.getElementById('no-illegal-goods');
                    
                    if (illegalGoodsEl) illegalGoodsEl.style.display = 'block';
                    if (noIllegalGoodsEl) noIllegalGoodsEl.style.display = 'none';
                    
                    // Calculate fine
                    const totalIllegalValue = illegalGoods.reduce((sum, item) => {
                        const marketItem = gameState.currentSystem.market[item.id];
                        return sum + marketItem.sellPrice * item.quantity;
                    }, 0);
                    
                    const finePercentage = 0.25 + Math.random() * 0.25; // 25-50%
                    const fineAmount = Math.min(gameState.credits * finePercentage, 5000 + totalIllegalValue);
                    
                    if (confiscatedGoodsEl) confiscatedGoodsEl.textContent = `Confiscated: ${illegalGoods.length} types of illegal goods`;
                    if (fineAmountEl) fineAmountEl.textContent = `Fine: ${Math.round(fineAmount)} CR`;
                } else {
                    // No illegal goods
                    const illegalGoodsEl = document.getElementById('illegal-goods-found');
                    const noIllegalGoodsEl = document.getElementById('no-illegal-goods');
                    
                    if (illegalGoodsEl) illegalGoodsEl.style.display = 'none';
                    if (noIllegalGoodsEl) noIllegalGoodsEl.style.display = 'block';
                }
                
                policeModal.style.opacity = '1';
                policeModal.style.pointerEvents = 'all';
            }
        }

        // Handle other encounters
        function handleOtherEncounter(encounter) {
            let message = "";
            let reward = 0;
            let damage = 0;
            let fuelLoss = 0;
            
            switch(encounter.type) {
                case 'trader':
                    // Trader encounter - get a random good at a discount
                    const good = gameState.goods[Math.floor(Math.random() * gameState.goods.length)];
                    const discount = 0.7 + Math.random() * 0.2; // 70-90% of normal price
                    const price = Math.round(gameState.currentSystem.market[good.id].buyPrice * discount);
                    
                    // Check if player can afford at least 1 unit
                    if (gameState.credits >= price) {
                        const quantity = Math.min(5, Math.floor(gameState.credits / price));
                        gameState.credits -= price * quantity;
                        
                        // Add to cargo
                        const existingItem = gameState.cargo.find(item => item.id === good.id);
                        if (existingItem) {
                            existingItem.quantity += quantity;
                        } else {
                            gameState.cargo.push({
                                id: good.id,
                                name: good.name,
                                quantity: quantity,
                                buyPrice: price,
                                illegal: good.illegal
                            });
                        }
                        
                        message = `Met a trader! Bought ${quantity} units of ${good.name} at ${Math.round(discount * 100)}% of market price.`;
                    } else {
                        message = "Met a trader but you don't have enough credits to buy anything.";
                    }
                    break;
                    
                case 'debris':
                    // Space debris - minor hull damage
                    damage = 5 + Math.floor(Math.random() * 10);
                    gameState.ship.hull = Math.max(0, gameState.ship.hull - damage);
                    message = `Hit space debris! Took ${damage}% hull damage.`;
                    break;
                    
                case 'distress':
                    // Distress signal - reward for helping
                    reward = 500 + Math.floor(Math.random() * 1500);
                    gameState.credits += reward;
                    message = `Rescued a stranded freighter! Received ${reward} CR reward.`;
                    break;
                    
                case 'anomaly':
                    // Spatial anomaly - random effect
                    const effect = Math.random();
                    if (effect < 0.3) {
                        // Positive effect - fuel boost
                        fuelLoss = -10;
                        gameState.fuel = Math.min(gameState.maxFuel, gameState.fuel + 10);
                        message = "Passed through a spatial anomaly. Gained 10 fuel units!";
                    } else if (effect < 0.7) {
                        // Negative effect - fuel loss
                        fuelLoss = 10 + Math.floor(Math.random() * 20);
                        gameState.fuel = Math.max(0, gameState.fuel - fuelLoss);
                        message = `Passed through a spatial anomaly. Lost ${fuelLoss} fuel units.`;
                    } else {
                        // Mixed effect
                        reward = 300 + Math.floor(Math.random() * 700);
                        damage = 5 + Math.floor(Math.random() * 15);
                        gameState.credits += reward;
                        gameState.ship.hull = Math.max(0, gameState.ship.hull - damage);
                        message = `Passed through a spatial anomaly. Gained ${reward} CR but took ${damage}% hull damage.`;
                    }
                    break;
            }
            
            showNotification(message);
            updateUI();
        }

        // Handle combat actions
        function handleCombatAction(action) {
            const log = document.getElementById('combat-log');
            if (!log) return;
            
            const closeCombatModal = () => {
                const combatModal = document.getElementById('combat-modal');
                if (combatModal) {
                    combatModal.style.opacity = '0';
                    combatModal.style.pointerEvents = 'none';
                }
            };
            
            if (action === 'attack') {
                // Player attacks pirate
                const damageDealt = Math.max(1, gameState.ship.damage - Math.floor(Math.random() * 3));
                gameState.pirateEncounter.hull -= damageDealt;
                
                log.innerHTML += `<p>You deal ${damageDealt} damage!</p>`;
                
                if (gameState.pirateEncounter.hull <= 0) {
                    // Pirate defeated
                    log.innerHTML += `<p><strong>Pirate destroyed!</strong></p>`;
                    
                    // Reward player (scaled by tier)
                    const reward = 500 + gameState.pirateEncounter.tier * 300;
                    gameState.credits += reward;
                    
                    log.innerHTML += `<p>+${reward} CR bounty!</p>`;
                    
                    setTimeout(() => {
                        closeCombatModal();
                        showNotification(`Pirate destroyed!`);
                        updateUI();
                    }, 3000);
                    return;
                }
                
                // Pirate attacks player
                if (Math.random() * 100 < gameState.pirateEncounter.accuracy) {
                    let damageTaken = Math.max(1, gameState.pirateEncounter.damage - Math.floor(Math.random() * 2));
                    
                    // Apply shield reduction
                    if (gameState.ship.shields > 0) {
                        const shieldReduction = Math.min(gameState.ship.shields, damageTaken);
                        damageTaken -= shieldReduction;
                        gameState.ship.shields -= shieldReduction;
                        log.innerHTML += `<p>Shields absorbed ${shieldReduction} damage!</p>`;
                    }
                    
                    gameState.ship.hull -= damageTaken;
                    log.innerHTML += `<p>Pirate deals ${damageTaken} damage!</p>`;
                    
                    if (gameState.ship.hull <= 0) {
                        // Player defeated
                        log.innerHTML += `<p><strong>Your ship destroyed!</strong></p>`;
                        
                        setTimeout(() => {
                            closeCombatModal();
                            showNotification("Your ship has been destroyed!");
                        }, 3000);
                    }
                } else {
                    log.innerHTML += `<p>Pirate attack missed!</p>`;
                }
            }
            else if (action === 'evade') {
                // Attempt to evade
                if (Math.random() * 100 < gameState.ship.evasion) {
                    log.innerHTML += `<p>Evasion successful!</p>`;
                } else {
                    let damageTaken = Math.max(1, gameState.pirateEncounter.damage - Math.floor(Math.random() * 2));
                    gameState.ship.hull -= damageTaken;
                    log.innerHTML += `<p>Evasion failed! ${damageTaken} damage.</p>`;
                }
            }
            else if (action === 'escape') {
                // Attempt to escape
                if (Math.random() > 0.3) {
                    log.innerHTML += `<p>Escape successful!</p>`;
                    
                    setTimeout(() => {
                        closeCombatModal();
                        showNotification("Escaped from pirates!");
                    }, 2000);
                } else {
                    let damageTaken = Math.max(3, gameState.pirateEncounter.damage + Math.floor(Math.random() * 5));
                    gameState.ship.hull -= damageTaken;
                    log.innerHTML += `<p>Escape failed! ${damageTaken} damage.</p>`;
                }
            }
            
            // Update UI
            const pirateHullEl = document.getElementById('pirate-hull');
            const playerHullEl = document.getElementById('player-hull');
            const playerShieldsEl = document.getElementById('player-shields');
            
            if (pirateHullEl) pirateHullEl.textContent = Math.max(0, gameState.pirateEncounter.hull) + '%';
            if (playerHullEl) playerHullEl.textContent = Math.max(0, gameState.ship.hull) + '%';
            if (playerShieldsEl) playerShieldsEl.textContent = Math.max(0, gameState.ship.shields) + '%';
            
            // Scroll to bottom of log
            log.scrollTop = log.scrollHeight;
        }

        // Handle police encounter
        function handlePoliceAction(action) {
            const policeModal = document.getElementById('police-modal');
            const illegalGoods = gameState.cargo.filter(item => item.illegal);
            
            if (action === 'comply') {
                if (illegalGoods.length > 0) {
                    // Calculate fine
                    const totalIllegalValue = illegalGoods.reduce((sum, item) => {
                        const marketItem = gameState.currentSystem.market[item.id];
                        return sum + marketItem.sellPrice * item.quantity;
                    }, 0);
                    
                    const finePercentage = 0.25 + Math.random() * 0.25; // 25-50%
                    const fineAmount = Math.min(gameState.credits * finePercentage, 5000 + totalIllegalValue);
                    
                    // Apply fine and confiscate goods
                    gameState.credits -= Math.round(fineAmount);
                    gameState.cargo = gameState.cargo.filter(item => !item.illegal);
                    
                    showNotification(`Paid ${Math.round(fineAmount)} CR fine and had illegal goods confiscated.`);
                } else {
                    showNotification("Police inspection completed. No illegal goods found.");
                }
            } else if (action === 'attack') {
                // Police are very strong (tier 12)
                const policeStats = {
                    hull: 150,
                    damage: 25,
                    accuracy: 80,
                    tier: 12
                };
                
                // Player attacks police
                const damageDealt = Math.max(1, gameState.ship.damage - Math.floor(Math.random() * 3));
                policeStats.hull -= damageDealt;
                
                if (policeStats.hull <= 0) {
                    // Police defeated (very unlikely)
                    showNotification("You defeated the police ship! But now you're a wanted criminal.");
                } else {
                    // Police counterattack
                    if (Math.random() * 100 < policeStats.accuracy) {
                        let damageTaken = Math.max(10, policeStats.damage + Math.floor(Math.random() * 10));
                        gameState.ship.hull -= damageTaken;
                        
                        if (gameState.ship.hull <= 0) {
                            showNotification("Your ship was destroyed by the police!");
                        } else {
                            showNotification(`Police counterattacked! Took ${damageTaken}% hull damage.`);
                        }
                    }
                }
            }
            
            if (policeModal) {
                policeModal.style.opacity = '0';
                policeModal.style.pointerEvents = 'none';
            }
            
            updateUI();
        }

        // Refuel ship
        function refuelShip() {
            const fuelNeeded = gameState.maxFuel - gameState.fuel;
            if (fuelNeeded <= 0) {
                showNotification('Fuel tank full!');
                return;
            }
            
            // Cost per unit based on tech level
            let costPerUnit;
            switch(gameState.currentSystem.techLevel) {
                case 'high': costPerUnit = 10; break;
                case 'medium': costPerUnit = 15; break;
                case 'low': costPerUnit = 20; break;
                default: costPerUnit = 15;
            }
            
            const totalCost = fuelNeeded * costPerUnit;
            if (gameState.credits < totalCost) {
                showNotification(`Need ${totalCost} CR`);
                return;
            }
            
            gameState.credits -= totalCost;
            gameState.fuel = gameState.maxFuel;
            showNotification(`Refueled to ${gameState.maxFuel} units`);
            updateUI();
        }

        // Handle contract actions
        function handleContract(contractId) {
            const contract = gameState.contracts.find(c => c.id === contractId);
            if (!contract) return;
            
            if (contract.type === 'hunt') {
                // Set target system for pirate hunt
                gameState.targetSystem = contract.targetSystem;
                showNotification(`Heading to ${contract.targetSystem.name} for pirate hunt.`);
            } else if (contract.type === 'delivery') {
                if (contract.originSystem === gameState.currentSystem) {
                    // Pick up goods
                    // Check if cargo space is available
                    const cargoSpace = gameState.cargo.reduce((sum, item) => sum + item.quantity, 0);
                    if (cargoSpace + contract.quantity > gameState.cargoCapacity) {
                        showNotification("Not enough cargo space for contract goods!");
                        return;
                    }
                    
                    // Add goods to cargo
                    const existingItem = gameState.cargo.find(item => item.id === contract.good);
                    if (existingItem) {
                        existingItem.quantity += contract.quantity;
                    } else {
                        const good = gameState.goods.find(g => g.id === contract.good);
                        gameState.cargo.push({
                            id: contract.good,
                            name: good.name,
                            quantity: contract.quantity,
                            buyPrice: 0, // Contract goods have no purchase cost
                            illegal: good.illegal,
                            contractId: contract.id
                        });
                    }
                    
                    showNotification(`Picked up ${contract.quantity} units of ${good.name} for delivery.`);
                } else if (contract.targetSystem === gameState.currentSystem) {
                    // Deliver goods
                    const cargoItem = gameState.cargo.find(item => item.id === contract.good && item.contractId === contract.id);
                    if (!cargoItem || cargoItem.quantity < contract.quantity) {
                        showNotification("You don't have the contract goods!");
                        return;
                    }
                    
                    // Complete delivery
                    cargoItem.quantity -= contract.quantity;
                    if (cargoItem.quantity === 0) {
                        gameState.cargo = gameState.cargo.filter(item => item.id !== contract.good || item.quantity > 0);
                    }
                    
                    gameState.credits += contract.reward;
                    contract.completed = true;
                    
                    showNotification(`Contract completed! Received ${contract.reward} CR.`);
                }
            }
            
            updateUI();
        }

        // Show notification
        function showNotification(message) {
            const notification = document.getElementById('notification');
            if (!notification) return;
            
            notification.textContent = message;
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(-50%) translateY(0)';
            
            setTimeout(() => {
                notification.style.opacity = '0';
                notification.style.transform = 'translateX(-50%) translateY(-20px)';
            }, 3000);
        }

        // Show system info panel
        function showSystemInfo(system, x, y) {
            const panel = document.getElementById('system-info-panel');
            if (!panel) return;
            
            panel.innerHTML = `
                <h3>${system.name}</h3>
                <div class="stat">
                    <span>Economy:</span>
                    <span class="stat-value">${system.economy.charAt(0).toUpperCase() + system.economy.slice(1)}</span>
                </div>
                <div class="stat">
                    <span>Tech Level:</span>
                    <span class="stat-value">${system.techLevel.charAt(0).toUpperCase() + system.techLevel.slice(1)}</span>
                </div>
                <div class="stat">
                    <span>Security:</span>
                    <span class="stat-value">${system.security.charAt(0).toUpperCase() + system.security.slice(1)}</span>
                </div>
            `;
            
            panel.style.left = `${x + 10}px`;
            panel.style.top = `${y}px`;
            panel.style.opacity = '1';
        }

        // Hide system info panel
        function hideSystemInfo() {
            const panel = document.getElementById('system-info-panel');
            if (panel) panel.style.opacity = '0';
        }

        // Setup event listeners
        function setupEventListeners() {
            // System selection
            const systemContainer = document.getElementById('system-container');
            
            if (systemContainer) {
                // System selection
                systemContainer.addEventListener('click', (e) => {
                    if (e.target.classList.contains('system-dot')) {
                        const systemId = parseInt(e.target.dataset.id);
                        const system = gameState.galaxy.find(s => s.id === systemId);
                        
                        if (system && system !== gameState.currentSystem) {
                            gameState.targetSystem = system;
                            updateUI();
                            showNotification(`Target: ${system.name}`);
                        }
                    }
                });
                
                // System hover info
                systemContainer.addEventListener('mousemove', (e) => {
                    if (e.target.classList.contains('system-dot')) {
                        const systemId = parseInt(e.target.dataset.id);
                        const system = gameState.galaxy.find(s => s.id === systemId);
                        
                        if (system) {
                            showSystemInfo(system, e.clientX, e.clientY);
                        }
                    }
                });
                
                systemContainer.addEventListener('mouseleave', hideSystemInfo);
                
                // Touch support for mobile
                systemContainer.addEventListener('touchmove', (e) => {
                    const touch = e.touches[0];
                    const element = document.elementFromPoint(touch.clientX, touch.clientY);
                    
                    if (element && element.classList.contains('system-dot')) {
                        const systemId = parseInt(element.dataset.id);
                        const system = gameState.galaxy.find(s => s.id === systemId);
                        
                        if (system) {
                            showSystemInfo(system, touch.clientX, touch.clientY);
                        }
                    }
                });
                
                systemContainer.addEventListener('touchend', hideSystemInfo);
            }
            
            // Travel button
            const travelBtn = document.getElementById('travel-btn');
            if (travelBtn) travelBtn.addEventListener('click', travelToSystem);
            
            // Refuel button
            const refuelBtn = document.getElementById('refuel-btn');
            if (refuelBtn) refuelBtn.addEventListener('click', refuelShip);
            
            // Combat buttons
            const attackBtn = document.getElementById('attack-btn');
            const evadeBtn = document.getElementById('evade-btn');
            const escapeBtn = document.getElementById('escape-btn');
            
            if (attackBtn) attackBtn.addEventListener('click', () => handleCombatAction('attack'));
            if (evadeBtn) evadeBtn.addEventListener('click', () => handleCombatAction('evade'));
            if (escapeBtn) escapeBtn.addEventListener('click', () => handleCombatAction('escape'));
            
            // Police buttons
            const complyBtn = document.getElementById('comply-btn');
            const attackPoliceBtn = document.getElementById('attack-police-btn');
            
            if (complyBtn) complyBtn.addEventListener('click', () => handlePoliceAction('comply'));
            if (attackPoliceBtn) attackPoliceBtn.addEventListener('click', () => handlePoliceAction('attack'));
            
            // Map movement buttons
            document.getElementById('move-up').addEventListener('click', () => moveMap(0, -30));
            document.getElementById('move-down').addEventListener('click', () => moveMap(0, 30));
            document.getElementById('move-left').addEventListener('click', () => moveMap(-30, 0));
            document.getElementById('move-right').addEventListener('click', () => moveMap(30, 0));
            
            // Contract buttons
            document.addEventListener('click', (e) => {
                if (e.target.classList.contains('contract-button')) {
                    const contractId = e.target.dataset.contract;
                    handleContract(contractId);
                }
            });
            
            // Tab switching
            document.querySelectorAll('.tab').forEach(tab => {
                tab.addEventListener('click', () => {
                    // Update active tab
                    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                    
                    // Show correct tab content
                    const tabName = tab.dataset.tab;
                    document.querySelectorAll('.panel-section').forEach(section => {
                        section.style.display = 'none';
                    });
                    const activeTab = document.querySelector(`.${tabName}-tab`);
                    if (activeTab) activeTab.style.display = 'block';
                });
            });
        }

        // Initialization when page loads
        window.addEventListener('load', () => {
            // Galaxy size selection
            document.querySelectorAll('.size-option').forEach(option => {
                option.addEventListener('click', () => {
                    // Highlight selection
                    document.querySelectorAll('.size-option').forEach(o => o.classList.remove('selected'));
                    option.classList.add('selected');
                    
                    // Start game after brief pause
                    setTimeout(() => {
                        const size = parseInt(option.dataset.size);
                        const initScreen = document.getElementById('init-screen');
                        const gameContent = document.getElementById('game-content');
                        
                        if (initScreen) initScreen.style.display = 'none';
                        if (gameContent) gameContent.style.display = 'flex';
                        
                        initGame(size);
                    }, 300);
                });
            });
        });