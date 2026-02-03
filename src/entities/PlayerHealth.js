import { EVENTS } from '../core/Constants.js';

/**
 * @class PlayerHealth
 * @description Gestiona el ciclo de vida del jugador: daño, escudos, vidas y muerte definitiva.
 */
export default class PlayerHealth {
    constructor(player) {
        /** @type {import('./Player.js').default} */
        this.player = player;
        /** @type {Phaser.Scene} */
        this.scene = player.scene;
    }

    /**
     * Procesa el daño recibido, priorizando el agotamiento de escudos.
     * @param {Object} projectileStats - Datos del impacto.
     */
    takeDamage(projectileStats) {
        const p = this.player;
        
        // Si ya está muerto o es invulnerable, ignoramos el impacto
        if (!projectileStats || p.isDead || p.isInvulnerable) return;

        let incomingDamage = projectileStats.damage || 0;

        // 1. Lógica de Mitigación por Escudo
        if (p.shield > 0) {
            const damageToShield = Math.min(p.shield, incomingDamage);
            p.shield -= damageToShield;
            incomingDamage -= damageToShield;
            this.scene.events.emit(EVENTS.PLAYER_SHIELD, p.shield, p.maxShield);
        }

        // 2. Aplicación de Daño Residual a la Salud
        if (incomingDamage > 0) {
            // Llamamos al método de puente en Player para usar la lógica de Entity
            p.applyBaseDamage({ ...projectileStats, damage: incomingDamage });
            this.scene.events.emit(EVENTS.PLAYER_HIT, { current: p.hp, max: p.maxHp });
        }

        // 3. Verificación de Estado Crítico
        if (p.hp <= 0 && !p.isDead) {
            this.handleDeath();
        }
    }

    /**
     * Gestiona la secuencia de destrucción. Decide si restar vida o terminar el juego.
     */
    handleDeath() {
        const p = this.player;
        if (p.isDead) return;

        // Marcamos el estado inmediatamente para evitar múltiples ejecuciones
        p.isDead = true;
        p.canShoot = false;

        // Limpieza física y visual inmediata
        if (p.body) {
            p.body.enable = false;
            p.body.setVelocity(0, 0);
        }

        p.vfx.stopEngine();
        p.setVisible(false);
        p.setActive(false);

        // Notificamos a la UI que el jugador ha caído en esta instancia
        this.scene.events.emit(EVENTS.PLAYER_HIT, { current: 0, max: p.maxHp });

        // Gestión del Sistema de Vidas
        if (this.scene.lives !== undefined && this.scene.lives > 0) {
            this.scene.lives--;
            this.scene.events.emit(EVENTS.LIFE_CHANGE, this.scene.lives);

            if (this.scene.lives <= 0) {
                this.triggerGameOver();
            } else {
                // Programamos el respawn solo si hay continuidad
                this.scene.time.delayedCall(1500, () => {
                    // Verificación de seguridad: que la escena siga activa y no estemos en Game Over
                    if (this.scene && !this.scene.isGameOver && p.isDead) {
                        p.respawn();
                    }
                });
            }
        } else {
            // Si lives es 0 o indefinido por error, Game Over directo
            this.triggerGameOver();
        }
    }

    /**
     * Finaliza la lógica del jugador y emite el evento global de derrota.
     */
    triggerGameOver() {
        // Aseguramos que la flag de la escena esté arriba
        if (this.scene) {
            this.scene.isGameOver = true;
            this.scene.events.emit(EVENTS.GAME_OVER);
        }
    }

    /**
     * Incrementa el contador de vidas.
     * @param {number} amount 
     */
    addLife(amount = 1) {
        if (this.scene.lives === undefined) this.scene.lives = 3;
        this.scene.lives += amount;
        this.scene.events.emit(EVENTS.LIFE_CHANGE, this.scene.lives);
    }
}
