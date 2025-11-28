/* --- START OF FILE UI.js --- */

import { GalaxyMap } from './GalaxyMap.js';

// --- Global State: Block interactions during hyperspace ---
let isTraveling = false;

export class UI {
    constructor(gameState, encounterManager) {
        this.gameState = gameState;
        this.encounterManager = encounterManager;
        
        // --- Animation State Properties ---
        // We separate visual rendering props from logical game coordinates
        // so we can stretch/squash the ship without breaking game logic.
        this.gameState.ship.visualScale = { x: 1, y: 1 };
        
        this.camera = {
            x: 0, y: 0, zoom: 3, minZoom: 0.5, maxZoom: 10
        };

        this.galaxyMap = null; 
        this.globalMap = null;
        this._lastPointerTarget = null;
        this._lastPointerDist = null;
        this.marketQtyMode = 1;
        
        // GSAP Timeline reference
        this.currentTravelTween = null;

        this.galaxyCanvas = null;
        this.shipIndicatorEl = null;
        this.targetPointerEl = null;

        // Bind animation frame
        this._onAnimationFrame = this._onAnimationFrame.bind(this);

        // Global click interceptor
        document.addEventListener('click', (e) => {
            if (isTraveling) {
                if (e.target.closest('.btn-close')) return;
                // Block buttons during travel
                if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
                    this.showNotification("Navigation systems locked during hyper-transit.");
                    e.preventDefault();
                    e.stopPropagation();
                }
            }
        }, true);
        
