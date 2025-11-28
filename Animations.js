/* --- START OF FILE Animations.js --- */

export class TravelAnimations {
    constructor(ui, gameState) {
        this.ui = ui;
        this.gameState = gameState;
        this.currentAnimation = null;
    }

    /**
     * Enhanced travel animation using GSAP
     */
    performTravelAnimation(res) {
        // Cancel any existing animation
        if (this.currentAnimation) {
            this.currentAnimation.kill();
        }

        this.ui.showNotification(res.message);
        document.querySelector('.ui-panel').classList.add('traveling');
        
        const startPos = {
            x: this.gameState.ship.x, 
            y: this.gameState.ship.y
        };
        const endPos = {
            x: this.gameState.targetSystem.x, 
            y: this.gameState.targetSystem.y
        };
        
        // Calculate rotation angle
        const dx = endPos.x - startPos.x;
        const dy = endPos.y - startPos.y;
        const targetRotation = (Math.atan2(dy, dx) * 180 / Math.PI);
        
        // Calculate duration based on distance (faster than before)
        const baseDuration = Math.max(1, Math.min(3, res.distance / 50)); // 1-3 seconds
        const duration = baseDuration;

        // Create a smooth rotation animation first
        gsap.to(this.gameState.ship, {
            rotation: targetRotation,
            duration: 0.5,
            ease: "power2.out"
        });

        // Main travel animation
        this.currentAnimation = gsap.to(this.gameState.ship, {
            x: endPos.x,
            y: endPos.y,
            duration: duration,
            ease: "power2.inOut",
            
            onUpdate: () => {
                // Smooth camera follow with slight lag for cinematic effect
                gsap.to(this.ui.galaxyMap.camera, {
                    x: this.gameState.ship.x,
                    y: this.gameState.ship.y,
                    duration: 0.5,
                    ease: "power2.out"
                });
                
                // Add subtle scale effect during travel
                if (this.ui.shipIndicatorEl) {
                    const progress = this.currentAnimation.progress();
                    const scale = 1 + Math.sin(progress * Math.PI) * 0.3;
                    this.ui.shipIndicatorEl.style.transform = `
                        translate(${this.ui.galaxyMap.worldToScreen(this.gameState.ship.x, this.gameState.ship.y).x}px, 
                                 ${this.ui.galaxyMap.worldToScreen(this.gameState.ship.x, this.gameState.ship.y).y}px) 
                        rotate(${this.gameState.ship.rotation}deg) 
                        scale(${scale})
                    `;
                }
            },
            
            onComplete: () => {
                this.handleArrival();
            }
        });

        // Add engine trail effect
        this.createEngineTrail(startPos, endPos, duration);
    }

