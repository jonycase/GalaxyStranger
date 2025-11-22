/* --- START OF FILE TraderEncounter.js --- */

import { Encounter } from './Encounter.js';

export class TraderEncounter extends Encounter {
    constructor(player, gameState) {
        super(player, gameState, {
            type: 'trader',
            title: 'COMMUNICATIONS HAIL',
            iconClass: 'fa-comments-dollar'
        });
        
        // 1. Randomize Trader Personality
        const types = ['merchant', 'smuggler', 'desperate', 'fuel'];
        // Weighted random: Merchant is most common
        const rand = Math.random();
        if (rand < 0.5) this.traderType = 'merchant';
        else if (rand < 0.7) this.traderType = 'fuel';
        else if (rand < 0.9) this.traderType = 'smuggler';
        else this.traderType = 'desperate';

        this.deal = {};
        this.setupDeal();
    }

    setupDeal() {
        const goods = this.gameState.goods;
        
        switch(this.traderType) {
            case 'merchant':
                this.title = "INDEPENDENT MERCHANT";
                this.iconClass = "fa-truck-loading";
                // Sells legal mid-tier items
                const legalGoods = goods.filter(g => !g.illegal && g.basePrice < 300);
                this.good = legalGoods[Math.floor(Math.random() * legalGoods.length)];
                this.priceMult = 0.85 + (Math.random() * 0.1); // 85-95% market value
                this.quantity = 5 + Math.floor(Math.random() * 10);
                this.description = "A standard hauler offering surplus inventory.";
                break;
                
            case 'smuggler':
                this.title = "SHADOW TRADER";
                this.iconClass = "fa-user-secret";
                // Sells illegal or high-tier items
                const rareGoods = goods.filter(g => g.illegal || g.basePrice > 300);
                this.good = rareGoods[Math.floor(Math.random() * rareGoods.length)];
                this.priceMult = 1.2; // Premium price for availability
                this.quantity = 2 + Math.floor(Math.random() * 4);
                this.description = "This vessel broadcasts a scrambled signal. They sell restricted goods.";
                break;
                
            case 'desperate':
                this.title = "DISTRESS SIGNAL";
                this.iconClass = "fa-exclamation-triangle";
                // Sells anything dirt cheap
                this.good = goods[Math.floor(Math.random() * goods.length)];
                this.priceMult = 0.5; // Fire sale
                this.quantity = 3 + Math.floor(Math.random() * 5);
                this.description = "\"Engine failure imminent! Need credits for repairs immediately!\"";
                break;
                
            case 'fuel':
                this.title = "FUEL TANKER";
                this.iconClass = "fa-gas-pump";
                this.good = { name: "Hyperfuel", id: 'fuel_refill' };
                this.priceMult = 1.0; // Standard rate
                this.quantity = 100; // Infinite basically
                this.description = "A mobile refueling platform operating in deep space.";
                break;
        }

        if (this.traderType !== 'fuel') {
            this.unitPrice = Math.floor(this.good.basePrice * this.priceMult);
            this.totalCost = this.unitPrice * this.quantity;
        } else {
            this.unitPrice = 15; // Base fuel cost
        }
    }

    renderContent(contentEl) {
        if (!contentEl) return;

        let detailsHtml = '';

        if (this.traderType === 'fuel') {
            const currentFuel = Math.floor(this.gameState.fuel);
            const missing = this.gameState.maxFuel - currentFuel;
            const cost = missing * this.unitPrice;
            
            detailsHtml = `
                <div style="background:rgba(0,0,0,0.3); padding:15px; border-radius:6px; text-align:left;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                        <span>Current Fuel:</span>
                        <span style="${currentFuel < 5 ? 'color:#f66' : 'color:#6f9'}">${currentFuel}/${this.gameState.maxFuel}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between;">
                        <span>Refill Cost:</span>
                        <span>${missing > 0 ? cost + ' CR' : 'Tank Full'}</span>
                    </div>
                </div>
            `;
        } else {
            // Goods Trade
            const isDeal = this.priceMult < 0.9;
            const isExpensive = this.priceMult > 1.1;
            let priceColor = '#fff';
            if(isDeal) priceColor = '#6f9';
            if(isExpensive) priceColor = '#f66';

            detailsHtml = `
                <div style="background:rgba(0,0,0,0.3); padding:15px; border-radius:6px; margin-top:10px;">
                    <div style="color:#aaa; font-size:12px;">OFFER:</div>
                    <div style="font-size:18px; color:#fff; font-weight:bold; margin:5px 0;">
                        ${this.quantity}x ${this.good.name}
                    </div>
                    
                    <div style="display:flex; justify-content:space-between; border-top:1px solid #444; padding-top:10px; margin-top:10px;">
                        <span style="color:#aaa;">Price per Unit:</span>
                        <span style="color:${priceColor}">${this.unitPrice} CR</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; margin-top:5px;">
                        <span style="color:#aaa;">Total:</span>
                        <span style="color:#ffd700;">${this.totalCost.toLocaleString()} CR</span>
                    </div>
                </div>
            `;
        }

        contentEl.innerHTML = `
            <div style="text-align:center;">
                <p style="color:#ccc; font-style:italic;">${this.description}</p>
                ${detailsHtml}
            </div>
        `;
    }

