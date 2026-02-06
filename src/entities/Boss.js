import { EVENTS } from '../core/Constants.js';
import Entity from './Entity.js';

/**
 * @class Boss
 * @extends Entity
 * @description Entidad enemiga compleja con múltiples fases, patrones de movimiento dinámicos
 * y lógica de combate personalizada basada en umbrales de salud.
 * 
 * @fires EVENTS.BOSS_DEFEATED
 * @fires EVENTS.SCORE_CHANGE
 */
export default class Boss extends Entity {
    /**
     * @param {Phaser.Scene} scene - La escena a la que pertenece este jefe.
     */
    constructor(scene) {
        super(scene, 0, 0, 'boss_1');
        /** @type {boolean} */
        this.behaviorActive = false;
        /** @type {number} */
        this.fireTimer = 0;
    }

    /**
     * Inicializa al jefe con un objeto de configuración y comienza la animación de entrada.
     * @param {Object} config - Configuración del jefe desde JSON.
     * @param {string} config.name - Nombre del jefe.
     * @param {number} config.hp - Puntos de salud.
     * @param {string} config.sprite - Clave del sprite.
     * @param {number} config.visual_scale - Factor de escala.
     * @param {string} config.behavior - ID del patrón de movimiento.
     * @param {Array<Object>} config.phases - Lista de fases de combate por umbral de HP.
     */
    spawnBoss(config) {
        this.config = config;
        this.hp = config.hp;
        this.maxHp = config.hp;
        this.setTexture(config.sprite);
        this.setScale(config.visual_scale);
        this.refreshHitbox(); // metodo de refrescamiento de hitbox
        this.resistances = config.resistances || {};

        this.setPosition(this.scene.scale.width + 300, this.scene.scale.height / 2);
        this.setActive(true);
        this.setVisible(true);
        this.isDead = false;
        this.body.enable = true;
        this.isVulnerable = false; // Invulnerable durante entrada

        // Entrada triunfal
        this.scene.tweens.add({
            targets: this,
            x: 600,
            duration: 2500,
            ease: 'Power2',
            onComplete: () => {
                this.behaviorActive = true;
                this.isVulnerable = true; // Ahora puede recibir daño
            }
        });

        // Notificar al sistema de debug
        this.scene.events.emit(EVENTS.ENTITY_SPAWNED, this);
    }

    /**
     * Bucle principal de actualización para el jefe.
     * @param {number} time - Tiempo actual del juego.
     * @param {number} delta - Tiempo delta.
     */
    update(time, delta) {
        if (!this.active || !this.behaviorActive || this.isDead) return;

        this.handleMovement(time);
        this.handleCombat(time);
    }

    /**
     * Maneja los patrones de movimiento basados en la configuración (ej. rebote, ocho).
     * @param {number} time - Tiempo actual del juego.
     */
    handleMovement(time) {
        if (!this.behaviorActive) return;
        const speed = this.config.speed || 100;

        if (this.config.behavior === 'vertical_bounce') {
            const vy = Math.sin(time * 0.002) * speed;
            this.body.setVelocityX(0);
            this.body.setVelocityY(vy);
        } else if (this.config.behavior === 'figure_eight') {
            const vy = Math.sin(time * 0.002) * speed;
            const vx = Math.cos(time * 0.001) * (speed / 2);
            this.body.setVelocityX(vx);
            this.body.setVelocityY(vy);
        } else if (this.config.behavior === 'horizontal_drift') {
            // Slow horizontal drift with vertical oscillation
            const vx = Math.sin(time * 0.001) * (speed * 0.6);
            const vy = Math.cos(time * 0.0015) * (speed * 0.8);
            this.body.setVelocityX(vx);
            this.body.setVelocityY(vy);
        } else if (this.config.behavior === 'aggressive_pursuit') {
            // Active pursuit of player
            if (this.scene.player && this.scene.player.active) {
                const targetX = this.scene.player.x;
                const targetY = this.scene.player.y;
                const deltaX = targetX - this.x;
                const deltaY = targetY - this.y;
                const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

                if (distance > 50) {
                    this.body.setVelocityX((deltaX / distance) * speed * 0.5);
                    this.body.setVelocityY((deltaY / distance) * speed * 0.5);
                } else {
                    this.body.setVelocity(0, 0);
                }
            } else {
                this.body.setVelocity(0, 0);
            }
        } else if (this.config.behavior === 'chaos_pattern') {
            // Unpredictable movement with random changes
            const phase = Math.floor(time / 3000) % 4;
            switch (phase) {
                case 0:
                    this.body.setVelocityX(Math.sin(time * 0.003) * speed);
                    this.body.setVelocityY(Math.cos(time * 0.002) * speed);
                    break;
                case 1:
                    this.body.setVelocityX(Math.cos(time * 0.004) * speed * 1.2);
                    this.body.setVelocityY(-Math.sin(time * 0.003) * speed * 0.8);
                    break;
                case 2:
                    this.body.setVelocityX(-Math.sin(time * 0.002) * speed * 0.7);
                    this.body.setVelocityY(Math.sin(time * 0.005) * speed * 1.1);
                    break;
                case 3:
                    this.body.setVelocityX(Math.cos(time * 0.001) * speed * 0.9);
                    this.body.setVelocityY(Math.cos(time * 0.004) * speed);
                    break;
            }
        }
    }

