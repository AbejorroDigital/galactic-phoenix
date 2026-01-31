
/**
 * @class SettingsManager
 * @description Centralizes game settings like volume and graphics quality.
 * Persists settings in the Phaser Registry and handles application.
 */
export default class SettingsManager {
    /**
     * @param {Phaser.Game} game - The game instance.
     */
    constructor(game) {
        this.game = game;
        this.registry = game.registry;

        // Initialize defaults if not present
        if (!this.registry.has('musicVolume')) this.registry.set('musicVolume', 0.5);
        if (!this.registry.has('sfxVolume')) this.registry.set('sfxVolume', 0.7);
        if (!this.registry.has('graphicsQuality')) this.registry.set('graphicsQuality', 1); // 0=LOW, 1=MED, 2=HIGH
    }

    /**
     * Applies settings to the entire game.
     */
    applySettings() {
        const musicVolume = this.registry.get('musicVolume');
        const sfxVolume = this.registry.get('sfxVolume');
        const quality = this.registry.get('graphicsQuality');

        // Apply music volume to all active music sounds
        this.game.sound.sounds.forEach(sound => {
            if (sound.key.includes('music')) {
                sound.setVolume(musicVolume);
            }
        });

        // Notify scenes about graphics quality change
        this.game.events.emit('settings-changed', {
            musicVolume,
            sfxVolume,
            graphicsQuality: quality
        });
    }

    setMusicVolume(value) {
        this.registry.set('musicVolume', value);
        this.applySettings();
    }

    setSfxVolume(value) {
        this.registry.set('sfxVolume', value);
        this.applySettings();
    }

    setGraphicsQuality(value) {
        this.registry.set('graphicsQuality', value);
        this.applySettings();
    }

    getGraphicsQualityName() {
        const quality = this.registry.get('graphicsQuality');
        switch (quality) {
            case 0: return 'BAJA';
            case 1: return 'MEDIA';
            case 2: return 'ALTA';
            default: return 'MEDIA';
        }
    }
}
