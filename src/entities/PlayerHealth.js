import { EVENTS } from '../core/Constants.js';

/**
 * @class PlayerHealth
 * @description Gestiona el ciclo de vida del jugador: daño, escudos, vidas y muerte definitiva.
 * Ahora integrado con Galactic Phoenix FX para feedback táctil y visual.
 */
export default class PlayerHealth {
    constructor(player) {
        /** @type {import('./Player.js').default} */
        this.player = player;
        /** @type {Phaser.Scene} */
        this.scene = player.scene;
        /** @type {GalacticPhoenixFX} */
        this.fx = player.scene.fx;
    }

    /**
     * Procesa el daño recibido, priorizando el agotamiento de escudos.
     * @param {Object} projectileStats - Datos del impacto.
     */
    takeDamage(projectileStats) {
        const p = this.player;
        
        if (!projectileStats || p.isDead || p.isInvulnerable) return;

        let incomingDamage = projectileStats.damage || 0;

        // 1. Lógica de Mitigación por Escudo
        if (p.shield > 0) {
            const damageToShield = Math.min(p.shield, incomingDamage);
            p.shield -= damageToShield;
            incomingDamage -= damageToShield;

            // Feedback visual de escudo (Cian/Plasma)
            if (this.fx) {
                this.fx.plasma(p.x, p.y);
                this.scene.cameras.main.shake(50, 0.005);
            }
            
            this.scene.events.emit(EVENTS.PLAYER_SHIELD, p.shield, p.maxShield);
        }

        // 2. Aplicación de Daño Residual a la Salud (Casco)
        if (incomingDamage > 0) {
            // Efecto de impacto metálico antes de restar vida
            if (this.fx) {
                this.fx.sparks(p.x, p.y);
                this.fx.debris(p.x, p.y); // Saltan piezas de la nave
                this.scene.cameras.main.flash(100, 255, 0, 0, true); // Flash rojo sutil
            }

            p.applyBaseDamage({ ...projectileStats, damage: incomingDamage });
            this.scene.events.emit(EVENTS.PLAYER_HIT, { current: p.hp, max: p.maxHp });
        }

        // 3. Verificación de Estado Crítico
        if (p.hp <= 0 && !p.isDead) {
            this.handleDeath();
        }
    }

    /**
     * Gestiona la secuencia de destrucción cinemática.
     */
    handleDeath() {
        const p = this.player;
        if (p.isDead) return;

        p.isDead = true;
        p.canShoot = false;

        // Detener físicas
        if (p.body) {
            p.body.enable = false;
            p.body.setVelocity(0, 0);
        }

        // --- Secuencia de Destrucción FX ---
        if (this.fx) {
            // 1. Fallo mecánico inmediato
            this.fx.mechanicalFailure(p.x, p.y);
            // 2. Distorsión de muerte
            this.fx.applyDistortion(800, 2.0);
            // 3. Explosión en cadena pequeña antes de desaparecer
            this.fx.chainReaction(p.x, p.y, 3);
        }

        // Feedback de Audio
        if (this.scene.audioManager) {
            this.scene.audioManager.playSFX('sfx_player_explode');
        }

        // Desvanecimiento visual
        this.scene.tweens.add({
            targets: p,
            alpha: 0,
            duration: 500,
            onComplete: () => {
                p.setVisible(false);
                p.setActive(false);
                p.vfx.stopEngine();
            }
        });

        this.scene.events.emit(EVENTS.PLAYER_HIT, { current: 0, max: p.maxHp });

        // Gestión del Sistema de Vidas
        if (this.scene.lives !== undefined && this.scene.lives > 0) {
            this.scene.lives--;
            this.scene.events.emit(EVENTS.LIFE_CHANGE, this.scene.lives);

            if (this.scene.lives <= 0) {
                this.triggerGameOver();
            } else {
                // Programar Respawn con margen para ver la explosión
                this.scene.time.delayedCall(2000, () => {
                    if (this.scene && !this.scene.isGameOver) {
                        p.respawn();
                    }
                });
            }
        } else {
            this.triggerGameOver();
        }
    }

    /**
     * Finaliza la lógica del juego.
     */
    triggerGameOver() {
        if (this.scene) {
            this.scene.isGameOver = true;
            
            // Efecto de cámara lenta al morir definitivamente
            this.scene.time.timeScale = 0.5;
            this.scene.time.delayedCall(1000, () => {
                this.scene.time.timeScale = 1;
                this.scene.events.emit(EVENTS.GAME_OVER);
            });
        }
    }

    /**
     * Incrementa el contador de vidas.
     */
    addLife(amount = 1) {
        if (this.scene.lives === undefined) this.scene.lives = 3;
        this.scene.lives += amount;
        
        // Efecto de "PowerUp" visual
        if (this.fx) this.fx.orbitalRing(this.player.x, this.player.y);
        
        this.scene.events.emit(EVENTS.LIFE_CHANGE, this.scene.lives);
    }
}
