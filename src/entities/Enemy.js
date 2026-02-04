import { EVENTS } from '../core/Constants.js';
import Entity from './Entity.js';

/**
 * @class Enemy
 * @description Enemigos que usan el pool y disparan eventos de destrucción.
 */
export default class Enemy extends Entity {
    constructor(scene) {
        super(scene, 0, 0, 'enemy1');
        this.fx = scene.fx;
        this.fireTimer = 0;
    }

    spawn(y, config) {
        this.setPosition(this.scene.scale.width + 50, y);
        this.setTexture(config.sprite || 'enemy1');
        this.hp = config.hp || 20;
        this.maxHp = this.hp;
        this.movementType = config.pattern || 'linear';
        this.speed = config.speed || 150;
        
        this.isDead = false;
        this.setActive(true);
        this.setVisible(true);
        if (this.body) {
            this.body.enable = true;
            this.body.setVelocityX(-this.speed);
        }

        this.setScale(0);
        this.scene.tweens.add({
            targets: this,
            scale: config.visual_scale || 1,
            duration: 300,
            ease: 'Back.out'
        });
    }

    update(time) {
        if (!this.active || this.isDead) return;

        // Patrones de movimiento simplificados
        if (this.movementType === 'sine_wave') {
            this.body.setVelocityY(Math.sin(time * 0.003) * 100);
        }

        // Auto-destrucción fuera de pantalla
        if (this.x < -100) this.dieSilently();
    }

    takeDamage(stats) {
        if (this.isDead) return;
        super.takeDamage(stats);

        // Feedback del motor FX global
        if (this.fx) {
            this.fx.sparks(this.x, this.y);
            if (this.hp < this.maxHp * 0.3) this.fx.debris(this.x, this.y);
        }
    }

    die() {
        if (this.isDead) return;
        this.isDead = true;

        // Notificar destrucción para puntos y efectos visuales
        this.scene.events.emit(EVENTS.SCORE_CHANGE, 100);
        this.scene.events.emit(EVENTS.ENEMY_DESTROYED, this.x, this.y, false);

        if (this.fx) this.fx.debris(this.x, this.y);

        // Llamar a la probabilidad de powerup en GameScene
        if (this.scene.trySpawnPowerUp) {
            this.scene.trySpawnPowerUp(this.x, this.y);
        }

        this.body.enable = false;
        this.scene.tweens.add({
            targets: this,
            scale: 1.5,
            alpha: 0,
            duration: 200,
            onComplete: () => super.die()
        });
    }

    dieSilently() {
        this.isDead = true;
        this.setActive(false);
        this.setVisible(false);
        if (this.body) this.body.enable = false;
    }
}
