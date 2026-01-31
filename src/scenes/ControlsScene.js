import { SCENES } from '../core/Constants.js';

/**
 * @class ControlsScene
 * @extends Phaser.Scene
 * @description Una escena superpuesta que muestra los controles del juego y consejos al jugador.
 */
export default class ControlsScene extends Phaser.Scene {
    constructor() {
        super(SCENES.CONTROLS);
    }

    /**
     * Método del ciclo de vida de Phaser. Renderiza la información de los controles y el botón de volver.
     */
    create() {
        // ...
        // Fondo semi-transparente
        const overlay = this.add.rectangle(400, 300, 800, 600, 0x000000, 0.85);

        // Título
        const title = this.add.text(400, 80, 'CONTROLES', {
            fontSize: '42px',
            fontFamily: 'ZenDots',
            color: '#00ffff',
            stroke: '#000000',
            strokeThickness: 6
        });
        title.setOrigin(0.5);

        // Información de controles
        const controls = [
            { key: '← → ↑ ↓', action: 'Mover nave' },
            { key: 'ESPACIO', action: 'Disparar' },
            { key: 'ESC', action: 'Pausar juego' }
        ];

        let yPos = 180;
        controls.forEach(control => {
            // Caja de tecla
            const keyBox = this.add.rectangle(250, yPos, 180, 50, 0x003366);
            keyBox.setStrokeStyle(2, 0x00ffff);

            const keyText = this.add.text(250, yPos, control.key, {
                fontSize: '18px',
                fontFamily: 'ZenDots',
                color: '#ffffff'
            });
            keyText.setOrigin(0.5);

            // Texto de acción
            const actionText = this.add.text(380, yPos, control.action, {
                fontSize: '16px',
                fontFamily: 'ZenDots',
                color: '#cccccc'
            });
            actionText.setOrigin(0, 0.5);

            yPos += 80;
        });

        // Consejos
        const tipsTitle = this.add.text(400, 420, 'CONSEJOS:', {
            fontSize: '22px',
            fontFamily: 'ZenDots',
            color: '#ffff00'
        });
        tipsTitle.setOrigin(0.5);

        const tips = [
            '• Destruye enemigos para obtener powerups',
            '• La suerte aumenta la probabilidad de drops',
            '• Evita colisiones directas con enemigos'
        ];

        yPos = 470;
        tips.forEach(tip => {
            const tipText = this.add.text(400, yPos, tip, {
                fontSize: '14px',
                fontFamily: 'ZenDots',
                color: '#aaaaaa'
            });
            tipText.setOrigin(0.5);
            yPos += 30;
        });

        // Botón de volver
        this.createBackButton();
    }

    /**
     * Crea un botón interactivo para volver a MenuScene.
     */
    createBackButton() {
        const button = this.add.container(400, 560);

        const bg = this.add.rectangle(0, 0, 200, 40, 0x336600, 0.9);
        bg.setStrokeStyle(2, 0x00ff00);

        const label = this.add.text(0, 0, 'VOLVER', {
            fontSize: '18px',
            fontFamily: 'ZenDots',
            color: '#ffffff'
        });
        label.setOrigin(0.5);

        button.add([bg, label]);
        button.setSize(200, 40);
        button.setInteractive({ useHandCursor: true });

        button.on('pointerover', () => {
            bg.setFillStyle(0x55aa00, 1);
            label.setScale(1.1);
        });

        button.on('pointerout', () => {
            bg.setFillStyle(0x336600, 0.9);
            label.setScale(1);
        });

        button.on('pointerup', () => {
            this.scene.stop();
            this.scene.resume(SCENES.MENU);
        });

        // ESC key to go back
        this.input.keyboard.once('keydown-ESC', () => {
            this.scene.stop();
            this.scene.resume(SCENES.MENU);
        });
    }
}
