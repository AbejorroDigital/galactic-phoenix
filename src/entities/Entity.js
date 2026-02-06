import DamageSystem from '../core/DamageSystem.js';

/**
 * @class Entity
 * @extends Phaser.Physics.Arcade.Sprite
 * @description Clase base con soporte mejorado para sincronización de hitboxes y físicas.
 */
export default class Entity extends Phaser.Physics.Arcade.Sprite {
    /**
     * @param {Phaser.Scene} scene - La escena a la que pertenece esta entidad.
     * @param {number} x - Posición horizontal.
     * @param {number} y - Posición vertical.
     * @param {string} texture - Clave del sprite inicial.
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
     * Sincroniza el cuerpo físico con las dimensiones visuales actuales.
     * Es fundamental llamar a este método después de setTexture() o setScale().
     * @param {number} [widthPct=1] - Multiplicador de ancho (0 a 1) para ajustar la precisión.
     * @param {number} [heightPct=1] - Multiplicador de alto (0 a 1).
     */
    refreshHitbox(widthPct = 1, heightPct = 1) {
        if (!this.body) return;

        // Forzamos al cuerpo físico a tomar el tamaño del frame actual escalado
        this.body.setSize(this.width * widthPct, this.height * heightPct);

        // Opcional: Centrar la hitbox si se redujo el porcentaje
        if (widthPct < 1 || heightPct < 1) {
            const offsetX = (this.width - (this.width * widthPct)) / 2;
            const offsetY = (this.height - (this.height * heightPct)) / 2;
            this.body.setOffset(offsetX, offsetY);
        } else {
            this.body.setOffset(0, 0);
        }
    }

    /**
     * Procesa el daño entrante y activa feedback visual.
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

        this.hp = Math.max(0, this.hp - (result.amount || 0));

        // Feedback visual: Flash blanco
        this.setTint(0xffffff);
        this.scene.time.delayedCall(100, () => {
            if (this.active) this.clearTint();
        });

        // Evento para UI y efectos
        this.scene.events.emit('damage-dealt', {
            x: this.x,
            y: this.y,
            amount: result.amount,
            isCritical: result.isCritical || false,
            targetType: this.constructor.name
        });

        if (this.hp <= 0) {
            this.die();
        }
    }

    die() {
        if (this.isDead) return;
        this.isDead = true;
        if (this.body) this.body.enable = false;
        this.setActive(false);
        this.setVisible(false);
    }
}