    /**
     * Creates a visual engine trail effect during travel
     */
    createEngineTrail(startPos, endPos, duration) {
        const trailContainer = document.getElementById('ship-container');
        if (!trailContainer) return;

        // Create trail element
        const trail = document.createElement('div');
        trail.className = 'engine-trail';
        trail.style.cssText = `
            position: absolute;
            width: 4px;
            height: 4px;
            background: var(--accent-primary);
            border-radius: 50%;
            pointer-events: none;
            filter: blur(1px);
            opacity: 0;
        `;
        trailContainer.appendChild(trail);

        // Animate trail
        gsap.fromTo(trail, 
            {
                x: startPos.x,
                y: startPos.y,
                scale: 0,
                opacity: 0.8
            },
            {
                x: endPos.x,
                y: endPos.y,
                scale: 1.5,
                opacity: 0,
                duration: duration * 0.8,
                ease: "power2.out",
                onComplete: () => {
                    if (trail.parentNode) {
                        trail.parentNode.removeChild(trail);
                    }
                }
            }
        );

        // Create multiple trail particles
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                const particle = document.createElement('div');
                particle.className = 'engine-particle';
                particle.style.cssText = `
                    position: absolute;
                    width: 2px;
                    height: 2px;
                    background: var(--accent-warning);
                    border-radius: 50%;
                    pointer-events: none;
                    filter: blur(0.5px);
                    opacity: 0;
                `;
                trailContainer.appendChild(particle);

                gsap.fromTo(particle, 
                    {
                        x: startPos.x + (Math.random() - 0.5) * 10,
                        y: startPos.y + (Math.random() - 0.5) * 10,
                        scale: 0,
                        opacity: 0.6
                    },
                    {
                        x: endPos.x + (Math.random() - 0.5) * 20,
                        y: endPos.y + (Math.random() - 0.5) * 20,
                        scale: 1,
                        opacity: 0,
                        duration: duration * (0.5 + Math.random() * 0.5),
                        ease: "power2.out",
                        onComplete: () => {
                            if (particle.parentNode) {
                                particle.parentNode.removeChild(particle);
                            }
                        }
                    }
                );
            }, i * 100);
        }
    }

    /**
     * Enhanced arrival sequence
     */
    handleArrival() {
        document.querySelector('.ui-panel').classList.remove('traveling');
        
        // Arrival flash effect
        this.createArrivalFlash();
        
        // Complete travel logic
        this.gameState.completeTravel();
        this.ui.showNotification(`Arrived at ${this.gameState.currentSystem.name}`);
        this.ui.updateUI();
        
        // Camera settle animation
        gsap.to(this.ui.galaxyMap.camera, {
            x: this.gameState.ship.x,
            y: this.gameState.ship.y,
            duration: 0.3,
            ease: "back.out(1.7)"
        });

        // Ship settle animation
        gsap.to(this.ui.shipIndicatorEl, {
            scale: 1,
            rotation: this.gameState.ship.rotation + 360,
            duration: 0.5,
            ease: "back.out(1.7)"
        });

        // Trigger encounter check after a brief delay
        setTimeout(() => {
            if (this.ui.encounterManager.shouldTriggerEncounter()) {
                const encounterData = this.ui.encounterManager.getRandomEncounter();
                this.ui.encounterManager.startEncounter(encounterData.type);
            }
        }, 800);
    }

    /**
     * Creates a flash effect when arriving at a system
     */
    createArrivalFlash() {
        const flash = document.createElement('div');
        flash.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: radial-gradient(circle, var(--accent-primary) 0%, transparent 70%);
            opacity: 0;
            pointer-events: none;
            z-index: 100;
        `;
        document.querySelector('.map-container').appendChild(flash);

        gsap.to(flash, {
            opacity: 0.3,
            duration: 0.1,
            ease: "power2.out",
            onComplete: () => {
                gsap.to(flash, {
                    opacity: 0,
                    duration: 0.3,
                    ease: "power2.in",
                    onComplete: () => {
                        if (flash.parentNode) {
                            flash.parentNode.removeChild(flash);
                        }
                    }
                });
            }
        });
    }

    /**
     * Quick jump animation for nearby systems
     */
    quickJump(targetSystem) {
        if (this.currentAnimation) {
            this.currentAnimation.kill();
        }

        const startPos = { x: this.gameState.ship.x, y: this.gameState.ship.y };
        const endPos = { x: targetSystem.x, y: targetSystem.y };

        // Blink out
        gsap.to(this.ui.shipIndicatorEl, {
            scale: 0,
            opacity: 0,
            duration: 0.2,
            ease: "power2.in",
            onComplete: () => {
                // Instant position update
                this.gameState.ship.x = endPos.x;
                this.gameState.ship.y = endPos.y;
                this.ui.galaxyMap.camera.x = endPos.x;
                this.ui.galaxyMap.camera.y = endPos.y;
                
                // Blink in
                gsap.to(this.ui.shipIndicatorEl, {
                    scale: 1,
                    opacity: 1,
                    duration: 0.3,
                    ease: "power2.out"
                });

                this.gameState.currentSystem = targetSystem;
                this.ui.updateUI();
            }
        });
    }

    /**
     * Cancel current animation
     */
    cancelTravel() {
        if (this.currentAnimation) {
            this.currentAnimation.kill();
            document.querySelector('.ui-panel').classList.remove('traveling');
            
            // Reset ship indicator
            if (this.ui.shipIndicatorEl) {
                gsap.to(this.ui.shipIndicatorEl, {
                    scale: 1,
                    rotation: this.gameState.ship.rotation,
                    duration: 0.3,
                    ease: "power2.out"
                });
            }
        }
    }
}