    /**
     * Gestiona las fases de combate y las cadencias de fuego.
     * @param {number} time - Tiempo actual del juego.
     */
    handleCombat(time) {
        const hpPercent = this.hp / this.maxHp;

        // Encontrar fase actual basándose en la vida
        const phases = this.config.phases;
        if (!phases || phases.length === 0) return;

        // Añadimos el primer elemento como valor inicial (el 'prev' por defecto)
        const currentPhase = phases.reduce((prev, curr) => {
            return (hpPercent <= curr.hp_threshold) ? curr : prev;
        }, phases[0]); // <--- Este es el valor inicial

        if (time > this.fireTimer) {
            this.shoot(currentPhase.weapon);
            this.fireTimer = time + currentPhase.fire_rate;
        }
    }

    /**
     * Dispara un proyectil usando el arma especificada.
     * @param {string} weaponKey - Tipo de arma desde JSON.
     */
    shoot(weaponKey) {
        if (!this.scene.enemiesBullets) return;

        const bullet = this.scene.enemiesBullets.get();
        if (bullet) {
            // Fuego del Boss va hacia la izquierda (false)
            bullet.fire(this.x - 60, this.y, weaponKey, false);
        }
    }

    /**
     * Override del método takeDamage para jefes.
     * Previene daño durante la animación de entrada y maneja transiciones de fase.
     * @param {Object} projectileStats - Estadísticas del proyectil.
     */
    takeDamage(projectileStats) {
        // No recibir daño si está muerto, inactivo, o en animación de entrada
        if (this.isDead || !this.active || !this.isVulnerable) {
            return;
        }

        // Llamar al método base de Entity para aplicar daño
        super.takeDamage(projectileStats);

        // Emitir evento de feedback al sistema de UI
        const hpPercent = (this.hp / this.maxHp) * 100;
        this.scene.events.emit('BOSS_DAMAGE_TAKEN', {
            bossName: this.config.name,
            currentHp: this.hp,
            maxHp: this.maxHp,
            hpPercent: hpPercent
        });
    }

    /**
     * Activa la secuencia de muerte del jefe, incluyendo sacudida de pantalla y eventos.
     * @fires EVENTS.BOSS_DEFEATED
     */
    die() {
        this.behaviorActive = false;
        this.body.stop();
        this.scene.cameras.main.shake(1000, 0.03);

        // Notificar destrucción para efectos y sonido
        this.scene.events.emit(EVENTS.ENEMY_DESTROYED, this.x, this.y, true);

        // Notificar al sistema de debug
        this.scene.events.emit(EVENTS.ENTITY_DESTROYED, this);

        // Tintado de explosión
        this.setTint(0xff0000);

        this.scene.time.delayedCall(1500, () => {
            this.scene.events.emit(EVENTS.BOSS_DEFEATED, this.config.name);
            this.scene.events.emit(EVENTS.SCORE_CHANGE, 5000);
            super.die();
        });
    }
}
