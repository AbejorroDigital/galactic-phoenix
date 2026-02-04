import DamageSystem from '../core/DamageSystem.js';

/**
 * @class Entity
 * @description Clase base con gestión de salud y sistema de daño unificado.
 */
export default class Entity extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, texture) {
        super(scene, x, y, texture);
        this.hp = 100;
        this.maxHp = 100;
        this.resistances = {};
        this.isDead = false;

        scene.add.existing(this);
        scene.physics.add.existing(this);
    }

    /**
     * Procesa el daño y activa feedback visual.
     */
    takeDamage(projectileStats) {
        if (this.isDead || !this.active) return;

        const stats = projectileStats || { damage: 0, type: 'physical' };
        const result = DamageSystem.calculateDamage(
            stats.damage || 0,
            stats.type || 'physical',
            this.resistances || {},
            0
        );

        this.hp = Math.max(0, this.hp - result.amount);

        // Feedback visual universal (Flash)
        this.flashEntity();

        // Mostrar texto flotante
        this.showDamageText(result.amount, result.isCritical);

        if (this.hp <= 0) this.die();
    }

    /**
     * Crea un parpadeo rápido sin saturar el sistema de eventos.
     */
    flashEntity() {
        this.setTint(0xffffff);
        this.scene.time.delayedCall(80, () => {
            if (this.active) this.clearTint();
        });
    }

    showDamageText(amount, isCrit) {
        const text = this.scene.add.text(this.x, this.y - 20, `-${amount}`, {
            fontSize: isCrit ? '20px' : '14px',
            fontFamily: 'monospace', // Cambiado a monospace por seguridad si ZenDots falla
            fill: isCrit ? '#ff4444' : '#ffffff',
            stroke: '#000',
            strokeThickness: 2
        }).setOrigin(0.5);

        this.scene.tweens.add({
            targets: text,
            y: text.y - 50,
            alpha: 0,
            duration: 600,
            onComplete: () => text.destroy()
        });
    }

    die() {
        if (this.isDead) return;
        this.isDead = true;
        if (this.body) this.body.enable = false;
        this.setActive(false);
        this.setVisible(false);
    }
}
