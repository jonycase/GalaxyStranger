// UI.js
function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// Global flag for travel state
let isTraveling = false;

export class UI {
    constructor(gameState, encounterManager) {
        this.gameState = gameState;
        this.encounterManager = encounterManager;

        // Camera properties
        this.camera = {
            x: 0,
            y: 0,
            zoom: 6,
            minZoom: 1,
            maxZoom: 15
        };

        // Pools & active sets
        this.systemPool = [];
        this.namePool = [];
        this.activeSystems = new Map();
        this.systemMap = new Map();

        // DOM refs
        this.galaxyCanvas = null;
        this.systemContainer = null;
        this.shipContainer = null;
        this.shipIndicatorEl = null;

        // Internal update scheduling
        this.pendingUpdate = false;
        this.cameraControlsInitialized = false;

        // Bindings
        this._onAnimationFrame = this._onAnimationFrame.bind(this);

        // Block clicks while traveling
        document.addEventListener('click', (e) => {
            if (isTraveling && e.target.closest('button')) {
                this.showNotification("Cannot interact while traveling!");
                e.preventDefault();
            }
        }, true);
        
        // Setup app event listeners
        this.setupAppEventListeners();
    }

    setupCanvas() {
        this.galaxyCanvas = document.getElementById('galaxy-canvas');
        this.systemContainer = document.getElementById('system-container');
        this.shipContainer = document.getElementById('ship-container');

        if (!this.galaxyCanvas || !this.systemContainer || !this.shipContainer) return;

        // Force CSS touch-action to prevent browser scrolling
        this.galaxyCanvas.style.touchAction = 'none';

        // Initial resize to ensure canvas dimension matches CSS dimension
        this.handleResize();

        // Cache systems in a Map for O(1) lookup later
        this.systemMap.clear();
        this.gameState.galaxy.forEach(sys => this.systemMap.set(sys.id, sys));

        // Pre-create a small pool to avoid creating nodes constantly
        this._createPool(Math.min(120, Math.max(40, Math.floor(this.gameState.galaxySize / 10))));

        // Create ship indicator (single element only)
        this.shipContainer.innerHTML = '';
        const shipIndicator = document.createElement('div');
        shipIndicator.className = 'ship-indicator';
        shipIndicator.innerHTML = '<i class="fas fa-space-shuttle"></i>';
        this.shipIndicatorEl = shipIndicator;
        this.shipContainer.appendChild(this.shipIndicatorEl);

        // Center camera on ship initially
        this.centerCameraOnShip();

        // Setup interaction listeners (Clicks/Hover)
        this.setupInput();
        
        // Setup Pan/Zoom controls
        this.setupCameraControls();

        // Resize observer to resize canvas and schedule update
        window.addEventListener('resize', () => {
            this.handleResize();
            this.scheduleUpdate();
        });

        // Start the RAF loop
        requestAnimationFrame(this._onAnimationFrame);
        
        // Ensure there's no leftover DOM from a previous run
        Array.from(this.systemContainer.children).forEach(el => {
            if (el.id == 'map-center-btn') return;
            if (el.id == 'centerBtn') return;
            el.remove();
        });
        this.systemPool.length = 0;
        this.namePool.length = 0;
        this.activeSystems.clear();
    }

    // Fix for background rendering issue
    handleResize() {
        if (!this.galaxyCanvas) return;
        
        const displayWidth = this.galaxyCanvas.clientWidth;
        const displayHeight = this.galaxyCanvas.clientHeight;

        // Only resize if dimensions actually changed
        if (this.galaxyCanvas.width !== displayWidth || this.galaxyCanvas.height !== displayHeight) {
            this.galaxyCanvas.width = displayWidth;
            this.galaxyCanvas.height = displayHeight;
            this.drawBackground(); // Redraw stars immediately
        }
    }
    
