/**
 * @typedef {Object} EnemyConfig
 * @property {string} sprite - Key of the sprite in the cache.
 * @property {number} hp - Initial health points.
 * @property {Object.<string, number>} [resistances] - Damage multipliers by type.
 * @property {'linear'|'sine_wave'|'zigzag'} movement - The movement pattern to follow.
 * @property {number} [speed=150] - Horizontal speed.
 * @property {number} [visual_scale=1] - Sprite scale.
 */

import { EVENTS } from '../core/Constants.js';
import Entity from './Entity.js';

/**
 * @class Enemy
 * @extends Entity
 * @description Standard unit for enemies. Managed through a Phaser Group pool.
 * Supports multiple movement patterns and automatic cleanup.
 * 
 * @fires EVENTS.SCORE_CHANGE
 * 
 * @example
 * const enemy = enemyGroup.get();
 * enemy.spawn(300, { sprite: 'interceptor', hp: 50, movement: 'sine_wave' });
 */
export default class Enemy extends Entity {
    /**
     * @param {Phaser.Scene} scene - The scene this enemy belongs to.
     */
    constructor(scene) {
        super(scene, 0, 0, 'enemy1');
        /** @type {number} */
        this.birthTime = 0;
        /** @type {string} */
        this.movementType = 'linear';
        /** @type {number} */
        this.speed = 150;
    }

    /**
     * Initializes or resets the enemy from the pool.
     * @param {number} y - Initial vertical position.
     * @param {EnemyConfig} config - Configuration data for this enemy instance.
     */
    spawn(y, config) {
        this.setPosition(this.scene.scale.width + 50, y);
        this.setTexture(config.sprite);
        this.hp = config.hp || config.health || 20; // Support both names
        this.maxHp = this.hp;
        this.resistances = config.resistances || {};
        this.movementType = config.pattern || config.movement || 'linear'; // Support both names
        this.speed = config.speed || 150;
        this.setScale(config.visual_scale || 1);

        // Combat stats
        this.weaponId = config.weapon || 'enemy_laser';
        this.fireRate = config.fire_rate || 2000;
        this.fireTimer = 0;

        this.isDead = false;
        this.setActive(true);
        this.setVisible(true);
        this.body.enable = true;

        this.birthTime = this.scene.time.now;

        // Base movement: ALWAYS to the left in a horizontal Shmup
        this.body.setVelocityX(-this.speed);

        // Notificar al sistema de debug
        this.scene.events.emit(EVENTS.ENTITY_SPAWNED, this);
    }

    /**
     * Updates movement based on the configured pattern and handles shooting.
     * @param {number} time - Current game time.
     */
    update(time) {
        if (!this.active || this.isDead) return;

        // Movement pattern logic
        const elapsed = time - this.birthTime;

        switch (this.movementType) {
            case 'sine':
            case 'sine_wave':
                this.body.setVelocityY(Math.sin(elapsed * 0.005) * 150);
                break;
            case 'zigzag':
                if (Math.floor(elapsed / 1000) % 2 === 0) {
                    this.body.setVelocityY(100);
                } else {
                    this.body.setVelocityY(-100);
                }
                break;
            case 'pursuit':
                // Smooth pursuit of player position
                if (this.scene.player && this.scene.player.active) {
                    const targetY = this.scene.player.y;
                    const deltaY = targetY - this.y;
                    const pursuitSpeed = 80;
                    this.body.setVelocityY(Math.max(-pursuitSpeed, Math.min(pursuitSpeed, deltaY * 0.5)));
                } else {
                    this.body.setVelocityY(0);
                }
                break;
            case 'burst_speed':
                // Periodic speed bursts
                const burstCycle = Math.floor(elapsed / 2000) % 2;
                if (burstCycle === 0) {
                    this.body.setVelocityX(-this.speed * 1.5); // Burst phase
                } else {
                    this.body.setVelocityX(-this.speed * 0.5); // Slow phase
                }
                this.body.setVelocityY(Math.sin(elapsed * 0.003) * 50);
                break;
            case 'circular':
                // Circular/orbital movement
                const radius = 80;
                const angularSpeed = 0.002;
                const centerY = 300; // Middle of screen
                this.body.setVelocityY(Math.cos(elapsed * angularSpeed) * radius * angularSpeed * 1000);
                break;
            case 'wave_complex':
                // Complex sinusoidal with variable amplitude
                const amplitude = 100 + Math.sin(elapsed * 0.001) * 50;
                this.body.setVelocityY(Math.sin(elapsed * 0.006) * amplitude);
                break;
            default:
                this.body.setVelocityY(0);
        }

        // Keep horizontal movement consistent (unless overridden by burst_speed)
        if (this.movementType !== 'burst_speed') {
            this.body.setVelocityX(-this.speed);
        }

        // Shooting logic
        if (time > this.fireTimer) {
            this.shoot(time);
        }

        // Automatic cleanup off-screen
        if (this.x < -100) {
            this.dieSilently();
        }
    }

    /**
     * Fires a projectile if a weapon is assigned.
     * @param {number} time - Current game time.
     */
    shoot(time) {
        if (!this.scene.enemiesBullets) return;

        const bullet = this.scene.enemiesBullets.get();
        if (bullet) {
            // Enemy fire goes to the left (false)
            bullet.fire(this.x - 20, this.y, this.weaponId, false);
            this.fireTimer = time + this.fireRate + Phaser.Math.Between(-200, 200); // Add variance
        }
    }

    /**
     * Triggered when the enemy is destroyed by the player.
     * Handles score emission and power-up drop probability.
     * @fires EVENTS.SCORE_CHANGE
     */
    die() {
        // Emitir puntos
        this.scene.events.emit(EVENTS.SCORE_CHANGE, 100);

        // Notificar destrucción para efectos y sonido
        this.scene.events.emit(EVENTS.ENEMY_DESTROYED, this.x, this.y, false);

        // Notificar al sistema de debug
        this.scene.events.emit(EVENTS.ENTITY_DESTROYED, this);

        // Probabilidad de PowerUp
        if (typeof this.scene.trySpawnPowerUp === 'function') {
            this.scene.trySpawnPowerUp(this.x, this.y);
        }

        // Efecto visual simple (puedes añadir partículas aquí)
        super.die();
    }

    /**
     * Disables the entity without triggering gameplay death events.
     * Used for off-screen cleanup.
     */
    dieSilently() {
        // Notificar al sistema de debug
        this.scene.events.emit(EVENTS.ENTITY_DESTROYED, this);

        this.isDead = true;
        this.setActive(false);
        this.setVisible(false);
        this.body.enable = false;
    }
}
