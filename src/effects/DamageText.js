import { DEPTH } from '../core/Constants.js';

/**
 * @class DamageText
 * @extends Phaser.GameObjects.Text
 * @description Texto flotante que muestra el daño infligido.
 * Se eleva y se desvanece automáticamente.
 */
export default class DamageText extends Phaser.GameObjects.Text {
    /**
     * @param {Phaser.Scene} scene - Escena donde aparece el texto
     * @param {number} x - Posición X
     * @param {number} y - Posición Y
     * @param {number} damage - Cantidad de daño
     * @param {boolean} isCritical - Si fue un golpe crítico
     */
    constructor(scene, x, y, damage, isCritical = false) {
        // Configuración del texto
        const color = isCritical ? '#FFD700' : '#FFFFFF'; // Dorado para crítico, blanco normal
        const fontSize = isCritical ? '24px' : '20px';

        super(scene, x, y, Math.floor(damage).toString(), {
            fontSize: fontSize,
            fontFamily: 'Arial, sans-serif',
            color: color,
            stroke: '#000000',
            strokeThickness: 3,
            fontStyle: 'bold'
        });

        scene.add.existing(this);
        this.setOrigin(0.5, 0.5);
        this.setDepth(DEPTH.UI_EFFECTS);

        // Animación de flotación y desvanecimiento
        this.animate();
    }

    /**
     * Anima el texto para que suba y se desvanezca
     */
    animate() {
        // Pequeña variación en la dirección horizontal
        const offsetX = Phaser.Math.Between(-10, 10);

        this.scene.tweens.add({
            targets: this,
            y: this.y - 50,
            x: this.x + offsetX,
            alpha: 0,
            duration: 800,
            ease: 'Power2',
            onComplete: () => {
                this.destroy();
            }
        });

        // Efecto de escala si es crítico
        if (this.style.fontSize === '24px') {
            this.scene.tweens.add({
                targets: this,
                scale: 1.3,
                duration: 200,
                yoyo: true,
                ease: 'Bounce'
            });
        }
    }
}
