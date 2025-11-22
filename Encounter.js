/* --- START OF FILE Encounter.js --- */

export class Encounter {
    // Static property to track the modal closing timer across different instances
    static hideTimer = null;

    constructor(player, gameState, options = {}) {
        this.player = player;
        this.gameState = gameState;
        
        this.type = options.type || 'generic';
        this.title = options.title || 'Encounter';
        this.iconClass = options.iconClass || 'fa-question-circle';
        
        this.active = false;
        this.options = options;
    }

    start() {
        this.active = true;
        
        const modal = document.getElementById('encounter-modal');
        const titleEl = document.getElementById('encounter-title');
        const iconEl = document.getElementById('encounter-icon');
        const logEl = document.getElementById('encounter-log');

        if (!modal) {
            console.error("Encounter Modal element missing!");
            return;
        }

        // CRITICAL FIX: Cancel any pending "hide" timer from a previous encounter
        if (Encounter.hideTimer) {
            clearTimeout(Encounter.hideTimer);
            Encounter.hideTimer = null;
        }

        // 1. Reset UI State
        // Ensure modal is visible immediately (in case it was fading out)
        modal.style.display = 'flex';
        modal.style.opacity = '1'; 
        modal.style.pointerEvents = 'all';

        if (logEl) logEl.innerHTML = '';
        if (titleEl) titleEl.textContent = this.title;
        if (iconEl) iconEl.className = `fas ${this.iconClass}`;

        // 2. Render content specific to subclass
        this.renderContent(document.getElementById('encounter-content'));
        this.renderOptions(document.getElementById('encounter-options'));

        this.log(`Encounter initiated: ${this.title}`);
    }

    renderContent(contentEl) {
        if(contentEl) contentEl.innerHTML = '<p>...</p>';
    }

    renderOptions(optionsEl) {
        if(optionsEl) {
            optionsEl.innerHTML = `
                <button class="combat-btn escape" data-action="close">
                    <i class="fas fa-times"></i> CLOSE
                </button>
            `;
        }
    }

    handleAction(action) {
        if (action === 'close') {
            this.end();
        } else {
            this.log(`Unknown action: ${action}`, '#ffcc00');
        }
    }

    log(message, color = '#aaa') {
        const logEl = document.getElementById('encounter-log');
        if (!logEl) return;
        
        const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: "numeric", minute: "numeric", second: "numeric"});
        const entry = `<div style="color:${color}; margin-bottom:4px; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:2px;">
            <span style="color:#555; font-size:10px; margin-right:5px;">[${time}]</span> ${message}
        </div>`;
        
        logEl.insertAdjacentHTML('beforeend', entry);
        logEl.scrollTop = logEl.scrollHeight;
    }

    end(result = {}) {
        this.active = false;
        const modal = document.getElementById('encounter-modal');
        
        if (modal) {
            // If we are doing a "quiet" end (swapping encounters), don't animate out
            if (result.quiet) {
                return;
            }

            modal.style.opacity = '0';
            modal.style.pointerEvents = 'none';
            
            // Set global timer to hide display after fade
            Encounter.hideTimer = setTimeout(() => {
                modal.style.display = 'none';
                Encounter.hideTimer = null;
            }, 300);
        }

        // Callback hook
        if (this.options.onEnd) this.options.onEnd(result);
    }
}