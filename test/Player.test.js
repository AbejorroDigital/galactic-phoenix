import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EVENTS } from '../src/core/Constants.js';

describe('Player.js Core Functionality', () => {
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
                                    base_shields: 50,
                                    visual_scale: 0.8,
                                    spawn_position: { x: 100, y: 300 },
                                    starting_weapon: 'basic_cannon',
                                    resistances: {
                                        fisico: 1.0,
                                        laser: 0.8
                                    }
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
                    existing: vi.fn((obj) => {
                        obj.body = {
                            enable: true,
                            setVelocity: vi.fn(),
                            setVelocityX: vi.fn(),
                            setVelocityY: vi.fn(),
                            setCollideWorldBounds: vi.fn(),
                            setDrag: vi.fn()
                        };
                        obj.setCollideWorldBounds = vi.fn().mockReturnThis();
                        obj.setDrag = vi.fn().mockReturnThis();
                        return obj;
                    }),
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
                emit: vi.fn(),
                once: vi.fn()
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
            setVelocity: vi.fn(),
            setCollideWorldBounds: vi.fn(),
            setDrag: vi.fn()
        };
        player.active = true;
    });

    describe('Initialization', () => {
        it('should initialize with correct flags', () => {
            expect(player.isDead).toBe(false);
            expect(player.canShoot).toBe(true);
            expect(player.isInvulnerable).toBe(false);
        });

        it('should load stats from JSON', () => {
            expect(player.currentStats.speed).toBe(300);
            expect(player.currentStats.fire_rate).toBe(250);
            expect(player.currentStats.luck).toBe(15);
        });

        it('should initialize HP correctly', () => {
            expect(player.hp).toBe(100);
            expect(player.maxHp).toBe(100);
        });

        it('should create engine particles', () => {
            expect(mockScene.add.particles).toHaveBeenCalled();
        });
    });

    describe('Death Handling', () => {
        it('should handle death with lives remaining', () => {
            mockScene.lives = 5;
            player.handleDeath();

            expect(player.isDead).toBe(true);
            expect(mockScene.lives).toBe(4);
            expect(mockScene.events.emit).toHaveBeenCalledWith(EVENTS.LIFE_CHANGE, 4);
        });

        it('should trigger game over with 0 lives', () => {
            mockScene.lives = 0;
            player.handleDeath();

            expect(mockScene.events.emit).toHaveBeenCalledWith(EVENTS.GAME_OVER);
        });

        it('should stop engine particles on death', () => {
            player.engineEmitter = {
                stop: vi.fn(),
                start: vi.fn()
            };
            player.handleDeath();

            expect(player.engineEmitter.stop).toHaveBeenCalled();
        });

        it('should hide sprite on death', () => {
            const setVisibleSpy = vi.spyOn(player, 'setVisible');
            player.handleDeath();

            expect(setVisibleSpy).toHaveBeenCalledWith(false);
        });
    });

    describe('Respawn System', () => {
        beforeEach(() => {
            player.hp = 0;
            player.isDead = true;
            player.setVisible = vi.fn();
            player.setPosition = vi.fn();
            player.setAlpha = vi.fn();
            player.engineEmitter = {
                stop: vi.fn(),
                start: vi.fn()
            };
        });

        it('should fully reset player state on respawn', () => {
            player.respawn();

            expect(player.hp).toBe(player.maxHp);
            expect(player.isDead).toBe(false);
            expect(player.isInvulnerable).toBe(true);
            expect(player.visible).toBe(true);
            expect(player.body.enable).toBe(true);
        });

        it('should restart engine particles on respawn', () => {
            player.respawn();

            expect(player.engineEmitter.start).toHaveBeenCalled();
        });

        it('should emit heal event on respawn', () => {
            player.respawn();

            expect(mockScene.events.emit).toHaveBeenCalledWith(EVENTS.PLAYER_HEAL, {
                current: player.maxHp,
                max: player.maxHp
            });
        });

        it('should set invulnerability for 3 seconds', () => {
            player.respawn();

            expect(player.isInvulnerable).toBe(true);
            expect(mockScene.time.delayedCall).toHaveBeenCalledWith(3000, expect.any(Function));
        });
    });

    describe('Shooting Mechanics', () => {
        beforeEach(() => {
            mockScene.playerBullets = {
                get: vi.fn(() => ({
                    fire: vi.fn()
                }))
            };
        });

        it('should not shoot when canShoot is false', () => {
            player.canShoot = false;
            const cursors = {
                space: { isDown: true },
                up: { isDown: false },
                down: { isDown: false },
                left: { isDown: false },
                right: { isDown: false }
            };

            player.update(cursors, 10000);

            expect(mockScene.playerBullets.get).not.toHaveBeenCalled();
        });

        it('should shoot when canShoot is true', () => {
            player.canShoot = true;
            const cursors = {
                space: { isDown: true },
                up: { isDown: false },
                down: { isDown: false },
                left: { isDown: false },
                right: { isDown: false }
            };

            player.update(cursors, 10000);

            expect(mockScene.playerBullets.get).toHaveBeenCalled();
        });
    });

    describe('Invulnerability', () => {
        it('should not take damage while invulnerable', () => {
            player.isInvulnerable = true;
            const initialHp = player.hp;

            player.takeDamage({ damage: 50, type: 'laser' });

            expect(player.hp).toBe(initialHp);
        });

        it('should take damage when not invulnerable', () => {
            player.isInvulnerable = false;
            const initialHp = player.hp;

            // Escudos mockeados en 50, daño de 60 para afectar HP
            player.takeDamage({ damage: 60, type: 'laser' });

            expect(player.hp).toBeLessThan(initialHp);
        });
    });

    describe('Lives System', () => {
        it('should handle collision death same as projectile death', () => {
            mockScene.lives = 5;

            player.takeDamage({ damage: 999, type: 'fisico' });

            expect(player.isDead).toBe(true);
            expect(mockScene.lives).toBe(4);
        });

        it('should prevent rapid deaths', () => {
            mockScene.lives = 5;

            player.handleDeath();
            player.handleDeath(); // Intento duplicado

            expect(mockScene.lives).toBe(4);
        });
    });

    describe('Weapon System', () => {
        it('should equip weapon correctly', () => {
            player.equipWeapon('plasma_repeater');

            expect(player.currentWeapon).toBe('plasma_repeater');
            expect(mockScene.events.emit).toHaveBeenCalledWith(EVENTS.WEAPON_CHANGE, 'plasma_repeater');
        });

        it('should start with basic_cannon', () => {
            expect(player.currentWeapon).toBe('basic_cannon');
        });
    });

    describe('Life Powerup', () => {
        it('should add lives correctly', () => {
            mockScene.lives = 3;
            player.addLife(1);

            expect(mockScene.lives).toBe(4);
            expect(mockScene.events.emit).toHaveBeenCalledWith(EVENTS.LIFE_CHANGE, 4);
        });

        it('should add multiple lives', () => {
            mockScene.lives = 2;
            player.addLife(3);

            expect(mockScene.lives).toBe(5);
        });
    });
});
