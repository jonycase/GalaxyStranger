export class UI {
    constructor(gameState, encounterManager) {
        this.gameState = gameState;
        this.encounterManager = encounterManager;
    }
    
    // Canvas setup and rendering
    setupCanvas() {
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
        this.gameState.galaxy.forEach(system => {
            const systemDot = document.createElement('div');
            systemDot.className = 'system-dot';
            systemDot.dataset.id = system.id;
            systemDot.style.left = `${system.x - 6 + this.gameState.ship.mapOffsetX}px`;
            systemDot.style.top = `${system.y - 6 + this.gameState.ship.mapOffsetY}px`;
            
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
            systemName.style.left = `${system.x + 10 + this.gameState.ship.mapOffsetX}px`;
            systemName.style.top = `${system.y - 25 + this.gameState.ship.mapOffsetY}px`;
            
            systemContainer.appendChild(systemDot);
            systemContainer.appendChild(systemName);
            
            // Highlight current system
            if (system === this.gameState.currentSystem) {
                systemDot.classList.add('selected-system');
                
                // Draw ship
                const shipIndicator = document.createElement('div');
                shipIndicator.className = 'ship-indicator';
                shipIndicator.style.left = `${system.x - 12 + this.gameState.ship.mapOffsetX}px`;
                shipIndicator.style.top = `${system.y - 12 + this.gameState.ship.mapOffsetY}px`;
                shipContainer.appendChild(shipIndicator);
            }
        });
    }

    // Move the galaxy map
    moveMap(dx, dy) {
        this.gameState.ship.mapOffsetX += dx;
        this.gameState.ship.mapOffsetY += dy;
        
        // Constrain movement to reasonable bounds
        this.gameState.ship.mapOffsetX = Math.max(-300, Math.min(300, this.gameState.ship.mapOffsetX));
        this.gameState.ship.mapOffsetY = Math.max(-200, Math.min(200, this.gameState.ship.mapOffsetY));
        
        this.setupCanvas();
    }

    // Create travel animation effect
    createTravelEffect() {
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
    updateUI() {
        // Update stats
        const creditsEl = document.getElementById('credits');
        const fuelEl = document.getElementById('fuel');
        const hullEl = document.getElementById('hull');
        const cargoSpaceEl = document.getElementById('cargo-space');
        const targetSystemEl = document.getElementById('target-system');
        const distanceEl = document.getElementById('distance');
        const fuelCostEl = document.getElementById('fuel-cost');
        
        if (creditsEl) creditsEl.textContent = this.gameState.credits.toLocaleString() + ' CR';
        if (fuelEl) fuelEl.textContent = `${Math.round(this.gameState.fuel)}/${this.gameState.maxFuel}`;
        if (hullEl) hullEl.textContent = this.gameState.ship.hull + '%';
        
        const cargoSpace = this.gameState.cargo.reduce((sum, item) => sum + item.quantity, 0);
        if (cargoSpaceEl) cargoSpaceEl.textContent = `${cargoSpace}/${this.gameState.cargoCapacity}`;
        
        // Update target system info
        if (this.gameState.targetSystem) {
            if (targetSystemEl) targetSystemEl.textContent = this.gameState.targetSystem.name;
            const distance = this.gameState.calculateDistance(this.gameState.currentSystem, this.gameState.targetSystem);
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
        if (marketContainer && this.gameState.currentSystem) {
            marketContainer.innerHTML = `
                <div class="market-header">COMMODITY</div>
                <div class="market-header">BUY</div>
                <div class="market-header">SELL</div>
                <div class="market-header">ACTIONS</div>
            `;
            
            this.gameState.goods.forEach(good => {
                const marketItem = this.gameState.currentSystem.market[good.id];
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
            
            if (this.gameState.cargo.length === 0) {
                const emptyItem = document.createElement('div');
                emptyItem.className = 'cargo-item';
                emptyItem.innerHTML = '<span style="grid-column: 1 / span 3; text-align: center; color: #8888ff;">Cargo hold is empty</span>';
                cargoContainer.appendChild(emptyItem);
            } else {
                this.gameState.cargo.forEach(item => {
                    const marketItem = this.gameState.currentSystem.market[item.id];
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
                if (this.gameState.currentSystem && this.gameState.currentSystem.hasShipyard) {
                    shipyardStatusEl.textContent = 'Available upgrades:';
                    
                    this.gameState.upgrades.forEach(upgrade => {
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
        this.updateSystemOverview();
        
        // Update contracts
        this.updateContractsList();
        
        // Setup market and cargo button event listeners
        document.querySelectorAll('[data-good]').forEach(button => {
            button.addEventListener('click', (e) => {
                const goodId = e.target.dataset.good;
                const action = e.target.dataset.action;
                const result = this.gameState.tradeItem(goodId, action);
                if (result.success) {
                    this.showNotification(result.message);
                } else {
                    this.showNotification(result.message);
                }
                this.updateUI();
            });
        });
        
        // Setup upgrade button event listeners
        document.querySelectorAll('[data-upgrade]').forEach(button => {
            button.addEventListener('click', (e) => {
                const upgradeId = e.target.dataset.upgrade;
                const result = this.gameState.upgradeShip(upgradeId);
                if (result.success) {
                    this.showNotification(result.message);
                } else {
                    this.showNotification(result.message);
                }
                this.updateUI();
            });
        });
        
        // Update galaxy view
        this.updateGalaxyView();
    }

    // Update system overview panel
    updateSystemOverview() {
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
        
        // Only update if currentSystem exists
        if (this.gameState.currentSystem) {
            if (currentSystemName) currentSystemName.textContent = this.gameState.currentSystem.name;
            if (currentSystemEconomy) currentSystemEconomy.textContent = `Economy: ${this.gameState.currentSystem.economy.charAt(0).toUpperCase() + this.gameState.currentSystem.economy.slice(1)}`;
            if (currentSystemSecurity) currentSystemSecurity.textContent = `Security: ${this.gameState.currentSystem.security.charAt(0).toUpperCase() + this.gameState.currentSystem.security.slice(1)}`;
            
            if (overviewFuel) overviewFuel.textContent = `${this.gameState.fuel}/${this.gameState.maxFuel} units`;
            
            // Calculate refuel cost
            let costPerUnit;
            switch(this.gameState.currentSystem.techLevel) {
                case 'high': costPerUnit = 10; break;
                case 'medium': costPerUnit = 15; break;
                case 'low': costPerUnit = 20; break;
                default: costPerUnit = 15;
            }
            const fuelNeeded = this.gameState.maxFuel - this.gameState.fuel;
            const totalCost = fuelNeeded * costPerUnit;
            if (overviewRefuelCost) overviewRefuelCost.textContent = `Refuel cost: ${totalCost} CR`;
            
            // Calculate cargo value
            const cargoSpace = this.gameState.cargo.reduce((sum, item) => sum + item.quantity, 0);
            let cargoValue = 0;
            this.gameState.cargo.forEach(item => {
                const marketItem = this.gameState.currentSystem.market[item.id];
                cargoValue += marketItem.sellPrice * item.quantity;
            });
            if (overviewCargo) overviewCargo.textContent = `${cargoSpace}/${this.gameState.cargoCapacity} units`;
            if (overviewCargoValue) overviewCargoValue.textContent = `Value: ${cargoValue.toLocaleString()} CR`;
            
            // Calculate threat level
            let threatLevel = "Low";
            let pirateChance = 0.4;
            if (this.gameState.currentSystem.security === 'low') {
                threatLevel = "High";
                pirateChance = 0.5;
            } else if (this.gameState.currentSystem.security === 'medium') {
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
                const nearby = this.gameState.galaxy.filter(system => {
                    if (system === this.gameState.currentSystem) return false;
                    const distance = this.gameState.calculateDistance(this.gameState.currentSystem, system);
                    return distance <= 50;
                });
                
                // Sort by distance
                nearby.sort((a, b) => {
                    const distA = this.gameState.calculateDistance(this.gameState.currentSystem, a);
                    const distB = this.gameState.calculateDistance(this.gameState.currentSystem, b);
                    return distA - distB;
                });
                
                // Show up to 5 nearest systems
                nearby.slice(0, 5).forEach(system => {
                    const distance = this.gameState.calculateDistance(this.gameState.currentSystem, system);
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
    }

    // Update contracts list
    updateContractsList() {
        const contractsList = document.getElementById('contracts-list');
        if (!contractsList) return;
        
        contractsList.innerHTML = '';
        
        if (this.gameState.contracts.length === 0) {
            contractsList.innerHTML = '<div style="text-align: center; padding: 10px; color: #8888ff;">No contracts available</div>';
            return;
        }
        
        this.gameState.contracts.forEach(contract => {
            if (contract.completed) return;
            
            const contractEl = document.createElement('div');
            contractEl.className = 'contract-item';
            
            let buttonText = "Accept";
            if (contract.type === 'delivery' && contract.originSystem === this.gameState.currentSystem) {
                buttonText = "Pick Up";
            } else if (contract.type === 'delivery' && contract.targetSystem === this.gameState.currentSystem) {
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
    updateGalaxyView() {
        const systemContainer = document.getElementById('system-container');
        const shipContainer = document.getElementById('ship-container');
        if (!systemContainer || !shipContainer) return;
        
        // Clear ship container
        shipContainer.innerHTML = '';
        
        // Update all systems
        systemContainer.querySelectorAll('.system-dot').forEach(dot => {
            const systemId = parseInt(dot.dataset.id);
            const system = this.gameState.galaxy.find(s => s.id === systemId);
            
            dot.style.left = `${system.x - 6 + this.gameState.ship.mapOffsetX}px`;
            dot.style.top = `${system.y - 6 + this.gameState.ship.mapOffsetY}px`;
            
            if (system === this.gameState.currentSystem) {
                dot.classList.add('selected-system');
                
                // Draw ship
                const shipIndicator = document.createElement('div');
                shipIndicator.className = 'ship-indicator';
                shipIndicator.style.left = `${system.x - 12 + this.gameState.ship.mapOffsetX}px`;
                shipIndicator.style.top = `${system.y - 12 + this.gameState.ship.mapOffsetY}px`;
                shipContainer.appendChild(shipIndicator);
            } else {
                dot.classList.remove('selected-system');
            }
            
            if (system === this.gameState.targetSystem) {
                dot.style.boxShadow = '0 0 10px #ffcc66, 0 0 20px #ffcc66';
            } else {
                dot.style.boxShadow = '0 0 10px currentColor';
            }
        });
        
        // Update system names
        systemContainer.querySelectorAll('.system-name').forEach(nameEl => {
            const systemId = parseInt(nameEl.parentElement.querySelector('.system-dot').dataset.id);
            const system = this.gameState.galaxy.find(s => s.id === systemId);
            nameEl.style.left = `${system.x + 10 + this.gameState.ship.mapOffsetX}px`;
            nameEl.style.top = `${system.y - 25 + this.gameState.ship.mapOffsetY}px`;
        });
    }

    // Show notification
    showNotification(message) {
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
    showSystemInfo(system, x, y) {
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
    hideSystemInfo() {
        const panel = document.getElementById('system-info-panel');
        if (panel) panel.style.opacity = '0';
    }

    // Setup event listeners
    setupEventListeners() {
        // System selection
        const systemContainer = document.getElementById('system-container');
        if (systemContainer) {
            // System selection
            systemContainer.addEventListener('click', (e) => {
                if (e.target.classList.contains('system-dot')) {
                    const systemId = parseInt(e.target.dataset.id);
                    const system = this.gameState.galaxy.find(s => s.id === systemId);
                    if (system && system !== this.gameState.currentSystem) {
                        this.gameState.targetSystem = system;
                        this.updateUI();
                        this.showNotification(`Target: ${system.name}`);
                    }
                }
            });
            
            // System hover info
            systemContainer.addEventListener('mousemove', (e) => {
                if (e.target.classList.contains('system-dot')) {
                    const systemId = parseInt(e.target.dataset.id);
                    const system = this.gameState.galaxy.find(s => s.id === systemId);
                    if (system) {
                        this.showSystemInfo(system, e.clientX, e.clientY);
                    }
                }
            });
            
            systemContainer.addEventListener('mouseleave', () => this.hideSystemInfo());
            
            // Touch support for mobile
            systemContainer.addEventListener('touchmove', (e) => {
                const touch = e.touches[0];
                const element = document.elementFromPoint(touch.clientX, touch.clientY);
                if (element && element.classList.contains('system-dot')) {
                    const systemId = parseInt(element.dataset.id);
                    const system = this.gameState.galaxy.find(s => s.id === systemId);
                    if (system) {
                        this.showSystemInfo(system, touch.clientX, touch.clientY);
                    }
                }
            });
            
            systemContainer.addEventListener('touchend', () => this.hideSystemInfo());
        }
        
        // Travel button
        const travelBtn = document.getElementById('travel-btn');
        if (travelBtn) travelBtn.addEventListener('click', () => {
            const result = this.gameState.travelToSystem();
            if (!result.success) {
                this.showNotification(result.message);
                return;
            }
            
            this.showNotification(result.message);
            this.createTravelEffect();
            
            // Animate travel
            const startTime = Date.now();
            const travelDuration = 3000;
            
            const animateTravel = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / travelDuration, 1);
                this.gameState.ship.travelProgress = progress;
                
                // Draw ship at current position
                const shipContainer = document.getElementById('ship-container');
                if (shipContainer) {
                    shipContainer.innerHTML = '';
                    const currentX = this.gameState.ship.x + (this.gameState.ship.targetX - this.gameState.ship.x) * progress;
                    const currentY = this.gameState.ship.y + (this.gameState.ship.targetY - this.gameState.ship.y) * progress;
                    
                    const shipIndicator = document.createElement('div');
                    shipIndicator.className = 'ship-indicator';
                    shipIndicator.style.left = `${currentX - 12 + this.gameState.ship.mapOffsetX}px`;
                    shipIndicator.style.top = `${currentY - 12 + this.gameState.ship.mapOffsetY}px`;
                    shipContainer.appendChild(shipIndicator);
                }
                
                if (progress < 1) {
                    requestAnimationFrame(animateTravel);
                } else {
                    // Travel complete
                    const result = this.gameState.completeTravel();
                    this.showNotification(result.message);
                    
                    // Determine encounter chance based on security
                    let pirateChance = 0.4;
                    if (this.gameState.currentSystem.security === 'low') pirateChance = 0.5;
                    else if (this.gameState.currentSystem.security === 'high') pirateChance = 0.3;
                    
                    // Random event chance
                    if (Math.random() < pirateChance) {
                        const encounter = this.encounterManager.getRandomEncounter();
                        this.encounterManager.startEncounter(encounter.type);
                    }
                    
                    this.updateUI();
                }
            };
            
            animateTravel();
        });
        
        // Refuel button
        const refuelBtn = document.getElementById('refuel-btn');
        if (refuelBtn) refuelBtn.addEventListener('click', () => {
            const result = this.gameState.refuelShip();
            if (result.success) {
                this.showNotification(result.message);
            } else {
                this.showNotification(result.message);
            }
            this.updateUI();
        });
        
        // Map movement buttons
        document.getElementById('move-up').addEventListener('click', () => this.moveMap(0, -30));
        document.getElementById('move-down').addEventListener('click', () => this.moveMap(0, 30));
        document.getElementById('move-left').addEventListener('click', () => this.moveMap(-30, 0));
        document.getElementById('move-right').addEventListener('click', () => this.moveMap(30, 0));
        
        // Contract buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('contract-button')) {
                const contractId = e.target.dataset.contract;
                const result = this.gameState.handleContract(contractId);
                if (result.success) {
                    this.showNotification(result.message);
                } else {
                    this.showNotification(result.message);
                }
                this.updateUI();
            }
        });
        
        // Encounter action buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('combat-btn')) {
                const action = e.target.dataset.action;
                if (action) {
                    this.encounterManager.handleEncounterAction(action);
                }
            }
        });
        
        // Tab switching
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => {
                // Update active tab
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                // Show correct tab content
                document.querySelectorAll('.panel-section').forEach(section => {
                    section.style.display = 'none';
                });
                
                const tabName = tab.dataset.tab;
                const activeTab = document.querySelector(`.${tabName}-tab`);
                if (activeTab) activeTab.style.display = 'block';
            });
        });
    }
}