    // Create initial DOM pool
    _createPool(size) {
        for (let i = 0; i < size; i++) {
            const dot = document.createElement('div');
            dot.className = 'system-dot';
            dot.style.pointerEvents = 'auto';

            const name = document.createElement('div');
            name.className = 'system-name';
            name.style.pointerEvents = 'none';

            // Pools keep nodes detached until needed
            this.systemPool.push(dot);
            this.namePool.push(name);
        }
    }

    // Acquire DOM pair from pool (creating more if needed)
    _acquireElements() {
        if (this.systemPool.length === 0) this._createPool(20);
        const dot = this.systemPool.pop();
        const name = this.namePool.pop();

        // Defensive clean
        if (dot) {
            dot.dataset.id = '';
            dot.className = 'system-dot';
            if (dot.parentNode) dot.parentNode.removeChild(dot);
            dot.style.pointerEvents = 'auto';
        }
        if (name) {
            name.textContent = '';
            name.className = 'system-name';
            if (name.parentNode) name.parentNode.removeChild(name);
            name.style.pointerEvents = 'none';
        }

        return { dot, name };
    }

    // Release DOM pair back to pool
    _releaseElements(pair) {
        if (!pair) return;

        const dot = pair.dot || pair.dotEl || null;
        const name = pair.name || pair.nameEl || null;

        try {
            if (dot && dot.parentNode) dot.parentNode.removeChild(dot);
            if (name && name.parentNode) name.parentNode.removeChild(name);
        } catch (e) {
            // ignore DOM removal errors
        }

        if (dot) {
            dot.dataset.id = '';
            dot.className = 'system-dot';
            dot.style.backgroundColor = '';
            dot.style.left = '';
            dot.style.top = '';
            dot.style.boxShadow = '';
            dot.style.pointerEvents = 'auto';
            this.systemPool.push(dot);
        }

        if (name) {
            name.textContent = '';
            name.className = 'system-name';
            name.style.left = '';
            name.style.top = '';
            this.namePool.push(name);
        }
    }

    // Convert screen bounds -> world bounds
    _getVisibleWorldRect(margin = 80) {
        const w = this.galaxyCanvas.width;
        const h = this.galaxyCanvas.height;
        const halfW = w / 2 / this.camera.zoom;
        const halfH = h / 2 / this.camera.zoom;
        return {
            left: this.camera.x - halfW - margin / this.camera.zoom,
            right: this.camera.x + halfW + margin / this.camera.zoom,
            top: this.camera.y - halfH - margin / this.camera.zoom,
            bottom: this.camera.y + halfH + margin / this.camera.zoom
        };
    }

    // Schedule an update on next rAF
    scheduleUpdate() {
        if (this.pendingUpdate) return;
        this.pendingUpdate = true;
        requestAnimationFrame(() => {
            this.pendingUpdate = false;
            this._updateView();
        });
    }

    // main rAF tick
    _onAnimationFrame() {
        this.updateShipPosition();
        requestAnimationFrame(this._onAnimationFrame);
    }

