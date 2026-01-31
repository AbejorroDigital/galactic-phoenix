/**
 * @class AudioManager
 * @description Gestión de audio centralizada para Galactic Phoenix.
 * Maneja la música de fondo, los efectos de sonido, las transiciones y el control de volumen.
 * 
 * @example
 * const audioManager = new AudioManager(scene);
 * audioManager.playMusic('bgm_stage1');
 */
export default class AudioManager {
    /**
     * @param {Phaser.Scene} scene - La escena a la que pertenece este gestor.
     */
    constructor(scene) {
        /** @type {Phaser.Scene} */
        this.scene = scene;
        /** @type {Phaser.Sound.BaseSound|null} */
        this.currentMusic = null;
        /** @type {number} */
        this.sfxVolume = 0.7;
        /** @type {number} */
        this.musicVolume = 0.5;
        /** @type {boolean} */
        this.isMuted = false;
    }

    /**
     * Reproduce música de fondo con un efecto de desvanecimiento (fade-in).
     * @param {string} key - Clave del sonido en el caché de Phaser.
     * @param {boolean} [loop=true] - Indica si la música debe repetirse.
     * @param {number} [fadeDuration=1000] - Duración del efecto de desvanecimiento en milisegundos.
     */
    playMusic(key, loop = true, fadeDuration = 1000) {
        // Si ya está sonando esta música, no hacer nada
        if (this.currentMusic && this.currentMusic.key === key && this.currentMusic.isPlaying) {
            return;
        }

        // Fade out de la música actual
        if (this.currentMusic && this.currentMusic.isPlaying) {
            this.scene.tweens.add({
                targets: this.currentMusic,
                volume: 0,
                duration: fadeDuration / 2,
                onComplete: () => {
                    this.currentMusic.stop();
                    this.startNewMusic(key, loop, fadeDuration);
                }
            });
        } else {
            this.startNewMusic(key, loop, fadeDuration);
        }
    }

    /**
     * Inicia una nueva pista de música con un efecto de desvanecimiento.
     * @private
     * @param {string} key - Clave del sonido.
     * @param {boolean} loop - Configuración de repetición.
     * @param {number} fadeDuration - Duración del desvanecimiento en ms.
     */
    startNewMusic(key, loop, fadeDuration) {
        // Verificar que el sonido existe
        if (!this.scene.cache.audio.exists(key)) {
            console.warn(`AudioManager: Audio '${key}' no encontrado en cache`);
            return;
        }

        this.currentMusic = this.scene.sound.add(key, {
            loop: loop,
            volume: 0
        });

        this.currentMusic.play();

        // Fade in
        this.scene.tweens.add({
            targets: this.currentMusic,
            volume: this.isMuted ? 0 : this.musicVolume,
            duration: fadeDuration
        });
    }

    /**
     * Detiene la pista de música actual con un efecto de desvanecimiento (fade-out).
     * @param {number} [fadeDuration=1000] - Duración del efecto de desvanecimiento en milisegundos.
     */
    stopMusic(fadeDuration = 1000) {
        if (this.currentMusic && this.currentMusic.isPlaying) {
            this.scene.tweens.add({
                targets: this.currentMusic,
                volume: 0,
                duration: fadeDuration,
                onComplete: () => {
                    this.currentMusic.stop();
                    this.currentMusic = null;
                }
            });
        }
    }

    /**
     * Reproduce un efecto de sonido (SFX).
     * @param {string} key - Clave del sonido.
     * @param {Phaser.Types.Sound.SoundConfig} [config={}] - Configuración de sonido adicional.
     */
    playSFX(key, config = {}) {
        if (!this.scene.cache.audio.exists(key)) {
            console.warn(`AudioManager: SFX '${key}' no encontrado en cache`);
            return;
        }

        const defaultConfig = {
            volume: this.isMuted ? 0 : this.sfxVolume,
            ...config
        };

        this.scene.sound.play(key, defaultConfig);
    }

    /**
     * Alterna el silencio (mute) para todo el audio gestionado por este gestor.
     * @returns {boolean} El nuevo estado de silencio.
     */
    toggleMute() {
        this.isMuted = !this.isMuted;

        if (this.currentMusic) {
            this.currentMusic.setVolume(this.isMuted ? 0 : this.musicVolume);
        }

        return this.isMuted;
    }

    /**
     * Establece el volumen para la música de fondo.
     * @param {number} volume - Valor de volumen entre 0.0 y 1.0.
     */
    setMusicVolume(volume) {
        this.musicVolume = Phaser.Math.Clamp(volume, 0, 1);
        if (this.currentMusic) {
            this.currentMusic.setVolume(this.isMuted ? 0 : this.musicVolume);
        }
    }

    /**
     * Establece el volumen para los efectos de sonido.
     * @param {number} volume - Valor de volumen entre 0.0 y 1.0.
     */
    setSFXVolume(volume) {
        this.sfxVolume = Phaser.Math.Clamp(volume, 0, 1);
    }

    /**
     * Detiene la música actual y realiza la limpieza.
     */
    destroy() {
        if (this.currentMusic) {
            this.currentMusic.stop();
            this.currentMusic = null;
        }
    }
}
