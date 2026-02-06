import { SCENES } from '../core/Constants.js';

/**
 * @class PauseScene
 * @extends Phaser.Scene
 * @description Proporciona una superposición de pausa durante el juego.
 * Permite al usuario reanudar, ajustar opciones o salir al menú principal.
 */
export default class PauseScene extends Phaser.Scene {
    constructor() {
        super(SCENES.PAUSE);
    }

    /**
     * Método del ciclo de vida de Phaser. Renderiza la interfaz de usuario del menú de pausa.
     */
    create() {
        // ...
        // Fondo oscuro semi-transparente
        const overlay = this.add.rectangle(400, 300, 800, 600, 0x000000, 0.7);

        // Fondo del panel de pausa
        const panel = this.add.rectangle(400, 300, 500, 400, 0x001133, 0.95);
        panel.setStrokeStyle(4, 0x00ffff);

        // Título
        const title = this.add.text(400, 150, 'PAUSA', {
            fontSize: '48px',
            fontFamily: 'ZenDots',
            color: '#00ffff',
            stroke: '#000000',
            strokeThickness: 8
        });
        title.setOrigin(0.5);

        // Botones
        this.createButton(400, 260, 'CONTINUAR', () => this.resumeGame());
        this.createButton(400, 330, 'OPCIONES', () => this.showOptions());
        this.createButton(400, 400, 'SALIR AL MENÚ', () => this.quitToMenu());

        // Texto de ayuda (hint)
        const hint = this.add.text(400, 470, 'Presiona ESC para continuar', {
            fontSize: '14px',
            fontFamily: 'ZenDots',
            color: '#888888',
            style: 'italic'
        });
        hint.setOrigin(0.5);

        // Tecla ESC para reanudar (uso on con chequeo de actividad para evitar conflictos con Options)
        this.input.keyboard.on('keydown-ESC', () => {
            if (this.scene.isActive(SCENES.PAUSE)) {
                this.resumeGame();
            }
        });
    }

    /**
     * Ayudante para crear botones interactivos del menú de pausa.
     * @param {number} x - Coordenada horizontal.
     * @param {number} y - Coordenada vertical.
     * @param {string} text - Etiqueta.
     * @param {Function} callback - Manejador de clic.
     * @returns {Phaser.GameObjects.Container} El contenedor del botón.
     */
    createButton(x, y, text, callback) {
        // ...
        const button = this.add.container(x, y);

        const bg = this.add.rectangle(0, 0, 300, 50, 0x003366, 0.9);
        bg.setStrokeStyle(2, 0x00ffff);

        const label = this.add.text(0, 0, text, {
            fontSize: '18px',
            fontFamily: 'ZenDots',
            color: '#ffffff'
        });
        label.setOrigin(0.5);

        button.add([bg, label]);
        button.setSize(300, 50);
        button.setInteractive({ useHandCursor: true });

        button.on('pointerover', () => {
            bg.setFillStyle(0x0055aa, 1);
            bg.setStrokeStyle(3, 0x00ffff);
            label.setScale(1.05);
        });

        button.on('pointerout', () => {
            bg.setFillStyle(0x003366, 0.9);
            bg.setStrokeStyle(2, 0x00ffff);
            label.setScale(1);
        });

        button.on('pointerup', () => {
            callback();
        });

        return button;
    }

    /**
     * Vuelve a la GameScene y reanuda las físicas y temporizadores.
     */
    resumeGame() {
        this.scene.stop();
        this.scene.resume(SCENES.GAME);
    }

    /**
     * Launches the Options overlay.
     */
    showOptions() {
        this.scene.launch(SCENES.OPTIONS, { parent: SCENES.PAUSE });
        this.scene.pause();
    }

    /**
     * Stops all active gameplay scenes and transitions to the MenuScene.
     */
    quitToMenu() {
        // Safe Audio Shutdown
        const gameScene = this.scene.get(SCENES.GAME);
        if (gameScene && gameScene.audioManager) {
            gameScene.audioManager.stopMusic(200);
        }

        // Stop game scene
        this.scene.stop(SCENES.GAME);
        this.scene.stop(SCENES.UI);
        this.scene.stop(); // Stop self

        // Start menu
        this.scene.start(SCENES.MENU);
    }
}
