import { SCENES } from '../core/Constants.js';

/**
 * @class OptionsScene
 * @extends Phaser.Scene
 * @description Una escena superpuesta para gestionar la configuración del juego, como el volumen de la música y los efectos de sonido.
 * Persiste la configuración a través del Registro de Phaser.
 */
export default class OptionsScene extends Phaser.Scene {
    constructor() {
        super(SCENES.OPTIONS);
    }

    /**
     * Inicializa la escena con datos pasados.
     * @param {Object} data - Datos pasados desde la escena anterior.
     * @param {string} data.parent - El nombre de la escena que lanzó las opciones.
     */
    init(data) {
        this.parentScene = data && data.parent ? data.parent : SCENES.MENU;
    }

    /**
     * Método del ciclo de vida de Phaser. Renderiza los controles deslizantes de volumen y botones interactivos.
     */
    create() {
        this.scene.bringToTop();
        // ...
        // Fondo semi-transparente
        const overlay = this.add.rectangle(400, 300, 800, 600, 0x000000, 0.8);

        // Título
        const title = this.add.text(400, 80, 'OPCIONES', {
            fontSize: '42px',
            fontFamily: 'ZenDots',
            color: '#00ffff',
            stroke: '#000000',
            strokeThickness: 6
        });
        title.setOrigin(0.5);

        if (typeof window !== 'undefined' && window.DEBUG_LOGGER) {
            window.DEBUG_LOGGER.log('scene', 'OptionsScene created successfully');
        }

        try {
            /** @type {number} */
            this.musicVolume = this.registry.get('musicVolume');
            if (this.musicVolume === undefined) this.musicVolume = 0.5;

            /** @type {number} */
            this.sfxVolume = this.registry.get('sfxVolume');
            if (this.sfxVolume === undefined) this.sfxVolume = 0.7;

            // Volumen de Música
            this.createVolumeControl(200, 'MÚSICA', this.musicVolume, (value) => {
                this.musicVolume = value;
                this.registry.set('musicVolume', value);
                if (this.sound && this.sound.sounds) {
                    this.sound.sounds.forEach(sound => {
                        if (sound.key.includes('music')) {
                            sound.setVolume(value);
                        }
                    });
                }
            });

            // Volumen de Efectos de Sonido (SFX)
            this.createVolumeControl(320, 'EFECTOS', this.sfxVolume, (value) => {
                this.sfxVolume = value;
                this.registry.set('sfxVolume', value);
            });

            // Calidad Gráfica - SOLO si el gestor existe
            if (this.game.settings) {
                this.createQualityControl(380);
                this.createTestButton(480);
            } else {
                if (typeof window !== 'undefined' && window.DEBUG_LOGGER) {
                    window.DEBUG_LOGGER.log('error', 'SettingsManager not found in OptionsScene');
                }
            }

            // Botón de volver
            this.createBackButton();
        } catch (err) {
            if (typeof window !== 'undefined' && window.DEBUG_LOGGER) {
                window.DEBUG_LOGGER.logCriticalError('OptionsScene.create()', err);
            }
        }
    }

    /**
     * Ayudante para crear un control de volumen basado en un control deslizante.
     * @param {number} y - Posición vertical.
     * @param {string} label - Etiqueta de visualización.
     * @param {number} initialValue - Valor inicial (0 a 1).
     * @param {Function} onChange - Callback activado cuando el control deslizante se mueve.
     */
    createVolumeControl(y, label, initialValue, onChange) {
        // ...
        // Etiqueta
        const labelText = this.add.text(200, y, label, {
            fontSize: '18px',
            fontFamily: 'ZenDots',
            color: '#ffffff'
        });
        labelText.setOrigin(0, 0.5);

        // Fondo del control deslizante
        const sliderBg = this.add.rectangle(500, y, 300, 10, 0x444444);

        // Relleno del control deslizante
        const sliderFill = this.add.rectangle(350, y, 300 * initialValue, 10, 0x00ff00);
        sliderFill.setOrigin(0, 0.5);

        // Tirador del control deslizante
        const handle = this.add.circle(350 + (300 * initialValue), y, 15, 0xffffff);
        handle.setStrokeStyle(3, 0x00ffff);
        handle.setInteractive({ useHandCursor: true, draggable: true });

        // Texto del valor
        const valueText = this.add.text(680, y, `${Math.round(initialValue * 100)}%`, {
            fontSize: '16px',
            fontFamily: 'ZenDots',
            color: '#cccccc'
        });
        valueText.setOrigin(0, 0.5);

        // Manejador de arrastre
        this.input.on('drag', (pointer, gameObject, dragX) => {
            if (gameObject !== handle) return;

            // Limitar a los límites del control deslizante
            const clampedX = Phaser.Math.Clamp(dragX, 350, 650);
            handle.x = clampedX;

            // Actualizar relleno
            const fillWidth = clampedX - 350;
            sliderFill.width = fillWidth;

            // Calcular valor
            const value = (clampedX - 350) / 300;
            valueText.setText(`${Math.round(value * 100)}%`);

            // Callback
            onChange(value);
        });
    }

