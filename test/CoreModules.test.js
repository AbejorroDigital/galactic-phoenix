import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('PowerUp.js Tests', () => {
    let PowerUp;
    let mockScene;
    let powerup;

    beforeEach(async () => {
        PowerUp = (await import('../src/entities/PowerUp.js')).default;

        mockScene = {
            cache: {
                json: {
                    get: vi.fn((key) => {
                        if (key === 'powerups') {
                            return {
                                shield_battery: {
                                    type: 'heal',
                                    amount: 30,
                                    sprite: 'powerup_orb',
                                    tint: '0x00ffff',
                                    display_name: 'Shield Battery'
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
                existing: vi.fn(),
                text: vi.fn(() => ({
                    setOrigin: vi.fn().mockReturnThis(),
                    setDepth: vi.fn().mockReturnThis()
                }))
            },
            physics: {
                add: {
                    existing: vi.fn()
                }
            },
            events: {
                emit: vi.fn()
            },
            tweens: {
                add: vi.fn()
            },
            time: {
                addEvent: vi.fn()
            }
        };
    });

    describe('PowerUp Types', () => {
        it('should handle heal powerup', () => {
            powerup = new PowerUp(mockScene, 100, 100);
            powerup.spawn(100, 100, 'shield_battery');

            const mockPlayer = {
                recoverShield: vi.fn()
            };

            powerup.collect(mockPlayer);

            expect(mockPlayer.recoverShield).toHaveBeenCalledWith(30);
        });

        it('should handle life powerup', () => {
            powerup = new PowerUp(mockScene, 100, 100);
            powerup.spawn(100, 100, 'extra_life');

            const mockPlayer = {
                addLife: vi.fn()
            };

            powerup.collect(mockPlayer);

            expect(mockPlayer.addLife).toHaveBeenCalledWith(1);
        });

        it('should handle weapon powerup', () => {
            powerup = new PowerUp(mockScene, 100, 100);
            powerup.spawn(100, 100, 'plasma_upgrade');

            const mockPlayer = {
                equipWeapon: vi.fn()
            };

            powerup.applyEffect(mockPlayer);

            expect(mockPlayer.equipWeapon).toHaveBeenCalledWith('plasma_repeater', 'Plasma Repeater');
        });
    });

    describe('Display Names', () => {
        it('should use display_name from JSON', () => {
            powerup = new PowerUp(mockScene, 100, 100);
            powerup.spawn(100, 100, 'extra_life');

            const mockPlayer = {
                addLife: vi.fn()
            };
            powerup.applyEffect(mockPlayer);

            // Should emit with display name
            expect(mockScene.events.emit).toHaveBeenCalledWith(
                'powerup-collected',
                expect.stringMatching(/Extra Life/i)
            );
        });
    });

    describe('Spawning', () => {
        it('should spawn at correct position', () => {
            powerup = new PowerUp(mockScene, 100, 100);
            const setPositionSpy = vi.spyOn(powerup, 'setPosition');

            powerup.spawn(200, 300, 'shield_battery');

            expect(setPositionSpy).toHaveBeenCalledWith(200, 300);
        });

        it('should apply correct tint', () => {
            powerup = new PowerUp(mockScene, 100, 100);
            const setTintSpy = vi.spyOn(powerup, 'setTint');

            powerup.spawn(100, 100, 'shield_battery');

            expect(setTintSpy).toHaveBeenCalled();
        });
    });
});

describe('Projectile.js Tests', () => {
    let Projectile;
    let mockScene;
    let projectile;

    beforeEach(async () => {
        Projectile = (await import('../src/entities/Projectile.js')).default;

        mockScene = {
            cache: {
                json: {
                    get: vi.fn((key) => {
                        if (key === 'weapons') {
                            return {
                                projectiles: {
                                    basic_cannon: {
                                        damage: 10,
                                        speed: 400,
                                        sprite: 'shot-hero',
                                        type: 'fisico'
                                    },
                                    enemy_laser: {
                                        damage: 10,
                                        speed: 250,
                                        sprite: 'shot-enemy',
                                        type: 'laser'
                                    }
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
                    existing: vi.fn((obj) => {
                        obj.body = {
                            enable: true,
                            setVelocityX: vi.fn(),
                            setVelocityY: vi.fn(),
                            stop: vi.fn(),
                            setSize: vi.fn()
                        };
                        return obj;
                    })
                }
            }
        };

        projectile = new Projectile(mockScene, 0, 0);
        projectile.body = {
            setVelocityX: vi.fn(),
            enable: false
        };
    });

    describe('Projectile Firing', () => {
        it('should fire player projectile correctly', () => {
            projectile.fire(100, 200, 'basic_cannon', true);

            expect(projectile.body.setVelocityX).toHaveBeenCalledWith(400);
            expect(projectile.body.enable).toBe(true);
        });

        it('should fire enemy projectile correctly', () => {
            projectile.fire(100, 200, 'enemy_laser', false);

            expect(projectile.body.setVelocityX).toHaveBeenCalledWith(-250);
        });

        it('should load correct stats from JSON', () => {
            projectile.fire(100, 200, 'basic_cannon', 0);

            expect(projectile.stats.damage).toBe(10);
            expect(projectile.stats.type).toBe('fisico');
        });
    });

    describe('Projectile Lifecycle', () => {
        it('should kill projectile when leaving screen', () => {
            projectile.x = -100; // Off screen

            projectile.update();

            expect(projectile.active).toBe(false);
        });

        it('should reset on kill', () => {
            const setActiveSpy = vi.spyOn(projectile, 'setActive');

            projectile.kill();

            expect(setActiveSpy).toHaveBeenCalledWith(false);
        });
    });
});

describe('StateMachine.js Tests', () => {
    let StateMachine;
    let stateMachine;

    beforeEach(async () => {
        StateMachine = (await import('../src/core/StateMachine.js')).default;
        stateMachine = new StateMachine();
    });

    describe('State Management', () => {
        it('should create state machine', () => {
            expect(stateMachine).toBeDefined();
            expect(stateMachine.states).toBeDefined();
        });

        it('should add states correctly', () => {
            const idleState = {
                enter: vi.fn(),
                update: vi.fn(),
                exit: vi.fn()
            };

            stateMachine.addState('idle', idleState);

            expect(stateMachine.states.idle).toBeDefined();
        });

        it('should transition between states', () => {
            const idleState = {
                enter: vi.fn(),
                exit: vi.fn()
            };
            const moveState = {
                enter: vi.fn(),
                exit: vi.fn()
            };

            stateMachine.addState('idle', idleState);
            stateMachine.addState('move', moveState);

            stateMachine.setState('idle');
            expect(idleState.enter).toHaveBeenCalled();

            stateMachine.setState('move');
            expect(idleState.exit).toHaveBeenCalled();
            expect(moveState.enter).toHaveBeenCalled();
        });

        it('should call update on current state', () => {
            const idleState = {
                enter: vi.fn(),
                update: vi.fn()
            };

            stateMachine.addState('idle', idleState);
            stateMachine.setState('idle');

            stateMachine.update(100, 16);

            expect(idleState.update).toHaveBeenCalledWith(100, 16);
        });

        it('should not transition to non-existent state', () => {
            expect(() => {
                stateMachine.setState('nonexistent');
            }).not.toThrow();

            expect(stateMachine.currentState).toBeNull();
        });
    });
});

describe('Constants.js Tests', () => {
    it('should export EVENTS', async () => {
        const { EVENTS } = await import('../src/core/Constants.js');

        expect(EVENTS).toBeDefined();
        expect(EVENTS.GAME_OVER).toBeDefined();
        expect(EVENTS.PLAYER_HIT).toBeDefined();
        expect(EVENTS.LIFE_CHANGE).toBeDefined();
    });

    it('should export SCENES', async () => {
        const { SCENES } = await import('../src/core/Constants.js');

        expect(SCENES).toBeDefined();
        expect(SCENES.BOOT).toBeDefined();
        expect(SCENES.GAME).toBeDefined();
        expect(SCENES.UI).toBeDefined();
    });

    it('should have all required event constants', async () => {
        const { EVENTS } = await import('../src/core/Constants.js');

        const requiredEvents = [
            'GAME_OVER',
            'PLAYER_HIT',
            'PLAYER_HEAL',
            'LIFE_CHANGE',
            'LEVEL_FINISHED',
            'ENEMY_DESTROYED',
            'WEAPON_CHANGE'
        ];

        requiredEvents.forEach(event => {
            expect(EVENTS[event]).toBeDefined();
        });
    });
});
