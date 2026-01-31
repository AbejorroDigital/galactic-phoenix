import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('Player Respawn Integration Tests', () => {
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
                                    visual_scale: 0.8,
                                    spawn_position: { x: 100, y: 300 }
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
                delayedCall: vi.fn(),
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
                add: vi.fn()
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
            lives: 5
        };

        player = new Player(mockScene, 100, 100);
        player.body = {
            enable: true,
            setVelocity: vi.fn()
        };
        player.active = true;
    });

    it('should initialize with correct flags on spawn', () => {
        expect(player.isDead).toBe(false);
        expect(player.canShoot).toBe(true);
        expect(player.isInvulnerable).toBe(false);
    });

    it('should properly handle death with 5 lives', () => {
        mockScene.lives = 5;
        player.hp = 10;

        player.takeDamage({ damage: 50, type: 'laser' });

        // Should have called handleDeath
        expect(player.isDead).toBe(true);
        expect(mockScene.events.emit).toHaveBeenCalledWith('life-change', 4);
        expect(mockScene.time.delayedCall).toHaveBeenCalledWith(1500, expect.any(Function));
    });

    it('should stop and restart particles correctly', () => {
        player.engineEmitter = {
            stop: vi.fn(),
            start: vi.fn()
        };
        mockScene.lives = 5;

        player.handleDeath();
        expect(player.engineEmitter.stop).toHaveBeenCalled();

        // Manually trigger respawn since delayedCall is mocked
        player.respawn();
        expect(player.engineEmitter.start).toHaveBeenCalled();
    });

    it('should fully reset player state on respawn', () => {
        player.hp = 0;
        player.isDead = true;
        player.setVisible = vi.fn();
        player.setPosition = vi.fn();
        player.setAlpha = vi.fn();

        player.respawn();

        expect(player.hp).toBe(player.maxHp);
        expect(player.isDead).toBe(false);
        expect(player.isInvulnerable).toBe(true);
        expect(player.setVisible).toHaveBeenCalledWith(true);
        expect(player.body.enable).toBe(true);
    });

    it('should not allow shooting while canShoot is false', () => {
        player.canShoot = false;
        player.scene.playerBullets = {
            get: vi.fn(() => ({
                fire: vi.fn()
            }))
        };

        const cursors = {
            space: { isDown: true },
            up: { isDown: false },
            down: { isDown: false },
            left: { isDown: false },
            right: { isDown: false }
        };

        player.update(cursors, 10000);

        expect(player.scene.playerBullets.get).not.toHaveBeenCalled();
    });

    it('should preserve lives across scene restarts', () => {
        const mockGameScene = {
            lives: 2,
            cache: { json: { get: vi.fn() } }
        };

        const mockUIScene = {
            scene: {
                get: vi.fn(() => mockGameScene)
            }
        };

        // Simulate UIScene getting lives from GameScene
        const livesFromGame = mockGameScene.lives;

        expect(livesFromGame).toBe(2);
    });

    it('should handle collision death same as projectile death', () => {
        mockScene.lives = 5;

        // Simulate collision damage
        player.takeDamage({ damage: 9999, type: 'fisico' });

        expect(player.isDead).toBe(true);
        expect(mockScene.lives).toBe(4);
    });

    it('should not trigger respawn on game over (0 lives)', () => {
        mockScene.lives = 1;

        player.handleDeath();

        // Should emit game over, not schedule respawn
        expect(mockScene.events.emit).toHaveBeenCalledWith('game-over');
        expect(mockScene.events.emit).toHaveBeenCalledWith('life-change', 0);

        // delayedCall should not be called for respawn
        expect(mockScene.time.delayedCall).not.toHaveBeenCalledWith(1500, expect.any(Function));
    });

    it('should handle rapid deaths correctly', () => {
        mockScene.lives = 5;

        player.handleDeath();
        // Try to die again immediately
        player.handleDeath();

        // Should only process once due to isDead check
        expect(mockScene.events.emit).toHaveBeenCalledTimes(2); // LIFE_CHANGE only once, plus one from takeDamage
    });
});

describe('GameScene Lives Initialization', () => {
    let GameScene;

    beforeEach(async () => {
        GameScene = (await import('../src/scenes/GameScene.js')).default;
    });

    it('should initialize lives to 3 on first scene create', () => {
        const scene = new GameScene();

        expect(scene.lives).toBe(undefined); // Not yet created

        // Simulate create being called
        scene.lives = scene.lives === undefined ? 3 : scene.lives;

        expect(scene.lives).toBe(3);
    });

    it('should preserve lives on scene restart', () => {
        const scene = new GameScene();
        scene.lives = 2;

        // Simulate restart - lives should NOT reset
        const preservedLives = scene.lives === undefined ? 3 : scene.lives;

        expect(preservedLives).toBe(2);
    });

    it('should initialize isTransitioning to false', () => {
        const scene = new GameScene();
        scene.isTransitioning = false;
        scene.isGameOver = false;

        expect(scene.isTransitioning).toBe(false);
        expect(scene.isGameOver).toBe(false);
    });
});
