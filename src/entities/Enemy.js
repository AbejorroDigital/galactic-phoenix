/**
 * @typedef {Object} EnemyConfig
 * @property {string} sprite - Clave del sprite en el cache.
 * @property {number} hp - Puntos de vida iniciales.
 * @property {Object.<string, number>} [resistances] - Multiplicadores de daño.
 * @property {'linear'|'sine_wave'|'zigzag'} movement - Patrón de movimiento.
 * @property {number} [speed=150] - Velocidad horizontal.
 * @property {number} [visual_scale=1] - Escala del sprite.
 */

import { EVENTS } from '../core/Constants.js';
import Entity from './Entity.js';

/**
 * @class Enemy
 * @extends Entity
 * @description Unidad estándar de enemigos. Gestionada mediante pool de Phaser.
 * Ahora integrada con Galactic Phoenix FX para feedback de daño y muerte.
 */
export default class Enemy extends Entity {
    /**
     * @param {Phaser.Scene} scene - La escena a la que pertenece.
     */
    constructor(scene) {
        super(scene, 0, 0, 'enemy1');
        /** @type {number} */
        this.birthTime = 0;
        /** @type {string} */
        this.movementType = 'linear';
        /** @type {number} */
        this.speed = 150;
        /** @type {GalacticPhoenixFX} */
        this.fx = scene.fx;
    }

    /**
     * Inicializa o reinicia el enemigo desde el pool.
     * @param {number} y - Posición vertical inicial.
     * @param {EnemyConfig} config - Datos de configuración.
     */
    spawn(y, config) {
        // Posicionar ligeramente fuera de cámara a la derecha
        this.setPosition(this.scene.scale.width + 50, y);
        this.setTexture(config.sprite);
        this.hp = config.hp || config.health || 20;
        this.maxHp = this.hp;
        this.resistances = config.resistances || {};
        this.movementType = config.pattern || config.movement || 'linear';
        this.speed = config.speed || 150;
        this.setScale(0); // Empezamos en 0 para efecto de entrada

        // Estadísticas de combate
        this.weaponId = config.weapon || 'enemy_laser';
        this.fireRate = config.fire_rate || 2000;
        this.fireTimer = 0;

        this.isDead = false;
        this.setActive(true);
        this.setVisible(true);
        this.body.enable = true;
        this.clearTint();

        this.birthTime = this.scene.time.now;

        // Efecto de "Warp-in" al aparecer
        this.scene.tweens.add({
            targets: this,
            scale: config.visual_scale || 1,
            duration: 400,
            ease: 'Back.easeOut'
        });

        // Movimiento base hacia la izquierda
        this.body.setVelocityX(-this.speed);
    }

    /**
     * Actualiza el movimiento y la lógica de disparo.
     */
    update(time) {
        if (!this.active || this.isDead) return;

        const elapsed = time - this.birthTime;

        // Lógica de patrones de movimiento
        switch (this.movementType) {
            case 'sine':
            case 'sine_wave':
                this.body.setVelocityY(Math.sin(elapsed * 0.005) * 150);
                break;
            case 'zigzag':
                // Cambio de dirección cada 1000ms
                const direction = Math.floor(elapsed / 1000) % 2 === 0 ? 1 : -1;
                this.body.setVelocityY(direction * 120);
                break;
            default:
                this.body.setVelocityY(0);
        }

        this.body.setVelocityX(-this.speed);

        // Disparo (solo si está dentro de la pantalla)
        if (time > this.fireTimer && this.x < this.scene.scale.width) {
            this.shoot(time);
        }

        // Limpieza automática al salir por la izquierda
        if (this.x < -100) {
            this.dieSilently();
        }
    }

    /**
     * Sobreescritura para añadir feedback visual de impacto.
     */
    takeDamage(stats) {
        if (this.isDead) return;

        super.takeDamage(stats);

        // Feedback visual: Flash blanco y chispas
        this.setTint(0xffffff);
        this.scene.time.delayedCall(50, () => {
            if (this.active && !this.isDead) this.clearTint();
        });

        if (this.fx) {
            this.fx.sparks(this.x, this.y);
            // Si le queda poca vida, soltar escombros metálicos
            if (this.hp < this.maxHp * 0.3) {
                this.fx.debris(this.x, this.y);
            }
        }
    }

    /**
     * Dispara un proyectil.
     */
    shoot(time) {
        if (!this.scene.enemiesBullets) return;

        const bullet = this.scene.enemiesBullets.get();
        if (bullet) {
            bullet.fire(this.x - 20, this.y, this.weaponId, false);
            // Añadir varianza para que no todos los enemigos disparen en coro
            this.fireTimer = time + this.fireRate + Phaser.Math.Between(-300, 300);
        }
    }

    /**
     * Muerte del enemigo con integración de eventos y FX.
     */
    die() {
        if (this.isDead) return;
        this.isDead = true;

        // Sumar puntos
        this.scene.events.emit(EVENTS.SCORE_CHANGE, 100);

        // El GameScene escucha este evento para lanzar fx.standard o fx.plasma
        this.scene.events.emit(EVENTS.ENEMY_DESTROYED, this.x, this.y, false);

        // Efecto adicional local: escombros finales
        if (this.fx) {
            this.fx.debris(this.x, this.y);
            // 20% de probabilidad de una pequeña falla mecánica extra
            if (Math.random() > 0.8) this.fx.mechanicalFailure(this.x, this.y);
        }

        // Probabilidad de soltar un PowerUp
        if (typeof this.scene.trySpawnPowerUp === 'function') {
            this.scene.trySpawnPowerUp(this.x, this.y);
        }

        // Desactivar colisiones inmediatamente
        this.body.enable = false;

        // Animación de encogimiento antes de desaparecer del pool
        this.scene.tweens.add({
            targets: this,
            scale: 0,
            alpha: 0,
            duration: 200,
            onComplete: () => {
                super.die(); // Devuelve al pool
                this.setAlpha(1); // Reset para el próximo spawn
            }
        });
    }

    /**
     * Limpieza silenciosa para cuando sale de pantalla.
     */
    dieSilently() {
        this.isDead = true;
        this.setActive(false);
        this.setVisible(false);
        this.body.enable = false;
        if (this.body) this.body.stop();
    }
}
