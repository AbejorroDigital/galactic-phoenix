import { SCENES } from '../core/Constants.js';

/**
 * @class MenuScene
 * @extends Phaser.Scene
 * @description Pantalla de inicio de Galactic Phoenix.
 * Presenta el título, botones interactivos de navegación y música introductoria.
 * 
 * @example
 * // Transición desde BootScene
 * this.scene.start(SCENES.MENU);
 */
export default class MenuScene extends Phaser.Scene {
    constructor() {
        super(SCENES.MENU);
        /** @type {Phaser.Sound.BaseSound|null} */
        this.introMusic = null;
    }

    /**
     * Inicializa la interfaz del menú, el título y los botones.
     */
    create() {
        // ...
        // Background
        const bg = this.add.image(400, 300, 'bg_intro');
        bg.setDisplaySize(800, 600);

        // Start intro music
        if (!this.sound.get('intro_music')) {
            const volume = this.registry.get('musicVolume') || 0.5;
            this.introMusic = this.sound.add('intro_music', { loop: true, volume: volume });
            this.introMusic.play();
        }

        // Title
        const title = this.add.text(400, 150, 'GALACTIC PHOENIX', {
            fontSize: '44px',
            fontFamily: 'ZenDots',
            color: '#00ffff',
            stroke: '#000000',
            strokeThickness: 8,
            shadow: {
                offsetX: 3,
                offsetY: 3,
                color: '#000',
                blur: 5,
                fill: true
            }
        });
        title.setOrigin(0.5);

        // Subtitle
        const subtitle = this.add.text(400, 230, 'Space Combat Shooter', {
            fontSize: '18px',
            fontFamily: 'ZenDots',
            color: '#ffffff',
            style: 'italic'
        });
        subtitle.setOrigin(0.5);

        // Buttons
        this.createButton(400, 320, 'INICIO', () => this.startGame());
        this.createButton(400, 390, 'CONTROLES', () => this.showControls());
        this.createButton(400, 460, 'OPCIONES', () => this.showOptions());

        // Version
        this.add.text(10, 580, 'v1.0', {
            fontSize: '12px',
            fontFamily: 'ZenDots',
            color: '#888888'
        });

        // Flashing "Press to Start" text
        const pressStart = this.add.text(400, 540, 'Presiona ESPACIO para comenzar', {
            fontSize: '16px',
            fontFamily: 'ZenDots',
            color: '#ffff00'
        });
        pressStart.setOrigin(0.5);

        this.tweens.add({
            targets: pressStart,
            alpha: 0.3,
            duration: 800,
            yoyo: true,
            repeat: -1
        });

        // Space key shortcut
        this.input.keyboard.once('keydown-SPACE', () => {
            this.startGame();
        });
    }

    /**
     * Método auxiliar para crear botones estilizados interactivos.
     * @param {number} x - Coordenada horizontal.
     * @param {number} y - Coordenada vertical.
     * @param {string} text - Etiqueta del botón.
     * @param {Function} callback - Función a ejecutar al hacer clic.
     * @returns {Phaser.GameObjects.Container} El contenedor del botón.
     */
    createButton(x, y, text, callback) {
        const button = this.add.container(x, y);

        // Button background
        const bg = this.add.rectangle(0, 0, 300, 50, 0x003366, 0.8);
        bg.setStrokeStyle(2, 0x00ffff);

        // Button text
        const label = this.add.text(0, 0, text, {
            fontSize: '20px',
            fontFamily: 'ZenDots',
            color: '#ffffff'
        });
        label.setOrigin(0.5);

        button.add([bg, label]);
        button.setSize(300, 50);
        button.setInteractive({ useHandCursor: true });

        // Hover effects
        button.on('pointerover', () => {
            bg.setFillStyle(0x0055aa, 1);
            bg.setStrokeStyle(3, 0x00ffff);
            label.setScale(1.1);
        });

        button.on('pointerout', () => {
            bg.setFillStyle(0x003366, 0.8);
            bg.setStrokeStyle(2, 0x00ffff);
            label.setScale(1);
        });

        button.on('pointerdown', () => {
            bg.setFillStyle(0x002244, 1);
        });

        button.on('pointerup', () => {
            bg.setFillStyle(0x0055aa, 1);
            callback();
        });

        return button;
    }

    /**
     * Maneja las transiciones a la GameScene.
     */
    startGame() {
        // Stop intro music
        if (this.introMusic) {
            this.introMusic.stop();
        }

        // Fade out and start game
        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start(SCENES.GAME, { levelKey: 'level_1' });
        });
    }

    /**
     * Cambia a la superposición de Controles.
     */
    showControls() {
        this.scene.launch(SCENES.CONTROLS);
        this.scene.pause();
    }

    /**
     * Cambia a la superposición de Opciones.
     */
    showOptions() {
        this.scene.launch(SCENES.OPTIONS, { parent: SCENES.MENU });
        this.scene.pause();
    }
}
