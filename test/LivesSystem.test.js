import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('Player Lives and Respawn System', () => {
    let mockScene;
    let Player;
    let player;

    beforeEach(async () => {
        Player = (await import('../src/entities/Player.js')).default;

        mockScene = {
            cache: {
                json: {
                    get: vi.fn((key) => {
                        if (key === 'player') {
                            return {
                                player: {
                                    speed: 300,
                                    fire_rate: 250,
                                    luck: 15,
                                    hp: 100,
                                    max_hp: 100,
                                    visual_scale: 0.8
                                }
                            };
                        }
                        return null;
                    })
                }
            },
            add: {
                existing: vi.fn(),
                text: vi.fn(() => ({
                    setOrigin: vi.fn().mockReturnThis(),
                    setDepth: vi.fn().mockReturnThis()
                })),
                particles: vi.fn(() => ({
                    startFollow: vi.fn(),
                    stop: vi.fn(),
                    start: vi.fn(),
                    setConfig: vi.fn()
                }))
            },
            physics: {
                add: {
                    existing: vi.fn(),
                    group: vi.fn(() => ({
                        get: vi.fn(() => ({
                            fire: vi.fn()
                        }))
                    }))
                }
            },
            time: {
                delayedCall: vi.fn((delay, callback) => {
                    // Simulate immediate callback for testing
                    callback();
                }),
                addEvent: vi.fn(() => ({
                    remove: vi.fn()
                }))
            },
            events: {
                emit: vi.fn()
            },
            textures: {
                exists: vi.fn(() => true)
            },
            tweens: {
                add: vi.fn((config) => {
                    if (config.targets && config.alpha !== undefined) {
                        const targets = Array.isArray(config.targets) ? config.targets : [config.targets];
                        targets.forEach(t => t.alpha = config.alpha);
                    }
                })
            },
            scale: {
                width: 800,
                height: 600
            },
            registry: {
                get: vi.fn((key) => {
                    if (key === 'graphicsQuality') return 1;
                    return null;
                }),
                set: vi.fn(),
                has: vi.fn().mockReturnValue(true)
            },
            game: {
                events: { on: vi.fn(), emit: vi.fn(), once: vi.fn(), off: vi.fn() },
                settings: {
                    getGraphicsQualityName: vi.fn().mockReturnValue('MEDIA')
                }
            },
            lives: 3
        };

        player = new Player(mockScene, 100, 100);
        player.body = {
            enable: true,
            setVelocity: vi.fn()
        };
        player.active = true;
    });

    it('should not trigger game over when player has lives remaining', () => {
        mockScene.lives = 3;

        player.handleDeath();

        // Should emit LIFE_CHANGE but NOT GAME_OVER
        expect(mockScene.events.emit).toHaveBeenCalledWith('life-change', 2);
        expect(mockScene.events.emit).not.toHaveBeenCalledWith('game-over');
    });

    it('should trigger game over when player has no lives', () => {
        mockScene.lives = 1;

        player.handleDeath();

        expect(mockScene.events.emit).toHaveBeenCalledWith('life-change', 0);
        expect(mockScene.events.emit).toHaveBeenCalledWith('game-over');
    });

    it('should respawn player after death with lives', () => {
        mockScene.lives = 3;
        player.hp = 0;

        player.handleDeath();

        // time.delayedCall should have been called for respawn
        expect(mockScene.time.delayedCall).toHaveBeenCalled();

        // After respawn callback
        expect(player.hp).toBe(player.maxHp);
        expect(player.isDead).toBe(false);
    });

    it('should make player invulnerable after respawn', () => {
        mockScene.lives = 3;

        // Specialized mock for this test: respawn (1500ms) happens but invulnerability (3000ms) persists
        mockScene.time.delayedCall.mockImplementation((delay, callback) => {
            if (delay < 2000) callback(); // Execute respawn
            // Don't execute the 3000ms invulnerability clearing callback yet
        });

        player.handleDeath();

        expect(player.isInvulnerable).toBe(true);
        expect(player.alpha).toBe(0.5);
    });

    it('should stop engine particles on death', () => {
        player.engineEmitter = {
            stop: vi.fn(),
            start: vi.fn()
        };
        mockScene.lives = 3;

        player.handleDeath();

        expect(player.engineEmitter.stop).toHaveBeenCalled();
    });

    it('should restart engine particles on respawn', () => {
        player.engineEmitter = {
            stop: vi.fn(),
            start: vi.fn()
        };
        mockScene.lives = 3;

        player.handleDeath();
        // Respawn happens

        expect(player.engineEmitter.start).toHaveBeenCalled();
    });

    it('should not take damage while invulnerable', () => {
        player.isInvulnerable = true;
        const initialHp = player.hp;

        player.takeDamage({ damage: 10, type: 'laser' });

        expect(player.hp).toBe(initialHp);
    });

    it('should hide sprite on death and show on respawn', () => {
        const setVisibleSpy = vi.spyOn(player, 'setVisible');
        mockScene.lives = 3;

        player.handleDeath();

        expect(setVisibleSpy).toHaveBeenCalledWith(false);
        // After respawn
        expect(setVisibleSpy).toHaveBeenCalledWith(true);
    });
});

