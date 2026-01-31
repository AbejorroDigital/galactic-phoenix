
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SettingsManager from '../src/core/SettingsManager.js';
import '../test/setup.js';

describe('Settings Management Tests', () => {
    let mockGame;
    let settingsManager;

    beforeEach(() => {
        const registryMap = new Map();
        mockGame = {
            registry: {
                has: (k) => registryMap.has(k),
                set: (k, v) => registryMap.set(k, v),
                get: (k) => registryMap.get(k)
            },
            sound: {
                sounds: [
                    { key: 'intro_music', setVolume: vi.fn() },
                    { key: 'sfx_shot', setVolume: vi.fn() }
                ]
            },
            events: {
                emit: vi.fn()
            }
        };

        settingsManager = new SettingsManager(mockGame);
    });

    describe('Initialization', () => {
        it('should initialize with default values', () => {
            expect(mockGame.registry.get('musicVolume')).toBe(0.5);
            expect(mockGame.registry.get('sfxVolume')).toBe(0.7);
            expect(mockGame.registry.get('graphicsQuality')).toBe(1);
        });
    });

    describe('Settings Application', () => {
        it('should apply music volume only to music sounds', () => {
            settingsManager.setMusicVolume(0.2);

            const introMusic = mockGame.sound.sounds.find(s => s.key === 'intro_music');
            const sfxShot = mockGame.sound.sounds.find(s => s.key === 'sfx_shot');

            expect(introMusic.setVolume).toHaveBeenCalledWith(0.2);
            expect(sfxShot.setVolume).not.toHaveBeenCalled();
        });

        it('should emit settings-changed event', () => {
            settingsManager.setGraphicsQuality(2);
            expect(mockGame.events.emit).toHaveBeenCalledWith('settings-changed', expect.objectContaining({
                graphicsQuality: 2
            }));
        });
    });

    describe('Graphics Quality Titles', () => {
        it('should return correct names for quality levels', () => {
            settingsManager.setGraphicsQuality(0);
            expect(settingsManager.getGraphicsQualityName()).toBe('BAJA');

            settingsManager.setGraphicsQuality(1);
            expect(settingsManager.getGraphicsQualityName()).toBe('MEDIA');

            settingsManager.setGraphicsQuality(2);
            expect(settingsManager.getGraphicsQualityName()).toBe('ALTA');
        });
    });
});

describe('Scene Transition Robustness', () => {
    it('should resume parent scene before stopping', async () => {
        const OptionsScene = (await import('../src/scenes/OptionsScene.js')).default;
        const scene = new OptionsScene();

        // Mock scene properties
        scene.scene = { stop: vi.fn(), resume: vi.fn(), bringToTop: vi.fn(), get: vi.fn().mockReturnValue(true) };
        scene.parentScene = 'PauseScene';

        scene.goBack();

        expect(scene.scene.resume).toHaveBeenCalledWith('PauseScene');
        expect(scene.scene.stop).toHaveBeenCalled();
    });
});
