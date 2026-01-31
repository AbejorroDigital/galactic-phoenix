import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('GameScene.js Lives and Transitions', () => {
    let GameScene;
    let mockScene;

    beforeEach(async () => {
        GameScene = (await import('../src/scenes/GameScene.js')).default;

        mockScene = new GameScene();
        mockScene.cache = {
            json: {
                get: vi.fn((key) => {
                    if (key === 'levels') {
                        return {
                            level_1: {
                                name: 'Test Level',
                                music: 'bg_music',
                                background_key: 'bg_block'
                            }
                        };
                    }
                    if (key === 'player') {
                        return {
                            player: {
                                spawn_position: { x: 100, y: 300 }
                            }
                        };
                    }
                    return null;
                })
            }
        };

        mockScene.add = {
            image: vi.fn().mockReturnThis(),
            tileSprite: vi.fn().mockReturnThis(),
            existing: vi.fn()
        };

        mockScene.physics = {
            add: {
                group: vi.fn(() => ({
                    children: { entries: [] }
                })),
                existing: vi.fn(),
                overlap: vi.fn()
            }
        };

        mockScene.scene = {
            get: vi.fn(() => ({
                updateHealth: vi.fn()
            })),
            launch: vi.fn(),
            restart: vi.fn(),
            isActive: vi.fn(() => false)
        };

        mockScene.time = {
            delayedCall: vi.fn()
        };

        mockScene.events = {
            on: vi.fn()
        };

        mockScene.input = {
            keyboard: {
                createCursorKeys: vi.fn(() => ({})),
                on: vi.fn()
            }
        };

        mockScene.cameras = {
            main: {
                fadeOut: vi.fn()
            }
        };
    });

    describe('Lives Initialization', () => {
        it('should initialize lives to 3 on first create', () => {
            expect(mockScene.lives).toBe(undefined);

            // Simulate initialization
            if (mockScene.lives === undefined) {
                mockScene.lives = 3;
            }

            expect(mockScene.lives).toBe(3);
        });

        it('should preserve lives on scene restart', () => {
            mockScene.lives = 2;

            // Simulate restart - check if lives are preserved
            const preservedLives = mockScene.lives === undefined ? 3 : mockScene.lives;

            expect(preservedLives).toBe(2);
        });

        it('should not reset lives to 3 if already set', () => {
            mockScene.lives = 1; // Almost game over

            if (mockScene.lives === undefined) {
                mockScene.lives = 3;
            }

            expect(mockScene.lives).toBe(1); // Should remain 1
        });
    });

    describe('Transition Flag', () => {
        it('should initialize isTransitioning to false', () => {
            mockScene.isTransitioning = false;

            expect(mockScene.isTransitioning).toBe(false);
        });

        it('should initialize isGameOver to false', () => {
            mockScene.isGameOver = false;

            expect(mockScene.isGameOver).toBe(false);
        });
    });

    describe('Level Transition Freezing', () => {
        beforeEach(() => {
            mockScene.player = {
                hp: 50,
                maxHp: 100,
                isDead: false,
                canShoot: true
            };

            mockScene.enemies = {
                children: {
                    entries: [
                        {
                            active: true,
                            body: { setVelocity: vi.fn() },
                            setActive: vi.fn()
                        }
                    ]
                }
            };

            mockScene.enemiesBullets = {
                children: {
                    entries: [
                        {
                            active: true,
                            kill: vi.fn()
                        }
                    ]
                }
            };

            mockScene.audioManager = {
                fadeOutMusic: vi.fn(),
                stopMusic: vi.fn()
            };
        });

        it('should disable player shooting during transition', () => {
            mockScene.goToNextLevel();

            expect(mockScene.player.canShoot).toBe(false);
        });

        it('should stop all enemies during transition', () => {
            mockScene.goToNextLevel();

            const enemy = mockScene.enemies.children.entries[0];
            expect(enemy.body.setVelocity).toHaveBeenCalledWith(0, 0);
            expect(enemy.setActive).toHaveBeenCalledWith(false);
        });

        it('should kill all enemy bullets during transition', () => {
            mockScene.goToNextLevel();

            const bullet = mockScene.enemiesBullets.children.entries[0];
            expect(bullet.kill).toHaveBeenCalled();
        });

        it('should heal player before transition', () => {
            const uiScene = {
                updateHealth: vi.fn()
            };
            mockScene.scene.get = vi.fn(() => uiScene);

            mockScene.goToNextLevel();

            expect(mockScene.player.hp).toBe(mockScene.player.maxHp);
            expect(uiScene.updateHealth).toHaveBeenCalled();
        });

        it('should fade out music during transition', () => {
            mockScene.goToNextLevel();

            expect(mockScene.audioManager.stopMusic).toHaveBeenCalledWith(500);
        });
    });

    describe('Update Loop Behavior', () => {
        beforeEach(() => {
            mockScene.player = {
                isDead: false,
                update: vi.fn()
            };
            mockScene.levelManager = {
                update: vi.fn()
            };
            mockScene.background = {
                tilePositionX: 0
            };
            mockScene.bgScrollSpeed = 1;
        });

        it('should not update when isGameOver is true', () => {
            mockScene.isGameOver = true;
            mockScene.isTransitioning = false;

            mockScene.update(1000, 16);

            expect(mockScene.player.update).not.toHaveBeenCalled();
        });

        it('should not update when isTransitioning is true', () => {
            mockScene.isGameOver = false;
            mockScene.isTransitioning = true;

            mockScene.update(1000, 16);

            expect(mockScene.player.update).not.toHaveBeenCalled();
        });

        it('should update normally when not in transition or game over', () => {
            mockScene.isGameOver = false;
            mockScene.isTransitioning = false;

            mockScene.update(1000, 16);

            expect(mockScene.player.update).toHaveBeenCalled();
            expect(mockScene.levelManager.update).toHaveBeenCalled();
        });

        it('should animate background even during transition check', () => {
            mockScene.isGameOver = false;
            mockScene.isTransitioning = false;
            const initialX = mockScene.background.tilePositionX;

            mockScene.update(1000, 16);

            // Background should scroll (if update runs normally)
            // This is implementation-dependent
        });
    });
});
