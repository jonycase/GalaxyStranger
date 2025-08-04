import { Encounter } from './Encounter.js';

export class DistressEncounter extends Encounter {
    constructor(player, gameState, options = {}) {
        super(player, gameState, {
            ...options,
            type: 'distress',
            title: 'DISTRESS SIGNAL',
            iconClass: 'fa-siren-on'
        });
        
        this.reward = 500 + Math.floor(Math.random() * 1500);
    }

    renderContent(contentEl) {
        contentEl.innerHTML = `
            <p>You've detected a distress signal from a nearby freighter.</p>
            <div style="margin: 15px 0; background: rgba(0,0,0,0.2); padding: 10px; border-radius: 8px;">
                <div>Reward: <span style="color: #66ff99;">${this.reward} CR</span></div>
            </div>
            <p>Would you like to investigate and assist?</p>
        `;
    }

    renderOptions() {
        const optionsEl = document.getElementById('encounter-options');
        if (!optionsEl) return;
        
        optionsEl.innerHTML = '';
        
        const assistButton = document.createElement('button');
        assistButton.className = 'combat-btn';
        assistButton.style.background = 'linear-gradient(to bottom, #3a9a4a, #2a7a3a);';
        assistButton.innerHTML = `<i class="fas fa-hand-holding-heart"></i> ASSIST`;
        assistButton.dataset.action = 'assist';
        optionsEl.appendChild(assistButton);
        
        const ignoreButton = document.createElement('button');
        ignoreButton.className = 'combat-btn';
        ignoreButton.style.background = 'linear-gradient(to bottom, #cc6666, #aa4444);';
        ignoreButton.innerHTML = `<i class="fas fa-times"></i> IGNORE`;
        ignoreButton.dataset.action = 'ignore';
        optionsEl.appendChild(ignoreButton);
    }

    handleAction(action) {
        if (action === 'assist') {
            this.gameState.credits += this.reward;
            this.log(`You rescued the stranded freighter! Received ${this.reward} CR reward.`);
        } else {
            this.log("You chose to ignore the distress signal.");
        }
        
        setTimeout(() => {
            this.end();
            this.closeEncounterModal();
        }, 1000);
    }
    
    end(result = {}) {
        const encounterResult = super.end(result);
        this.updateMainUI();
        return encounterResult;
    }
}