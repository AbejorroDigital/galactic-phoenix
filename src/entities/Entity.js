import DamageSystem from '../core/DamageSystem.js';

/**
 * @class Entity
 * @extends Phaser.Physics.Arcade.Sprite
 * @description Clase base para todos los objetos interactivos del juego con salud, físicas y manejo de daño.
 * Proporciona procesamiento de daño unificado y retroalimentación visual (parpadeos/texto flotante).
 * 
 * @example
 * class TanqueEnemigo extends Entity {
 *     constructor(scene, d, y) {
 *         super(scene, x, y, 'tanque_sprite');
 *         this.hp = 500;
 *     }
 * }
 */
export default class Entity extends Phaser.Physics.Arcade.Sprite {
    /**
     * @param {Phaser.Scene} scene - La escena a la que pertenece esta entidad.
     * @param {number} x - Posición horizontal.
     * @param {number} y - Posición vertical.
     * @param {string} texture - Clave del sprite en el caché.
     */
    constructor(scene, x, y, texture) {
        super(scene, x, y, texture);

        /** @type {number} */
        this.hp = 100;
        /** @type {number} */
        this.maxHp = 100;
        /** @type {Object.<string, number>} */
        this.resistances = {};
        /** @type {boolean} */
        this.isDead = false;

        // Añadir a la escena y habilitar físicas inmediatamente
        scene.add.existing(this);
        scene.physics.add.existing(this);
    }

    /**
     * Procesa el daño entrante a través del DamageSystem.
     * Aplica resistencias, actualiza el HP y activa la retroalimentación visual.
     * @param {Object} projectileStats - Estadísticas de la fuente de daño.
     * @param {number} projectileStats.damage - Cantidad de daño base.
     * @param {string} [projectileStats.type='physical'] - Tipo de daño para los cálculos de resistencia.
     */
    takeDamage(projectileStats) {
        if (this.isDead || !this.active) return;

        // Verificamos que DamageSystem y su método existan para evitar crashes
        const stats = projectileStats || { damage: 0, type: 'physical' };
        const damageAmount = stats.damage || 0;
        const damageType = stats.type || 'physical';

        const result = DamageSystem.calculateDamage(
            damageAmount,
            damageType,
            this.resistances || {},
            0
        );

        this.hp = Math.max(0, this.hp - (result.amount || 0));

        // Feedback visual de daño (Flash blanco)
        this.setTint(0xffffff);
        if (this.scene.time.addEvent) {
            this.scene.time.addEvent({
                delay: 100,
                callback: () => {
                    if (this.active) this.clearTint();
                },
                callbackScope: this
            });
        } else {
            this.scene.time.delayedCall(100, () => {
                if (this.active) this.clearTint();
            });
        }

        // Mostrar texto de daño
        this.showDamageText(result.amount, result.isCritical);

        if (this.hp <= 0) {
            this.die();
        }
    }

    /**
     * Crea y anima texto de daño flotante.
     * @param {number} amount - Cantidad de daño a mostrar.
     * @param {boolean} isCrit - Indica si el daño fue un golpe crítico.
     */
    showDamageText(amount, isCrit) {
        const color = isCrit ? '#ff0000' : '#ffffff';
        const text = this.scene.add.text(this.x, this.y - 20, `-${amount}`, {
            fontSize: isCrit ? '18px' : '14px',
            fontFamily: 'ZenDots',
            color: color,
            stroke: '#000',
            strokeThickness: 3
        }).setOrigin(0.5);

        this.scene.tweens.add({
            targets: text,
            y: text.y - 40,
            alpha: 0,
            duration: 800,
            ease: 'Power1',
            onComplete: () => text.destroy()
        });
    }

    /**
     * Desactiva la entidad, ocultándola y desactivando su cuerpo físico.
     * Diseñado para ser sobrescrito por subclases para lógica de muerte específica.
     */
    die() {
        if (this.isDead) return;
        this.isDead = true;

        // Desactivar físicas y visuales
        if (this.body) this.body.enable = false;
        this.setActive(false);
        this.setVisible(false);
    }

    /**
     * Establece si la entidad está activa o no.
     * @param {boolean} val - Nuevo estado activo.
     * @returns {this}
     */
    setActive(val) {
        super.setActive(val);
        return this;
    }
}