    /**
     * Crea un control de calidad gráfica.
     * @param {number} y - Posición vertical.
     */
    createQualityControl(y) {
        const label = this.add.text(200, y, 'CALIDAD', {
            fontSize: '18px',
            fontFamily: 'ZenDots',
            color: '#ffffff'
        });
        label.setOrigin(0, 0.5);

        const qualityName = this.game.settings.getGraphicsQualityName();
        const valueText = this.add.text(500, y, qualityName, {
            fontSize: '18px',
            fontFamily: 'ZenDots',
            color: '#00ffff'
        });
        valueText.setOrigin(0.5);

        const btnLeft = this.add.text(420, y, '<', { fontSize: '32px', color: '#ffffff' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        const btnRight = this.add.text(580, y, '>', { fontSize: '32px', color: '#ffffff' }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        const updateQuality = (delta) => {
            let current = this.registry.get('graphicsQuality');
            current = Phaser.Math.Clamp(current + delta, 0, 2);
            this.game.settings.setGraphicsQuality(current);
            valueText.setText(this.game.settings.getGraphicsQualityName());
        };

        btnLeft.on('pointerdown', () => updateQuality(-1));
        btnRight.on('pointerdown', () => updateQuality(1));
    }

    /**
     * Crea un botón para probar el volumen de los efectos de sonido (SFX).
     * @param {number} y - Posición vertical.
     */
    createTestButton(y) {
        const button = this.add.container(400, y);

        const bg = this.add.rectangle(0, 0, 250, 45, 0x444444, 0.9);
        bg.setStrokeStyle(2, 0xffffff);

        const label = this.add.text(0, 0, 'PROBAR SONIDO', {
            fontSize: '14px',
            fontFamily: 'ZenDots',
            color: '#ffffff'
        });
        label.setOrigin(0.5);

        button.add([bg, label]);
        button.setSize(250, 45);
        button.setInteractive({ useHandCursor: true });

        button.on('pointerover', () => {
            bg.setFillStyle(0x666666, 1);
        });

        button.on('pointerout', () => {
            bg.setFillStyle(0x444444, 0.9);
        });

        button.on('pointerup', () => {
            this.sound.play('sfx_shot', { volume: this.sfxVolume });
        });
    }

    /**
     * Crea un botón para volver a la escena anterior.
     */
    createBackButton() {
        const button = this.add.container(400, 540);

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
            this.goBack();
        });

        // Use a standard ESC key listener that checks scene status
        this.input.keyboard.on('keydown-ESC', () => {
            if (this.scene.isActive(SCENES.OPTIONS)) {
                this.goBack();
            }
        });
    }

    /**
     * Returns to the parent scene safely.
     */
    goBack() {
        if (typeof window !== 'undefined' && window.DEBUG_LOGGER) {
            window.DEBUG_LOGGER.log('scene', 'OptionsScene: Attempting to return to parent', { parent: this.parentScene });
        }

        if (this.scene.get(this.parentScene)) {
            if (typeof window !== 'undefined' && window.DEBUG_LOGGER) {
                window.DEBUG_LOGGER.log('scene', `Resuming parent scene: ${this.parentScene}`);
            }
            this.scene.resume(this.parentScene);
        } else {
            if (typeof window !== 'undefined' && window.DEBUG_LOGGER) {
                window.DEBUG_LOGGER.log('error', `Parent scene not found: ${this.parentScene}`);
            }
        }

        // Stop the current scene
        this.scene.stop();
    }
}