    renderOptions(optionsEl) {
        if (!optionsEl) return;

        if (this.traderType === 'fuel') {
            const missing = this.gameState.maxFuel - Math.floor(this.gameState.fuel);
            const cost = missing * this.unitPrice;
            const canAfford = this.gameState.credits >= cost;
            const needsFuel = missing > 0;

            if (!needsFuel) {
                optionsEl.innerHTML = `<button class="combat-btn escape" data-action="close">TANK FULL - LEAVE</button>`;
            } else {
                optionsEl.innerHTML = `
                    <button class="combat-btn attack" data-action="refuel" ${canAfford ? '' : 'disabled'}>
                        <i class="fas fa-gas-pump"></i> REFUEL (${cost} CR)
                    </button>
                    <button class="combat-btn escape" data-action="close">LEAVE</button>
                `;
            }
        } else {
            // Goods Logic
            const canAfford = this.gameState.credits >= this.totalCost;
            
            // Cargo Check
            const currentCargo = this.gameState.cargo.reduce((a,b) => a + b.quantity, 0);
            const spaceAvailable = this.gameState.cargoCapacity - currentCargo;
            const hasSpace = spaceAvailable >= this.quantity;

            let buyBtnText = `BUY DEAL (-${this.totalCost} CR)`;
            let btnClass = "combat-btn attack"; // Greenish usually
            let disabled = false;

            if (!canAfford) {
                buyBtnText = "INSUFFICIENT FUNDS";
                disabled = true;
            } else if (!hasSpace) {
                buyBtnText = "CARGO FULL";
                disabled = true;
            }

            optionsEl.innerHTML = `
                <button class="${btnClass}" data-action="buy" ${disabled ? 'disabled' : ''}>
                    <i class="fas fa-shopping-cart"></i> ${buyBtnText}
                </button>
                <button class="combat-btn escape" data-action="close">
                    <i class="fas fa-times"></i> DECLINE
                </button>
            `;
        }
    }

    handleAction(action) {
        if (action === 'close') {
            this.end();
            return;
        }

        if (action === 'refuel') {
            const missing = this.gameState.maxFuel - Math.floor(this.gameState.fuel);
            const cost = missing * this.unitPrice;
            
            this.gameState.credits -= cost;
            this.gameState.fuel = this.gameState.maxFuel;
            
            this.log(`Fuel tanks topped off for ${cost} CR.`, '#6f9');
            this.refreshUI();
            
            // Wait slightly then close
            setTimeout(() => this.end(), 1000);
        }

        if (action === 'buy') {
            this.gameState.credits -= this.totalCost;
            
            // Add item
            const existing = this.gameState.cargo.find(i => i.id === this.good.id);
            if (existing) {
                existing.quantity += this.quantity;
            } else {
                this.gameState.cargo.push({
                    id: this.good.id,
                    name: this.good.name,
                    quantity: this.quantity,
                    buyPrice: this.unitPrice,
                    illegal: this.good.illegal
                });
            }

            this.log(`Transaction successful. Loaded ${this.quantity} units.`, '#6f9');
            this.refreshUI();
            
            setTimeout(() => this.end(), 1000);
        }
    }

    refreshUI() {
        // Force update of global stats
        if (this.ui) this.ui.updateUI(); // Assuming back-reference
        
        // Manual DOM fallback
        const credEl = document.getElementById('credits');
        const fuelEl = document.getElementById('fuel');
        if (credEl) credEl.textContent = `${Math.floor(this.gameState.credits).toLocaleString()} CR`;
        if (fuelEl) fuelEl.textContent = `${Math.floor(this.gameState.fuel)}/${this.gameState.maxFuel}`;
    }
}