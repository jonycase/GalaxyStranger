import { Encounter } from './Encounter.js';

export class TraderEncounter extends Encounter {
    constructor(player, gameState) {
        super(player, gameState, {
            type: 'trader',
            title: 'WANDERING TRADER',
            iconClass: 'fa-shopping-cart'
        });
        
        this.good = gameState.goods[Math.floor(Math.random() * gameState.goods.length)];
        this.discount = 0.7 + Math.random() * 0.2; // 70-90% of normal price
        this.price = Math.round(gameState.currentSystem.market[this.good.id].buyPrice * this.discount);
        this.maxQuantity = Math.min(5, Math.floor(gameState.credits / this.price));
    }

    renderContent(contentEl) {
        let purchaseMessage = '';
        if (this.maxQuantity > 0) {
            purchaseMessage = '<p>Would you like to purchase some?</p>';
        } else {
            purchaseMessage = '<p style="color: #ff6666;">You don\'t have enough credits to purchase any.</p>';
        }
        
        contentEl.innerHTML = `
            <p>A wandering trader offers you ${this.good.name} at a discount.</p>
            <div style="margin: 15px 0; background: rgba(0,0,0,0.2); padding: 10px; border-radius: 8px;">
                <div>Price: <span style="color: #66ff99;">${this.price} CR</span> (${Math.round(this.discount * 100)}% of market price)</div>
                <div>Available: <span style="color: #66ff99;">${this.maxQuantity} units</span></div>
            </div>
            ${purchaseMessage}
        `;
    }

    renderOptions() {
        const optionsEl = document.getElementById('encounter-options');
        if (!optionsEl) return;
        
        optionsEl.innerHTML = '';
        
        if (this.maxQuantity > 0) {
            const buyButton = document.createElement('button');
            buyButton.className = 'combat-btn';
            buyButton.style.background = 'linear-gradient(to bottom, #3a9a4a, #2a7a3a);';
            buyButton.innerHTML = `<i class="fas fa-shopping-cart"></i> BUY ${this.maxQuantity} UNITS`;
            buyButton.dataset.action = 'buy';
            optionsEl.appendChild(buyButton);
        }
        
        const leaveButton = document.createElement('button');
        leaveButton.className = 'combat-btn';
        leaveButton.innerHTML = '<i class="fas fa-times"></i> LEAVE';
        leaveButton.dataset.action = 'leave';
        optionsEl.appendChild(leaveButton);
    }

    handleAction(action) {
        if (action === 'buy' && this.maxQuantity > 0) {
            // Process transaction
            this.gameState.credits -= this.price * this.maxQuantity;
            
            // Add to cargo
            const existingItem = this.gameState.cargo.find(item => item.id === this.good.id);
            if (existingItem) {
                existingItem.quantity += this.maxQuantity;
            } else {
                this.gameState.cargo.push({
                    id: this.good.id,
                    name: this.good.name,
                    quantity: this.maxQuantity,
                    buyPrice: this.price,
                    illegal: this.good.illegal
                });
            }
            
            this.log(`Purchased ${this.maxQuantity} units of ${this.good.name}!`);
            setTimeout(() => {
                this.end();
                this.closeEncounterModal();
            }, 1000);
        } else if (action === 'leave') {
            this.log("You left the trader.");
            setTimeout(() => {
                this.end();
                this.closeEncounterModal();
            }, 500);
        } else {
            super.handleAction(action);
        }
    }
    
    end(result = {}) {
        const encounterResult = super.end(result);
        this.updateMainUI();
        return encounterResult;
    }
}