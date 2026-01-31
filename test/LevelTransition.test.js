
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SCENES } from '../src/core/Constants.js';
import GameScene from '../src/scenes/GameScene.js';
import '../test/setup.js';

describe('GameScene.js Level transitions', () => {
    let mockScene;

    beforeEach(() => {
        mockScene = new GameScene();

        // Mock required systems
        mockScene.cache = {
            json: {
                get: vi.fn((key) => {
                    if (key === 'levels') return {
                        level_1: { music: 'm1' },
                        level_2: { music: 'm2' }
                    };
                    if (key === 'player') return { player: { spawn_position: { x: 100, y: 300 } } };
                    return {};
                })
            }
        };

        mockScene.scene = {
            start: vi.fn(),
            stop: vi.fn(),
            restart: vi.fn(),
            isActive: vi.fn(() => false),
            launch: vi.fn()
        };

        mockScene.audioManager = {
            destroy: vi.fn(),
            playMusic: vi.fn()
        };

        mockScene.add = {
            image: vi.fn().mockReturnThis(),
            tileSprite: vi.fn().mockReturnThis()
        };

        mockScene.physics = {
            add: {
                group: vi.fn(() => ({
                    children: { entries: [] },
                    get: vi.fn()
                })),
                existing: vi.fn(),
                overlap: vi.fn()
            }
        };

        mockScene.input = {
            keyboard: {
                createCursorKeys: vi.fn()
            }
        };

        mockScene.currentLevelKey = 'level_1';
    });

    it('should transition from level_1 to level_2', () => {
        mockScene.currentLevelKey = 'level_1';

        mockScene.finalizeLevelTransition();

        expect(mockScene.scene.restart).toHaveBeenCalledWith({ levelKey: 'level_2' });
        expect(mockScene.audioManager.destroy).toHaveBeenCalled();
    });

    it('should transition from level_2 to MENU', () => {
        mockScene.currentLevelKey = 'level_2';

        mockScene.finalizeLevelTransition();

        expect(mockScene.scene.stop).toHaveBeenCalledWith(SCENES.UI);
        expect(mockScene.scene.start).toHaveBeenCalledWith(SCENES.MENU);
    });
});