    // Draw static galaxy background
    drawBackground() {
        if (!this.galaxyCanvas) return;
        const ctx = this.galaxyCanvas.getContext('2d');
        ctx.clearRect(0, 0, this.galaxyCanvas.width, this.galaxyCanvas.height);
        ctx.fillStyle = '#000033';
        ctx.fillRect(0, 0, this.galaxyCanvas.width, this.galaxyCanvas.height);

        ctx.fillStyle = '#ffffff';
        const starCount = Math.min(900, Math.floor((this.galaxyCanvas.width * this.galaxyCanvas.height) / 2000));
        for (let i = 0; i < starCount; i++) {
            const x = Math.random() * this.galaxyCanvas.width;
            const y = Math.random() * this.galaxyCanvas.height;
            const size = Math.random() * 1.8;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Rebuild active set based on camera viewport
    _updateView() {
        if (!this.systemContainer || !this.galaxyCanvas) return;

        const rect = this._getVisibleWorldRect(120);
        const activeSet = this.activeSystems;
        const sysMap = this.systemMap;

        // Quick pass: mark active systems that go out of view
        for (const [id, elements] of activeSet.entries()) {
            const sys = sysMap.get(id);
            if (!sys) {
                this._releaseElements(elements);
                activeSet.delete(id);
                continue;
            }
            if (sys.x < rect.left || sys.x > rect.right || sys.y < rect.top || sys.y > rect.bottom) {
                this._releaseElements(elements);
                activeSet.delete(id);
            }
        }

        // Add visible systems that are not active yet
        for (let i = 0, len = this.gameState.galaxy.length; i < len; i++) {
            const sys = this.gameState.galaxy[i];
            if (sys.x >= rect.left && sys.x <= rect.right && sys.y >= rect.top && sys.y <= rect.bottom) {
                if (!activeSet.has(sys.id)) {
                    const { dot, name } = this._acquireElements();
                    dot.dataset.id = sys.id;
                    dot.style.backgroundColor = sys.discovered ? this._getEconomyColor(sys.economy) : '#666666';
                    name.textContent = sys.discovered ? sys.name : '???';
                    
                    this.systemContainer.appendChild(dot);
                    this.systemContainer.appendChild(name);
                    activeSet.set(sys.id, { dotEl: dot, nameEl: name });
                }
            }
        }

        // Update positions + visuals
        for (const [id, elements] of activeSet.entries()) {
            const sys = sysMap.get(id);
            if (!sys) continue;
            const screenX = (sys.x - this.camera.x) * this.camera.zoom + this.galaxyCanvas.width / 2;
            const screenY = (sys.y - this.camera.y) * this.camera.zoom + this.galaxyCanvas.height / 2;

            const dotEl = elements.dotEl;
            const nameEl = elements.nameEl;

            dotEl.style.left = `${Math.round(screenX - 6)}px`;
            dotEl.style.top = `${Math.round(screenY - 6)}px`;

            nameEl.style.left = `${Math.round(screenX + 10)}px`;
            nameEl.style.top = `${Math.round(screenY - 25)}px`;
            nameEl.textContent = sys.discovered ? sys.name : '???';

            const desiredColor = sys.discovered ? this._getEconomyColor(sys.economy) : '#666666';
            if (dotEl.style.backgroundColor !== desiredColor) {
                dotEl.style.backgroundColor = desiredColor;
            }

            dotEl.classList.toggle('selected-system', sys === this.gameState.currentSystem);
            dotEl.style.boxShadow = (sys === this.gameState.targetSystem) ? '0 0 10px #ffcc66, 0 0 20px #ffcc66' : '0 0 10px currentColor';
        }

        this.updateShipPosition();
    }

    _getEconomyColor(economy) {
        switch (economy) {
            case 'unpopulated': return '#bf683f';
            case 'agricultural': return '#66cc66';
            case 'industrial': return '#cc6666';
            case 'tech': return '#6666cc';
            case 'mining': return '#cccc66';
            case 'trade': return '#cc66cc';
            case 'military': return '#cc6666';
            default: return '#aaaaaa';
        }
    }

    centerCameraOnShip() {
        this.camera.x = this.gameState.ship.x;
        this.camera.y = this.gameState.ship.y;
        this.camera.zoom = 3.0;
        this.scheduleUpdate();
    }

    moveCamera(dx, dy) {
        this.camera.x += dx / this.camera.zoom;
        this.camera.y += dy / this.camera.zoom;
        this.scheduleUpdate();
    }

    setZoom(zoom) {
        this.camera.zoom = Math.max(this.camera.minZoom, Math.min(this.camera.maxZoom, zoom));
        this.scheduleUpdate();
    }

    updateShipPosition() {
        if (!this.shipIndicatorEl || !this.gameState.currentSystem || !this.galaxyCanvas) return;
        const screenX = (this.gameState.ship.x - this.camera.x) * this.camera.zoom + this.galaxyCanvas.width / 2;
        const screenY = (this.gameState.ship.y - this.camera.y) * this.camera.zoom + this.galaxyCanvas.height / 2;
        this.shipIndicatorEl.style.left = `${Math.round(screenX - 12)}px`;
        this.shipIndicatorEl.style.top = `${Math.round(screenY - 12)}px`;
        this.shipIndicatorEl.style.transform = `rotate(${this.gameState.ship.rotation}deg)`;
    }

    // UI update (stats, market, etc.)
    updateUI() {
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
        
        if (this.gameState.targetSystem) {
            if (targetSystemEl) targetSystemEl.textContent = this.gameState.targetSystem.discovered ? 
                this.gameState.targetSystem.name : 'Unknown System';
            const distance = this.gameState.calculateDistance(this.gameState.currentSystem, this.gameState.targetSystem);
            if (distanceEl) distanceEl.textContent = Math.round(distance * 10) / 10 + ' LY';
            const fuelCost = Math.ceil(distance);
            if (fuelCostEl) fuelCostEl.textContent = fuelCost;
        } else {
            if (targetSystemEl) targetSystemEl.textContent = 'None';
            if (distanceEl) distanceEl.textContent = '0 LY';
            if (fuelCostEl) fuelCostEl.textContent = '0';
        }
        
        const marketContainer = document.querySelector('.market-grid');
        if (marketContainer && this.gameState.currentSystem) {
            if (!this.gameState.currentSystem.hasMarket) {
                marketContainer.innerHTML = '<div class="no-market-message">Market not available in this system</div>';
            } else {
                marketContainer.innerHTML = `
                    <div class="market-header">COMMODITY</div>
                    <div class="market-header">BUY</div>
                    <div class="market-header">SELL</div>
                    <div class="market-header">STOCK</div>
                    <div class="market-header">ACTIONS</div>
                `;
                
                this.gameState.goods.forEach(good => {
                    const marketItem = this.gameState.currentSystem.market[good.id];
                    if (!marketItem) return;
        
                    const marketElement = document.createElement('div');
                    marketElement.className = 'market-item';
                    
                    const illegalIndicator = marketItem.illegal ? '<i class="fas fa-exclamation-triangle" style="color: #ff6666;"></i> ' : '';
                    const stockIndicator = marketItem.quantity > 0 ? 
                        `<span style="color: #66ff99;">${marketItem.quantity}</span>` : 
                        `<span style="color: #ff6666;">0</span>`;
                    
                    marketElement.innerHTML = `
                        <span>${illegalIndicator}${marketItem.name}</span>
                        <span>${marketItem.buyPrice} CR</span>
                        <span>${marketItem.sellPrice} CR</span>
                        <span>${stockIndicator}</span>
                        <div style="display: flex; gap: 5px; justify-content: center;">
                            <button class="btn btn-buy" data-good="${good.id}" data-action="buy" ${marketItem.quantity <= 0 ? 'disabled' : ''}>BUY</button>
                            <button class="btn btn-sell" data-good="${good.id}" data-action="sell">SELL</button>
                        </div>
                    `;
                    marketContainer.appendChild(marketElement);
                });
            }
        }
        
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
                    const cargoItem = document.createElement('div');
                    cargoItem.className = 'cargo-item';
                    const illegalIndicator = item.illegal ? '<i class="fas fa-exclamation-triangle" style="color: #ff6666;"></i> ' : '';
                    const marketItem = this.gameState.currentSystem.market?.[item.id];
                    const canSell = this.gameState.currentSystem.hasMarket && marketItem;
                    
                    cargoItem.innerHTML = `
                        <span>${illegalIndicator}${item.name}</span>
                        <span>${item.quantity}</span>
                        <button class="btn btn-sell" 
                                data-good="${item.id}" 
                                data-action="sell-one" 
                                ${canSell ? '' : 'disabled'}>
                            SELL
                        </button>
                    `;
                    cargoContainer.appendChild(cargoItem);
                });
            }
        }
        
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
        
        if (this.gameState.ship.radar > 0) {
            const scanButton = document.createElement('button');
            scanButton.id = 'scan-btn';
            scanButton.className = 'btn mobile-btn';
            scanButton.innerHTML = '<i class="fas fa-satellite"></i> SCAN SYSTEMS';
            scanButton.style.marginTop = '10px';
            scanButton.style.width = '100%';

            if (this.gameState.ship.radar === 0) {
                scanButton.disabled = true;
                scanButton.style.opacity = '0.6';
            }

            const statusTab = document.querySelector('.status-tab');
            if (statusTab) {
                const existingBtn = document.getElementById('scan-btn');
                if (existingBtn) existingBtn.remove();
                
                statusTab.appendChild(scanButton);
                
                scanButton.addEventListener('click', () => {
                    const result = this.gameState.scanNearbySystems();
                    if (this.gameState.ship.radar === 0) {
                        this.showNotification("You need radar to scan systems!");
                        return;
                    }
                    if (result.success) {
                        this.showNotification(result.message);
                        this.scheduleUpdate();
                        this.updateUI();
                    } else {
                        this.showNotification(result.message);
                    }
                });
            }
        }
        
        this.updateSystemOverview();
        this.updateContractsList();
        
        document.querySelectorAll('[data-good]').forEach(button => {
            button.addEventListener('click', (e) => {
                const goodId = e.target.dataset.good;
                const action = e.target.dataset.action;
                const result = this.gameState.tradeItem(goodId, action);
                this.showNotification(result.message);
                this.updateUI();
            });
        });
        
        document.querySelectorAll('[data-upgrade]').forEach(button => {
            button.addEventListener('click', (e) => {
                const upgradeId = e.target.dataset.upgrade;
                const result = this.gameState.upgradeShip(upgradeId);
                this.showNotification(result.message);
                this.updateUI();
            });
        });
        
        this.scheduleUpdate();
    }

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
        
        if (this.gameState.currentSystem) {
            if (currentSystemName) currentSystemName.textContent = this.gameState.currentSystem.name;
            if (currentSystemEconomy) currentSystemEconomy.textContent = `Economy: ${this.gameState.currentSystem.economy.charAt(0).toUpperCase() + this.gameState.currentSystem.economy.slice(1)}`;
            if (currentSystemSecurity) currentSystemSecurity.textContent = `Security: ${this.gameState.currentSystem.security.charAt(0).toUpperCase() + this.gameState.currentSystem.security.slice(1)}`;
            
            if (overviewFuel) overviewFuel.textContent = `${this.gameState.fuel}/${this.gameState.maxFuel} units`;
            
            let costPerUnit = 0;
            let fuelNeeded = 0;
            let totalCost = 0;
            
            if (this.gameState.currentSystem.hasRefuel) {
                switch(this.gameState.currentSystem.techLevel) {
                    case 'high': costPerUnit = 10; break;
                    case 'medium': costPerUnit = 15; break;
                    case 'low': costPerUnit = 20; break;
                    default: costPerUnit = 15;
                }
                fuelNeeded = this.gameState.maxFuel - this.gameState.fuel;
                totalCost = fuelNeeded * costPerUnit;
            }
            
            if (overviewRefuelCost) {
                overviewRefuelCost.textContent = this.gameState.currentSystem.hasRefuel ? 
                    `Refuel cost: ${totalCost} CR` : 
                    'Refuel not available';
            }
            
            const cargoSpace = this.gameState.cargo.reduce((sum, item) => sum + item.quantity, 0);
            let cargoValue = 0;
            
            if (this.gameState.currentSystem.hasMarket) {
                this.gameState.cargo.forEach(item => {
                    const marketItem = this.gameState.currentSystem.market?.[item.id];
                    if (marketItem) {
                        cargoValue += marketItem.sellPrice * item.quantity;
                    }
                });
            }
            
            if (overviewCargo) overviewCargo.textContent = `${cargoSpace}/${this.gameState.cargoCapacity} units`;
            if (overviewCargoValue) {
                overviewCargoValue.textContent = this.gameState.currentSystem.hasMarket ? 
                    `Value: ${cargoValue.toLocaleString()} CR` : 
                    'Market not available';
            }
            
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
            
            if (nearbySystems) {
                nearbySystems.innerHTML = '';
                const nearby = this.gameState.galaxy.filter(system => {
                    if (system === this.gameState.currentSystem) return false;
                    const distance = this.gameState.calculateDistance(this.gameState.currentSystem, system);
                    return distance <= 50 && system.discovered;
                });
                
                nearby.sort((a, b) => {
                    const distA = this.gameState.calculateDistance(this.gameState.currentSystem, a);
                    const distB = this.gameState.calculateDistance(this.gameState.currentSystem, b);
                    return distA - distB;
                });
                
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
                    nearbySystems.innerHTML = '<div style="text-align: center; padding: 10px; color: #8888ff;">No discovered systems nearby</div>';
                }
            }
        }
    }

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

    showSystemInfo(system, clientX, clientY) {
        const panel = document.getElementById('system-info-panel');
        if (!panel) return;

        const screenX = (system.x - this.camera.x) * this.camera.zoom + this.galaxyCanvas.width / 2;
        const screenY = (system.y - this.camera.y) * this.camera.zoom + this.galaxyCanvas.height / 2;
        
        if (!system.discovered) {
            panel.innerHTML = `
                <h3>Unknown System</h3>
                <div class="stat">
                    <span>Status:</span>
                    <span class="stat-value">Undiscovered</span>
                </div>
            `;
        } else {
            const services = [];
            if (system.hasShipyard) services.push('Shipyard');
            if (system.hasRefuel) services.push('Refuel');
            if (system.hasMarket) services.push('Market');
            if (system.hasSpecial) services.push('Special');
            
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
                <div class="stat">
                    <span>Services:</span>
                    <span class="stat-value">${services.join(', ') || 'None'}</span>
                </div>
            `;
        }
        
        panel.style.left = `${screenX + 10}px`;
        panel.style.top = `${screenY}px`;
        panel.style.opacity = '1';
    }

    hideSystemInfo() {
        const panel = document.getElementById('system-info-panel');
        if (panel) panel.style.opacity = '0';
    }

    // Interaction for clicking/hovering systems
    setupInput() {
        this.systemContainer.addEventListener('click', (e) => {
            if (isTraveling) return;
            
            const target = e.target.closest('.system-dot');
            if (!target) return;
            
            const systemId = parseInt(target.dataset.id, 10);
            const system = this.systemMap.get(systemId);
            
            if (system && system !== this.gameState.currentSystem) {
                this.gameState.targetSystem = system;
                this.updateUI();
                this.showNotification(`Target: ${system.discovered ? system.name : 'Unknown System'}`);
                this.scheduleUpdate();
            }
        });

        this.systemContainer.addEventListener('pointermove', (e) => {
            const target = e.target.closest('.system-dot');
            if (!target) {
                this.hideSystemInfo();
                return;
            }
            const systemId = parseInt(target.dataset.id, 10);
            const system = this.systemMap.get(systemId);
            if (system) {
                this.showSystemInfo(system, e.clientX, e.clientY);
            }
        });

        this.systemContainer.addEventListener('pointerleave', () => this.hideSystemInfo());
    }

    // Pan and Zoom controls (Mobile Fixes Here)
    setupCameraControls() {
        const galaxyCanvas = this.galaxyCanvas;
        if (!galaxyCanvas || this.cameraControlsInitialized) return;
        this.cameraControlsInitialized = true;

        let isDragging = false;
        let lastX = 0;
        let lastY = 0;
        let lastTouchDistance = 0;
        
        // Mouse Drag
        galaxyCanvas.addEventListener('mousedown', (e) => {
            isDragging = true;
            lastX = e.clientX;
            lastY = e.clientY;
            galaxyCanvas.style.cursor = 'grabbing';
            e.preventDefault();
        });
        
        galaxyCanvas.addEventListener('mousemove', (e) => {
            if (isDragging) {
                const dx = (e.clientX - lastX);
                const dy = (e.clientY - lastY);
                this.moveCamera(-dx, -dy);
                lastX = e.clientX;
                lastY = e.clientY;
                this.scheduleUpdate();
            }
        });
        
        const handleMouseUp = () => {
            isDragging = false;
            galaxyCanvas.style.cursor = 'grab';
        };
        
        galaxyCanvas.addEventListener('mouseup', handleMouseUp);
        galaxyCanvas.addEventListener('mouseleave', handleMouseUp);
        
        // Mouse Wheel (PASSIVE: FALSE required to prevent page scroll)
        galaxyCanvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const zoomAmount = e.deltaY > 0 ? -0.1 : 0.1;
            const newZoom = this.camera.zoom + zoomAmount;
            
            const startZoom = this.camera.zoom;
            const targetZoom = Math.max(this.camera.minZoom, Math.min(this.camera.maxZoom, newZoom));
            const startTime = Date.now();
            const duration = 600;
            
            const animateZoom = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration * 50 , 1);
                const easedProgress = easeInOutCubic(progress);
                
                this.camera.zoom = startZoom + (targetZoom - startZoom) * easedProgress;
                this.scheduleUpdate();
                
                if (progress < 1) {
                    requestAnimationFrame(animateZoom);
                }
            };
            animateZoom();
        }, { passive: false });
        
        // Touch Controls (Pinch to Zoom + Pan)
        galaxyCanvas.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                isDragging = true;
                lastX = e.touches[0].clientX;
                lastY = e.touches[0].clientY;
            } else if (e.touches.length === 2) {
                // 2 fingers = pinch zoom start
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                lastTouchDistance = Math.sqrt(dx * dx + dy * dy);
                isDragging = false; // stop panning
            }
        }, { passive: false });
        
        galaxyCanvas.addEventListener('touchmove', (e) => {
            if (e.cancelable) e.preventDefault(); // CRITICAL: Stops whole page from zooming/scrolling

            if (isDragging && e.touches.length === 1) {
                // Pan
                const dx = (e.touches[0].clientX - lastX);
                const dy = (e.touches[0].clientY - lastY);
                this.moveCamera(-dx, -dy);
                lastX = e.touches[0].clientX;
                lastY = e.touches[0].clientY;
                this.scheduleUpdate();
            } else if (e.touches.length === 2) {
                // Zoom
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (lastTouchDistance > 0) {
                    const diff = distance - lastTouchDistance;
                    // Mobile zoom sensitivity
                    const zoomChange = diff * 0.015; 
                    this.setZoom(this.camera.zoom + zoomChange);
                }
                lastTouchDistance = distance;
            }
        }, { passive: false });
        
        galaxyCanvas.addEventListener('touchend', (e) => {
            if (e.touches.length < 2) {
                lastTouchDistance = 0;
            }
            if (e.touches.length === 0) {
                isDragging = false;
            }
            if (e.touches.length === 1) {
                // Reset pan coords to avoid jump
                isDragging = true;
                lastX = e.touches[0].clientX;
                lastY = e.touches[0].clientY;
            }
        });
        
        // Re-add Center Button
        const existingBtn = document.querySelector('.map-center-btn');
        if (existingBtn) existingBtn.remove();

        const centerBtn = document.createElement('div');
        centerBtn.className = 'map-center-btn';
        centerBtn.innerHTML = '<i class="fas fa-crosshairs"></i>';
        centerBtn.addEventListener('click', () => {
            const startX = this.camera.x;
            const startY = this.camera.y;
            const startTime = Date.now();
            const duration = 500;
            
            const animateCenter = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const easedProgress = easeInOutCubic(progress);
                
                this.camera.x = startX + (this.gameState.ship.x - startX) * easedProgress;
                this.camera.y = startY + (this.gameState.ship.y - startY) * easedProgress;
                this.scheduleUpdate();
                
                if (progress < 1) {
                    requestAnimationFrame(animateCenter);
                }
            };
            animateCenter();
        });
        
        document.querySelector('.map-container').appendChild(centerBtn);
    }

    setupAppEventListeners() {
        const travelBtn = document.getElementById('travel-btn');
        if (travelBtn) travelBtn.addEventListener('click', () => {
            if (isTraveling) {
                this.showNotification("Already traveling!");
                return;
            }

            if (!this.gameState.targetSystem) {
                this.showNotification("Select a system to travel to!");
                return;
            }

            const result = this.gameState.travelToSystem();
            if (!result.success) {
                this.showNotification(result.message);
                return;
            }
            
            isTraveling = true;
            document.querySelectorAll('button').forEach(btn => {
                btn.disabled = true;
            });
            document.querySelector('.ui-panel').classList.add('traveling');

            this.showNotification(result.message);
            
            const startTime = Date.now();
            const travelDuration = 2000 * this.gameState.calculateDistance(this.gameState.currentSystem, this.gameState.targetSystem);
            
            const animateTravel = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / travelDuration, 1);
                const easedProgress = easeInOutCubic(progress);
                this.gameState.ship.travelProgress = easedProgress;
                
                if (this.shipIndicatorEl) {
                    this.gameState.ship.x = this.gameState.currentSystem.x + (this.gameState.targetSystem.x - this.gameState.currentSystem.x) * easedProgress;
                    this.gameState.ship.y = this.gameState.currentSystem.y + (this.gameState.targetSystem.y - this.gameState.currentSystem.y) * easedProgress;
                    
                    this.updateShipPosition();
                    this.shipIndicatorEl.style.transform = `rotate(${this.gameState.ship.rotation}deg)`;
                }
                
                if (progress < 1) {
                    requestAnimationFrame(animateTravel);
                } else {
                    isTraveling = false;
                    document.querySelectorAll('button').forEach(btn => {
                        btn.disabled = false;
                    });
                    document.querySelector('.ui-panel').classList.remove('traveling');
                    
                    const result = this.gameState.completeTravel();
                    this.showNotification(result.message);
                    
                    if (!this.gameState.currentSystem.discovered) {
                        this.gameState.currentSystem.discovered = true;
                        this.scheduleUpdate();
                    }
                    
                    let pirateChance = 0.4;
                    if (this.gameState.currentSystem.security === 'low') pirateChance = 0.5;
                    else if (this.gameState.currentSystem.security === 'high') pirateChance = 0.3;
                    
                    if (Math.random() < pirateChance) {
                        const encounter = this.encounterManager.getRandomEncounter();
                        this.encounterManager.startEncounter(encounter.type);
                    }
                    
                    this.updateUI();
                }
            };
            
            animateTravel();
        });
        
        const refuelBtn = document.getElementById('refuel-btn');
        if (refuelBtn) refuelBtn.addEventListener('click', () => {
            if (!this.gameState.currentSystem.hasRefuel) {
                this.showNotification("Refuel services not available!");
                return;
            }
            
            const result = this.gameState.refuelShip();
            this.showNotification(result.message);
            this.updateUI();
        });
        
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('contract-button')) {
                const contractId = e.target.dataset.contract;
                const result = this.gameState.handleContract(contractId);
                this.showNotification(result.message);
                this.updateUI();
            }
        });
        
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('combat-btn')) {
                const action = e.target.dataset.action;
                if (action) {
                    this.encounterManager.handleEncounterAction(action);
                }
            }
        });
        
        const tabs = document.querySelectorAll('.tab');
        if (tabs && tabs.length > 0) {
            tabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                    
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
}