        this.setupMobileFastClick();
        this.setupAppEventListeners();
    }

    setupCanvas() {
        this.galaxyCanvas = document.getElementById('galaxy-canvas');
        const shipContainer = document.getElementById('ship-container');
        this.targetPointerEl = document.getElementById('target-pointer');

        if (!this.galaxyCanvas || !shipContainer) {
            console.error("Critical UI elements missing.");
            return;
        }

        this.galaxyMap = new GalaxyMap(this.gameState, this, 'galaxy-canvas');
        this.globalMap = new GalaxyMap(this.gameState, this, 'full-galaxy-canvas');

        shipContainer.innerHTML = '';
        this.shipIndicatorEl = document.createElement('div');
        this.shipIndicatorEl.className = 'ship-indicator';
        this.shipIndicatorEl.innerHTML = '<i class="fas fa-space-shuttle"></i>';
        shipContainer.appendChild(this.shipIndicatorEl);

        this.centerCameraOnShip();
        this.setupInputHandlers();
        this.setupCameraControls();

        const openMapBtn = document.getElementById('open-map-btn');
        if(openMapBtn) {
            openMapBtn.onclick = () => {
                if(isTraveling) {
                    this.showNotification("Sensors offline during hyperspace.");
                    return;
                }
                this.globalMap.open();
            };
        }

        window.addEventListener('resize', () => this.handleResize());
        requestAnimationFrame(this._onAnimationFrame);
    }

    handleResize() {
        if (this.galaxyMap) this.galaxyMap.resize();
        if (this.globalMap) this.globalMap.resize();
    }

    _onAnimationFrame() {
        if (this.galaxyMap) this.galaxyMap.render();
        this.updateShipPosition();
        this.updateTargetPointer(); 
        requestAnimationFrame(this._onAnimationFrame);
    }

    // =========================================
    // HUD & RENDERING LOGIC
    // =========================================

    updateShipPosition() {
        if (!this.shipIndicatorEl || !this.galaxyMap) return;
        
        // Convert World Coords -> Screen Coords
        const screenPos = this.galaxyMap.worldToScreen(
            this.gameState.ship.x, 
            this.gameState.ship.y
        );
        
        // Get visual props managed by GSAP
        const scaleX = this.gameState.ship.visualScale.x;
        const scaleY = this.gameState.ship.visualScale.y;
        
        // Rotate ship (Assuming icon points UP naturally, so +360 deg makes 0 deg = Right)
        const rot = this.gameState.ship.rotation + 360;

        // Apply transforms
        this.shipIndicatorEl.style.transform = 
            `translate(${screenPos.x}px, ${screenPos.y}px) rotate(${rot}deg) scale(${scaleX}, ${scaleY})`;
            
        this.shipIndicatorEl.style.left = '0'; 
        this.shipIndicatorEl.style.top = '0';
    }

    updateTargetPointer() {
        if (!this.targetPointerEl || !this.galaxyMap || !this.gameState.targetSystem) {
            if(this.targetPointerEl) this.targetPointerEl.style.display = 'none';
            return;
        }

        const target = this.gameState.targetSystem;
        if (target === this.gameState.currentSystem) {
            this.targetPointerEl.style.display = 'none';
            return;
        }

        const w = this.galaxyCanvas.width;
        const h = this.galaxyCanvas.height;
        const cx = w / 2;
        const cy = h / 2;
        const screenPos = this.galaxyMap.worldToScreen(target.x, target.y);
        const margin = 40;
        
        const isOnScreen = (
            screenPos.x >= margin && screenPos.x <= w - margin && 
            screenPos.y >= margin && screenPos.y <= h - margin
        );

        if (isOnScreen) {
            this.targetPointerEl.style.left = `${screenPos.x}px`;
            this.targetPointerEl.style.top = `${screenPos.y - 40}px`;
            this.targetPointerEl.style.transform = 'translate(-50%, -50%)';
            this.targetPointerEl.querySelector('.pointer-arrow').style.transform = 'rotate(180deg)';
        } else {
            // Calculate edge position
            const dx = screenPos.x - cx;
            const dy = screenPos.y - cy;
            const angle = Math.atan2(dy, dx);
            const boxW = (w / 2) - margin;
            const boxH = (h / 2) - margin;
            const absCos = Math.abs(Math.cos(angle));
            const absSin = Math.abs(Math.sin(angle));
            
            let finalX, finalY;

            if (boxW * absSin <= boxH * absCos) {
                finalX = cx + (dx > 0 ? boxW : -boxW);
                finalY = cy + (dx > 0 ? boxW : -boxW) * Math.tan(angle);
            } else {
                finalY = cy + (dy > 0 ? boxH : -boxH);
                finalX = cx + (dy > 0 ? boxH : -boxH) / Math.tan(angle);
            }

            this.targetPointerEl.style.left = `${finalX}px`;
            this.targetPointerEl.style.top = `${finalY}px`;
            this.targetPointerEl.style.transform = 'translate(-50%, -50%)';
            const rotDeg = angle * 180 / Math.PI + 90;
            this.targetPointerEl.querySelector('.pointer-arrow').style.transform = `rotate(${rotDeg}deg)`;  
        }

        this.targetPointerEl.style.display = 'flex';

        const nameEl = document.getElementById('pointer-name');
        const distEl = document.getElementById('pointer-dist');
        
        if (nameEl && this._lastPointerTarget !== target) {
            nameEl.textContent = target.discovered ? target.name : 'Unknown';
            this._lastPointerTarget = target;
        }

        if (distEl) {
            const dist = Math.round(this.gameState.calculateDistance(this.gameState.currentSystem, target));
            if (this._lastPointerDist !== dist) {
                distEl.textContent = dist + " LY";
                this._lastPointerDist = dist;
            }
        }
    }

    centerCameraOnShip() {
        this.galaxyMap.camera.x = this.gameState.ship.x;
        this.galaxyMap.camera.y = this.gameState.ship.y;
        this.camera = this.galaxyMap.camera;
    }

    setZoom(zoom) {
        const z = Math.max(this.camera.minZoom, Math.min(this.camera.maxZoom, zoom));
        this.galaxyMap.camera.zoom = z;
    }

    setupInputHandlers() {
        this.galaxyCanvas.addEventListener('mousemove', (e) => {
            if(isTraveling) return;
            const rect = this.galaxyCanvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const system = this.galaxyMap.getSystemAt(x, y);
            
            if (system) {
                this.galaxyCanvas.style.cursor = 'pointer';
                this.showSystemInfo(system, x, y);
            } else {
                this.galaxyCanvas.style.cursor = 'default';
                this.hideSystemInfo();
            }
        });

        this.galaxyCanvas.addEventListener('mouseleave', () => {
            this.hideSystemInfo();
        });
    }

    showSystemInfo(system, screenX, screenY) {
        const pointer = document.getElementById('hover-pointer');
        const content = pointer ? pointer.querySelector('.hover-details') : null;
        if (!pointer || !content) return;

        if (!system.discovered) {
            content.innerHTML = `<div style="color: #ff6666; font-weight:bold;">Unknown System</div><div style="color: #aaa;">Undiscovered</div>`;
        } else {
            content.innerHTML = `
                <div style="color: #66ccff; font-weight:bold; border-bottom:1px solid #445; padding-bottom:2px; margin-bottom:2px;">${system.name}</div>
                <div class="hover-row"><span class="hover-label">Economy:</span> <span class="hover-val">${system.economy}</span></div>
                <div class="hover-row"><span class="hover-label">Sec:</span> <span class="hover-val">${system.security}</span></div>
            `;
        }

        pointer.style.display = 'flex';
        pointer.style.left = `${screenX}px`;
        pointer.style.top = `${screenY - 20}px`; 
        pointer.style.transform = 'translate(-50%, -100%)';
    }

    hideSystemInfo() {
        const pointer = document.getElementById('hover-pointer');
        if (pointer) pointer.style.display = 'none';
    }

    setupCameraControls() {
        const centerBtn = document.querySelector('.map-center-btn');
        if(centerBtn) centerBtn.onclick = () => this.centerCameraOnShip();
    }

    // =========================================
    // UI UPDATES
    // =========================================

    updateUI() {
        if(this.globalMap && this.globalMap.active) this.globalMap.updateInfoBox();
        const el = (id) => document.getElementById(id);
        
        if(el('credits')) el('credits').textContent = Math.floor(this.gameState.credits).toLocaleString() + ' CR';
        if(el('fuel')) el('fuel').textContent = `${Math.floor(this.gameState.fuel)}/${this.gameState.maxFuel}`;
        if(el('hull')) el('hull').textContent = Math.floor(this.gameState.ship.hull) + '%';
        
        const cargoCount = this.gameState.cargo.reduce((a,b) => a + b.quantity, 0);
        if(el('cargo-space')) el('cargo-space').textContent = `${cargoCount}/${this.gameState.cargoCapacity}`;

        const target = this.gameState.targetSystem;
        if(el('target-system')) el('target-system').textContent = target ? (target.discovered ? target.name : 'Unknown') : 'None';
        
        const dist = target ? this.gameState.calculateDistance(this.gameState.currentSystem, target) : 0;
        if(el('distance')) el('distance').textContent = Math.round(dist) + ' LY';
        if(el('fuel-cost')) el('fuel-cost').textContent = Math.ceil(dist);
        
        const scanBtn = document.getElementById('scan-btn');
        if (scanBtn) {
            const radarLevel = this.gameState.ship.radar || 0;
            if (radarLevel >= 1) {
                scanBtn.style.display = 'inline-flex';
                scanBtn.title = `Range: ${radarLevel * 10} LY | Cost: 10 Fuel`;
            } else {
                scanBtn.style.display = 'none';
            }
        }

        this.updateMarketUI();
        this.updateCargoUI();
        this.updateShipyardUI();
        this.updateOverviewUI();
        this.updateContractsUI();
    }
    
    updateMarketUI() {
        const grid = document.querySelector('.market-grid');
        const marketContainer = document.querySelector('.market-tab'); 
        if(!grid || !marketContainer) return;
        
        const sys = this.gameState.currentSystem;
        
        if(!sys.hasMarket) {
            grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:20px; color:#888;">No Market Access in this System</div>';
            return;
        }

        let controls = document.getElementById('market-controls');
        if (!controls) {
            controls = document.createElement('div');
            controls.id = 'market-controls';
            controls.className = 'market-controls';
            grid.parentNode.insertBefore(controls, grid);
        }

        const getBtnClass = (mode) => `btn small ${this.marketQtyMode === mode ? 'btn-action' : ''}`;
        
        controls.innerHTML = `
            <span style="font-size:11px; color:#888; margin-right:10px;">AMOUNT:</span>
            <button class="${getBtnClass(1)}" id="qty-1">x1</button>
            <button class="${getBtnClass(10)}" id="qty-10">x10</button>
            <button class="${getBtnClass('all')}" id="qty-all">ALL</button>
        `;

        controls.querySelector('#qty-1').onclick = () => { this.marketQtyMode = 1; this.updateMarketUI(); };
        controls.querySelector('#qty-10').onclick = () => { this.marketQtyMode = 10; this.updateMarketUI(); };
        controls.querySelector('#qty-all').onclick = () => { this.marketQtyMode = 'all'; this.updateMarketUI(); };
        
        grid.innerHTML = `
            <div class="market-header">ITEM</div>
            <div class="market-header">BUY</div>
            <div class="market-header">SELL</div>
            <div class="market-header">STOCK</div>
            <div class="market-header">ACTION</div>
        `;
        
        this.gameState.goods.forEach(g => {
            const m = sys.market[g.id];
            if(!m) return;
            
            const item = document.createElement('div');
            item.className = 'market-item';
            
            let canBuy = true;
            if (this.marketQtyMode === 'all' && m.quantity < 1) canBuy = false;
            else if (typeof this.marketQtyMode === 'number' && m.quantity < this.marketQtyMode) canBuy = false; 
            
            if (m.quantity <= 0 || this.gameState.credits < m.buyPrice) canBuy = false;

            const stockColor = m.quantity > 0 ? '#6f9' : '#f66';
            
            item.innerHTML = `
                <div>${m.name} ${m.illegal ? '<i class="fas fa-exclamation-triangle" style="color:#f66" title="Illegal"></i>' : ''}</div>
                <div>${m.buyPrice}</div>
                <div>${m.sellPrice}</div>
                <div style="color:${stockColor}">${m.quantity}</div>
                <div style="display:flex; gap:5px;">
                    <button class="btn btn-buy small" data-id="${g.id}" ${canBuy ? '' : 'disabled'}>B</button>
                    <button class="btn btn-sell small" data-id="${g.id}">S</button>
                </div>
            `;
            
            item.querySelector('.btn-buy').onclick = () => this.handleTrade(g.id, 'buy');
            item.querySelector('.btn-sell').onclick = () => this.handleTrade(g.id, 'sell');
            grid.appendChild(item);
        });
    }
    
    handleTrade(id, type) {
        const qty = this.marketQtyMode || 1;
        const res = this.gameState.tradeItem(id, type, qty);
        this.showNotification(res.message);
        this.updateUI();
    }

    updateCargoUI() {
        const hold = document.getElementById('cargo-hold');
        if(!hold) return;
        hold.innerHTML = '';
        
        if(this.gameState.cargo.length === 0) {
            hold.innerHTML = '<div style="padding:10px; text-align:center; color:#555;">Cargo Hold Empty</div>';
            return;
        }
        
        this.gameState.cargo.forEach(c => {
            const div = document.createElement('div');
            div.className = 'cargo-item';
            const canSell = this.gameState.currentSystem.hasMarket && this.gameState.currentSystem.market[c.id];
            
            div.innerHTML = `
                <span>${c.name} ${c.illegal ? '⚠️' : ''}</span>
                <span>${c.quantity}</span>
                <div style="display:flex; gap:5px;">
                    <button class="btn btn-sell small" title="Sell 1 Unit" ${canSell ? '' : 'disabled'}>SELL</button>
                    <button class="btn small" title="Jettison Cargo" style="color:#888; border-color:#444;"><i class="fas fa-trash"></i></button>
                </div>
            `;
            
            div.querySelector('.btn-sell').onclick = () => this.handleTrade(c.id, 'sell-one');
            div.querySelectorAll('button')[1].onclick = () => {
                const res = this.gameState.dropItem(c.id);
                this.showNotification(res.message);
                this.updateUI();
            };
            hold.appendChild(div);
        });
    }
    
    updateShipyardUI() {
        const container = document.querySelector('.shipyard-tab');
        if (!container) return;
        container.innerHTML = '';

        const sys = this.gameState.currentSystem;
        const ship = this.gameState.ship;

        const shipSection = document.createElement('div');
        shipSection.className = 'ship-overview-panel';
        const cargoUsed = this.gameState.cargo.reduce((a,b)=>a+b.quantity,0);
        
        shipSection.innerHTML = `
            <div class="ship-visual">
                <i class="fas fa-space-shuttle ship-icon-large"></i>
                <div class="ship-name">MK-IV INTERCEPTOR</div>
                <div class="ship-class">Class: Frigate</div>
            </div>
            <div class="ship-stats-detailed">
                <div class="stat-row">
                    <span class="stat-label"><i class="fas fa-shield-alt"></i> HULL</span>
                    <div class="stat-bar-container"><div class="stat-bar-fill" style="width:${(ship.hull/ship.maxHull)*100}%; background:var(--accent-danger);"></div></div>
                    <span class="stat-val">${Math.round(ship.hull)}/${ship.maxHull}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label"><i class="fas fa-sun"></i> SHIELDS</span>
                    <div class="stat-bar-container"><div class="stat-bar-fill" style="width:${Math.min(100, ship.shields)}%; background:var(--accent-primary);"></div></div>
                    <span class="stat-val">${ship.shields} PWR</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label"><i class="fas fa-gas-pump"></i> FUEL</span>
                    <div class="stat-bar-container"><div class="stat-bar-fill" style="width:${(this.gameState.fuel/this.gameState.maxFuel)*100}%; background:var(--accent-warning);"></div></div>
                    <span class="stat-val">${Math.floor(this.gameState.fuel)}/${this.gameState.maxFuel}</span>
                </div>
                <div class="stat-grid-small">
                    <div class="mini-stat"><i class="fas fa-crosshairs"></i> <span>DMG: ${ship.damage}</span></div>
                    <div class="mini-stat"><i class="fas fa-wind"></i> <span>EVA: ${ship.evasion}%</span></div>
                    <div class="mini-stat"><i class="fas fa-satellite-dish"></i> <span>RDR: Lvl ${ship.radar}</span></div>
                    <div class="mini-stat"><i class="fas fa-box"></i> <span>CAP: ${cargoUsed}/${this.gameState.cargoCapacity}</span></div>
                </div>
            </div>
        `;
        container.appendChild(shipSection);

        const upgradeHeader = document.createElement('h2');
        upgradeHeader.innerHTML = `<i class="fas fa-tools"></i> ENGINEERING BAY`;
        upgradeHeader.style.marginTop = '20px';
        container.appendChild(upgradeHeader);

        if (!sys.hasShipyard) {
            const noService = document.createElement('div');
            noService.className = 'no-service-msg';
            noService.innerHTML = `<i class="fas fa-lock"></i><p>SHIPYARD SERVICES UNAVAILABLE</p><small>Travel to Industrial or Tech worlds.</small>`;
            container.appendChild(noService);
            return;
        }

        const list = document.createElement('div');
        list.className = 'upgrade-list';

        this.gameState.upgrades.forEach(u => {
            const item = document.createElement('div');
            item.className = 'upgrade-item';
            const currentLvl = this.gameState.ship.upgrades[u.id] || 0;
            const canAfford = this.gameState.credits >= u.cost;
            
            item.innerHTML = `
                <div class="upgrade-icon"><i class="${u.icon}"></i></div>
                <div class="upgrade-info">
                    <div class="upgrade-name">${u.name} <span class="lvl-badge">LVL ${currentLvl}</span></div>
                    <div class="upgrade-desc">${u.description}</div>
                    <div class="upgrade-bonus">Effect: +${u.effect}</div>
                </div>
                <div class="upgrade-action">
                    <div class="upgrade-cost ${canAfford ? 'text-success' : 'text-danger'}">${u.cost.toLocaleString()} CR</div>
                    <button class="btn btn-buy small" ${canAfford ? '' : 'disabled'}>UPGRADE</button>
                </div>
            `;
            item.querySelector('button').onclick = () => {
                const res = this.gameState.upgradeShip(u.id);
                this.showNotification(res.message);
                this.updateUI();
            };
            list.appendChild(item);
        });
        container.appendChild(list);
    }
    
    updateOverviewUI() {
        const sys = this.gameState.currentSystem;
        const el = (id, txt) => { const e = document.getElementById(id); if(e) e.textContent = txt; };
        
        el('current-system-name', sys.name);
        el('current-system-economy', `Economy: ${sys.economy}`);
        el('current-system-security', `Security: ${sys.security}`);
        el('overview-fuel', `Fuel: ${Math.floor(this.gameState.fuel)}`);
        
        let refuelCost = 0;
        if(sys.hasRefuel && this.gameState.fuel < this.gameState.maxFuel) {
            refuelCost = Math.floor((this.gameState.maxFuel - this.gameState.fuel) * 10);
        }
        el('overview-refuel-cost', sys.hasRefuel ? `Refuel Cost: ~${refuelCost} CR` : "Refueling Unavailable");
        
        const threat = sys.security === 'low' ? "HIGH" : (sys.security === 'medium' ? "MODERATE" : "LOW");
        el('overview-threat', `Threat: ${threat}`);
        el('overview-pirate-chance', `Pirate Risk: ${sys.security === 'low' ? '50%' : '10%'}`);
        
        const list = document.getElementById('nearby-systems');
        if(list) {
            list.innerHTML = '';
            const nearby = this.gameState.galaxy
                .filter(s => s !== sys && s.discovered)
                .map(s => ({ system: s, dist: this.gameState.calculateDistance(sys, s) }))
                .filter(item => item.dist < 50)
                .sort((a,b) => a.dist - b.dist)
                .slice(0, 5);
                
            if(nearby.length === 0) {
                list.innerHTML = '<div style="color:#555; padding:5px;">No known systems in short range scanners.</div>';
            } else {
                nearby.forEach(item => {
                    const div = document.createElement('div');
                    div.className = 'system-overview-item';
                    div.innerHTML = `
                        <div style="display:flex; justify-content:space-between;">
                            <span style="color:#6cf; font-weight:bold;">${item.system.name}</span>
                            <span style="color:#aaa;">${Math.round(item.dist)} LY</span>
                        </div>
                        <div style="font-size:11px; color:#888;">${item.system.economy}</div>
                    `;
                    list.appendChild(div);
                });
            }
        }
    }
    
    updateContractsUI() {
        const list = document.getElementById('contracts-list');
        if(!list) return;
        list.innerHTML = '';
        
        if(this.gameState.contracts.length === 0) {
            list.innerHTML = '<div style="text-align:center; color:#555; padding:20px;">No contracts available in this sector.</div>';
            return;
        }
        
        this.gameState.contracts.forEach(c => {
            if(c.completed) return;
            const div = document.createElement('div');
            div.className = 'contract-item';
            const icon = c.type === 'hunt' ? '☠️' : '📦';
            
            div.innerHTML = `
                <div class="contract-header"><span>${icon} ${c.name}</span><span class="contract-reward">${c.reward.toLocaleString()} CR</span></div>
                <div class="contract-details">${c.description}</div>
                <button class="contract-button btn">ACCEPT CONTRACT</button>
            `;
            
            div.querySelector('button').onclick = () => {
                const res = this.gameState.handleContract(c.id);
                this.showNotification(res.message);
                this.updateUI();
            };
            list.appendChild(div);
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
    
    setupMobileFastClick() {
        document.addEventListener('touchstart', (e) => {
            const target = e.target.closest('button, .btn, .tab, .combat-btn, .map-center-btn');
            if (target && !target.disabled) target.classList.add('is-active');
        }, { passive: true });

        const clearActiveState = () => {
            document.querySelectorAll('.is-active').forEach(el => setTimeout(() => el.classList.remove('is-active'), 75));
        };
        document.addEventListener('touchend', clearActiveState, { passive: true });
        document.addEventListener('touchcancel', clearActiveState, { passive: true });
        document.addEventListener('scroll', clearActiveState, { passive: true });
    }

    setupAppEventListeners() {
        const travelBtn = document.getElementById('travel-btn');
        if (travelBtn) travelBtn.addEventListener('click', () => {
            if (isTraveling) return;
            if (!this.gameState.targetSystem) return this.showNotification("No destination set!");
            
            const res = this.gameState.travelToSystem();
            if (!res.success) return this.showNotification(res.message);
            
            this.performTravelAnimation(res);
        });
        
        const refuelBtn = document.getElementById('refuel-btn');
        if(refuelBtn) refuelBtn.addEventListener('click', () => {
            const res = this.gameState.refuelShip();
            this.showNotification(res.message);
            this.updateUI();
        });
        
        const scanBtn = document.getElementById('scan-btn');
        if (scanBtn) {
            scanBtn.addEventListener('click', () => {
                if (isTraveling) return;
                const res = this.gameState.scanNearbySystems();
                this.showNotification(res.message);
                if (res.success) {
                    this.updateUI();
                    if (this.galaxyMap) this.galaxyMap.render();
                }
            });
        }

        const tabs = document.querySelectorAll('.tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                document.querySelectorAll('.panel-section').forEach(s => s.style.display = 'none');
                const target = document.querySelector(`.${tab.dataset.tab}-tab`);
                if(target) target.style.display = 'block';
            });
        });
    }

    // =========================================
    // ENHANCED TRAVEL ANIMATION
    // =========================================

    performTravelAnimation(res) {
        if (!window.gsap) return console.error("GSAP library not found!");

        // 1. Setup State
        isTraveling = true; 
        document.querySelector('.ui-panel').classList.add('traveling');
        this.showNotification(res.message);
        
        if (this.currentTravelTween) this.currentTravelTween.kill();

        // 2. Geometry Calculation
        const ship = this.gameState.ship;
        const startPos = { x: ship.x, y: ship.y };
        const endPos = { x: this.gameState.targetSystem.x, y: this.gameState.targetSystem.y };
        
        const dx = endPos.x - startPos.x;
        const dy = endPos.y - startPos.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        // Calculate Angle in Degrees
        const angleRad = Math.atan2(dy, dx);
        let angleDeg = angleRad * (180 / Math.PI);

        // Normalize Rotation for shortest turn
        const currentRot = ship.rotation % 360;
        let diff = angleDeg - currentRot;
        while (diff < -180) diff += 360;
        while (diff > 180) diff -= 360;
        const targetRotation = currentRot + diff;

        // 3. Define Duration
        // Min 2.5s, Max 4.5s
        const travelDuration = Math.min(4.5, Math.max(2.5, dist * 0.04));
        const maxBright = 2;

        // 4. Create Timeline
        this.currentTravelTween = gsap.timeline({
            onComplete: () => this.handleArrival()
        });

        // --- PHASE 1: ROTATION (Turn to target) ---
        this.currentTravelTween.to(ship, {
            rotation: targetRotation,
            duration: 0.8,
            ease: "power2.out"
        });

        // --- PHASE 2: CHARGING (Wobble & Squash) ---
        // Compress the ship visually
        this.currentTravelTween.to(ship.visualScale, {
            x: 0.8, y: 1.2, 
            duration: 0.5,
            ease: "back.in(2)"
        }, ">-0.2");

        // Shake/Wobble effect
        this.currentTravelTween.to(ship.visualScale, {
            x: 0.85, y: 1.15,
            duration: 0.05,
            yoyo: true,
            repeat: 7
        }, "<");

        // --- PHASE 3: HYPER JUMP ---
        this.currentTravelTween.to(ship, {
            x: endPos.x,
            y: endPos.y,
            duration: travelDuration,
            ease: "power2.inOut",
            
            onStart: () => {
                this.createLaunchFlash(startPos.x, startPos.y);
            },
            
            onUpdate: () => {
                // 'this' refers to the Timeline if function is standard, 
                // but arrow function keeps 'this' as Class UI.
                // We need the progress of this specific tween step.
                // Since this step is the only one active during movement, 
                // we can approximate using the timeline progress or calculate manually.
                
                // Better approach: Calculate progress manually or use global timeline time.
                // But for simplicity in this structure, we use a Sine wave based on timeline position.
                // Or easier: Just calculate velocity factor based on time within this tween.
                
                const progress = this.currentTravelTween.progress();
                
                // Approximate velocity based on power2.inOut curve
                // Peak velocity is at 0.5 (middle of jump)
                // Normalize roughly to 0..1..0
                let velocityFactor = 0;
                
                // Timeline includes rotation/charge, so the "Jump" part is roughly 
                // from progress 0.3 to 1.0. Let's remap for visual effects.
                if (progress > 0.2) {
                    const jumpProgress = (progress - 0.2) / 0.8; 
                    velocityFactor = Math.sin(Math.PI * jumpProgress); // 0 -> 1 -> 0
                }

                // A. GLOW EFFECT (Dynamic based on velocity)
                const indicator = document.querySelector('.ship-indicator');
                if(indicator) {
                    
                    // Brightness: Scales smoothly from 1.0 (normal) to 2.5 (very bright)
                    // As velocityFactor goes 0 -> 1 -> 0, brightness follows 1.0 -> 2.5 -> 1.0
                    const brightness = 1.0 + (velocityFactor * 1.15);

                    // Apply the dynamic filter
                    indicator.style.filter = `
                        brightness(${brightness})
                    `;
                    console.log("VF:", velocityFactor, "BR:", brightness);
                }

                // B. STRETCH (X-axis) & SHRINK (Y-axis)
                // Max stretch: 2.5x, Max shrink: 0.5x
                ship.visualScale.x = 1 + (velocityFactor * 0.01); 
                ship.visualScale.y = 1 - (velocityFactor * 0.01);

                // C. PARTICLES
                // Chance to spawn increases with speed
                if (Math.random() < (velocityFactor * 1.2)) {
                    this.spawnEngineParticle(ship.x, ship.y, ship.rotation, velocityFactor);
                }
            }
        });

        // --- PHASE 4: ARRIVAL SETTLE ---
        // Restore scale with elastic bounce
        this.currentTravelTween.to(ship.visualScale, {
            x: 1, y: 1,
            duration: 0.6,
            ease: "elastic.out(1, 0.5)"
        });
    }

    spawnEngineParticle(x, y, rotation, velocityFactor) {
        const container = document.getElementById('ship-container');
        if (!container) return;

        const screenPos = this.galaxyMap.worldToScreen(x, y);

        const particle = document.createElement('div');
        particle.className = 'engine-particle';
        
        // Math to place particle at the "back" of the ship
        // Rotation is in degrees. 0 deg = Right.
        const rad = rotation * (Math.PI / 180);
        const offsetDist = 15; 
        
        // Position behind ship
        const backX = -Math.cos(rad) * offsetDist;
        const backY = -Math.sin(rad) * offsetDist;

        // Spread randomness
        const spread = 8 * velocityFactor;
        const randX = (Math.random() - 0.5) * spread;
        const randY = (Math.random() - 0.5) * spread;

        particle.style.left = (screenPos.x + backX + randX) + 'px';
        particle.style.top = (screenPos.y + backY + randY) + 'px';
        
        // High speed = Blue/White, Low speed = Orange
        if(velocityFactor > 0.7) {
            particle.style.background = '#caf0ff'; 
            particle.style.boxShadow = '0 0 6px #caf0ff';
        } else {
            particle.style.background = '#ffaa66';
        }

        container.appendChild(particle);

        // Animate Particle moving AWAY from ship direction
        const trailDist = 60 * velocityFactor;
        const moveX = -Math.cos(rad) * trailDist;
        const moveY = -Math.sin(rad) * trailDist;

        gsap.to(particle, {
            x: moveX,
            y: moveY,
            opacity: 0,
            scale: 0,
            duration: 0.4 + (Math.random() * 0.4),
            ease: "power1.out",
            onComplete: () => particle.remove()
        });
    }

    createLaunchFlash(x, y) {
        // Subtle flash at start
        const container = document.getElementById('ship-container');
        if (!container) return;
        
        const screenPos = this.galaxyMap.worldToScreen(x, y);
        const flash = document.createElement('div');
        flash.className = 'arrival-flash'; // Reusing style
        flash.style.left = screenPos.x + 'px';
        flash.style.top = screenPos.y + 'px';
        flash.style.width = '10px';
        flash.style.height = '10px';
        container.appendChild(flash);

        gsap.to(flash, {
            width: 100, height: 100,
            opacity: 0,
            duration: 0.3,
            ease: "power1.out",
            onComplete: () => flash.remove()
        });
    }

    createArrivalFlash() {
        const container = document.getElementById('ship-container');
        if (!container) return;

        const screenPos = this.galaxyMap.worldToScreen(this.gameState.ship.x, this.gameState.ship.y);
        const flash = document.createElement('div');
        flash.className = 'arrival-flash';
        
        flash.style.left = screenPos.x + 'px';
        flash.style.top = screenPos.y + 'px';
        flash.style.width = '10px'; 
        flash.style.height = '10px';
        
        container.appendChild(flash);

        // Massive shockwave
        gsap.to(flash, {
            width: 400,
            height: 400,
            opacity: 0,
            duration: 0.8,
            ease: "power2.out",
            onComplete: () => flash.remove()
        });

    }

    handleArrival() {
        isTraveling = false;
        document.querySelector('.ui-panel').classList.remove('traveling');
        
        // Clear dynamic effects
        if (this.shipIndicatorEl) {
            this.shipIndicatorEl.classList.remove('hyper-speed');
            this.shipIndicatorEl.style.filter = ''; // Reset to default CSS
        }

        this.createArrivalFlash();

        this.gameState.completeTravel();
        this.showNotification(`Arrived at ${this.gameState.currentSystem.name}`);
        this.updateUI();

        setTimeout(() => {
            if (this.encounterManager.shouldTriggerEncounter()) {
                const encounterData = this.encounterManager.getRandomEncounter();
                this.encounterManager.startEncounter(encounterData.type);
            }
        }, 800);
    }
}
/* --- END OF FILE UI.js --- */