describe('Level Transition Freezing', () => {
    let mockGameScene;
    let GameScene;

    beforeEach(async () => {
        GameScene = (await import('../src/scenes/GameScene.js')).default;

        mockGameScene = new GameScene();
        mockGameScene.cache = {
            json: {
                get: vi.fn()
            }
        };
        mockGameScene.add = {
            image: vi.fn().mockReturnThis(),
            tileSprite: vi.fn().mockReturnThis(),
            existing: vi.fn()
        };
        mockGameScene.physics = {
            add: {
                group: vi.fn(() => ({
                    children: {
                        entries: []
                    }
                })),
                existing: vi.fn(),
                overlap: vi.fn()
            }
        };
        mockGameScene.scene = {
            get: vi.fn(() => ({
                updateHealth: vi.fn()
            })),
            launch: vi.fn(),
            restart: vi.fn()
        };
        mockGameScene.time = {
            delayedCall: vi.fn()
        };
        mockGameScene.events = {
            on: vi.fn()
        };

        mockGameScene.player = {
            hp: 50,
            maxHp: 100,
            isDead: false,
            canShoot: true
        };

        mockGameScene.enemies = {
            children: {
                entries: [
                    {
                        active: true,
                        body: {
                            setVelocity: vi.fn()
                        },
                        setActive: vi.fn()
                    }
                ]
            }
        };

        mockGameScene.enemiesBullets = {
            children: {
                entries: [
                    {
                        active: true,
                        kill: vi.fn()
                    }
                ]
            }
        };
    });

    it('should set isTransitioning flag on level transition', () => {
        mockGameScene.goToNextLevel();

        expect(mockGameScene.isTransitioning).toBe(true);
    });

    it('should disable player shooting during transition', () => {
        mockGameScene.goToNextLevel();

        expect(mockGameScene.player.canShoot).toBe(false);
    });

    it('should stop all enemies during transition', () => {
        mockGameScene.goToNextLevel();

        const enemy = mockGameScene.enemies.children.entries[0];
        expect(enemy.body.setVelocity).toHaveBeenCalledWith(0, 0);
        expect(enemy.setActive).toHaveBeenCalledWith(false);
    });

    it('should kill all enemy bullets during transition', () => {
        mockGameScene.goToNextLevel();

        const bullet = mockGameScene.enemiesBullets.children.entries[0];
        expect(bullet.kill).toHaveBeenCalled();
    });

    it('should not update game when isTransitioning is true', () => {
        mockGameScene.isTransitioning = true;
        mockGameScene.player.update = vi.fn();
        mockGameScene.levelManager = {
            update: vi.fn()
        };

        mockGameScene.update(1000, 16);

        expect(mockGameScene.player.update).not.toHaveBeenCalled();
        expect(mockGameScene.levelManager.update).not.toHaveBeenCalled();
    });
});
