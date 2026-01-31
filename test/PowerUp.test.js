import { beforeEach, describe, expect, it, vi } from 'vitest';
import PowerUp from '../src/entities/PowerUp.js';

describe('PowerUp System', () => {
    let mockScene;
    let powerup;

    beforeEach(() => {
        mockScene = {
            cache: {
                json: {
                    get: vi.fn((key) => {
                        if (key === 'powerups') {
                            return {
                                speed_boost: {
                                    type: 'stat_mod',
                                    stat: 'speed',
                                    value: 100,
                                    duration: 5000,
                                    sprite: 'powerup_orb',
                                    tint: '0x00ff00',
                                    display_name: 'Speed Boost'
                                },
                                extra_life: {
                                    type: 'life',
                                    amount: 1,
                                    sprite: 'vida',
                                    tint: '0xffff00',
                                    display_name: 'Extra Life'
                                },
                                plasma_upgrade: {
                                    type: 'weapon',
                                    weapon_id: 'plasma_repeater',
                                    sprite: 'powerup_box',
                                    tint: '0xff00ff',
                                    display_name: 'Plasma Repeater'
                                }
                            };
                        }
                        return null;
                    })
                }
            },
            add: {
                existing: vi.fn()
            },
            physics: {
                add: {
                    existing: vi.fn()
                },
                world: {
                    enable: vi.fn()
                }
            },
            events: {
                emit: vi.fn()
            }
        };

        powerup = new PowerUp(mockScene);
        powerup.body = {
            enable: true,
            setVelocityX: vi.fn(),
            setVelocityY: vi.fn(),
            stop: vi.fn()
        };
    });

    it('should spawn with correct display name', () => {
        powerup.spawn(100, 100, 'speed_boost');

        expect(powerup.config.display_name).toBe('Speed Boost');
    });

    it('should handle life powerup type', () => {
        const mockPlayer = {
            addLife: vi.fn()
        };

        powerup.spawn(100, 100, 'extra_life');
        powerup.collect(mockPlayer);

        expect(mockPlayer.addLife).toHaveBeenCalledWith(1);
    });

    it('should show display name instead of key with underscores', () => {
        powerup.spawn(100, 100, 'plasma_upgrade');

        expect(powerup.config.display_name).toBe('Plasma Repeater');
        expect(powerup.config.display_name).not.toContain('_');
    });

    it('should emit powerup-collected event with display name', () => {
        const mockPlayer = {
            applyStatMod: vi.fn()
        };

        powerup.spawn(100, 100, 'speed_boost');
        powerup.collect(mockPlayer);

        expect(mockScene.events.emit).toHaveBeenCalledWith('powerup-collected', 'Speed Boost');
    });

    it('should handle weapon powerup with display name', () => {
        const mockPlayer = {
            equipWeapon: vi.fn()
        };

        powerup.spawn(100, 100, 'plasma_upgrade');
        powerup.collect(mockPlayer);

        expect(mockPlayer.equipWeapon).toHaveBeenCalledWith('plasma_repeater', 'Plasma Repeater');
    });
});

describe('Player Life System', () => {
    let mockScene;
    let player;

    beforeEach(async () => {
        const Player = (await import('../src/entities/Player.js')).default;

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
                                    max_hp: 100
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
                    setOrigin: vi.fn(() => ({
                        setDepth: vi.fn()
                    }))
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
                    existing: vi.fn()
                }
            },
            time: {
                delayedCall: vi.fn()
            },
            events: {
                emit: vi.fn()
            },
            tweens: {
                add: vi.fn()
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
    });

    it('should add lives correctly', () => {
        player.addLife(1);

        expect(mockScene.lives).toBe(4);
    });

    it('should emit LIFE_CHANGE event', () => {
        player.addLife(1);

        expect(mockScene.events.emit).toHaveBeenCalledWith('life-change', 4);
    });

    it('should handle initial lives setup', () => {
        delete mockScene.lives;
        player.addLife(1);

        expect(mockScene.lives).toBe(4); // 3 default + 1
    });
});
