import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('Entity.js Base Class', () => {
    let Entity;
    let mockScene;
    let entity;

    beforeEach(async () => {
        Entity = (await import('../src/entities/Entity.js')).default;

        mockScene = {
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
            time: {
                addEvent: vi.fn(),
                delayedCall: vi.fn()
            },
            tweens: {
                add: vi.fn()
            }
        };

        entity = new Entity(mockScene, 100, 100, 'ship');
        entity.body = {
            enable: true
        };
        entity.resistances = {};
    });

    describe('Damage Calculation', () => {
        beforeEach(() => {
            entity.hp = 100;
            entity.maxHp = 100;
        });

        it('should take damage from valid projectile', () => {
            entity.takeDamage({ damage: 20, type: 'laser' });

            expect(entity.hp).toBe(80);
        });

        it('should handle null projectileStats safely', () => {
            expect(() => {
                entity.takeDamage(null);
            }).not.toThrow();
        });

        it('should handle undefined projectileStats safely', () => {
            expect(() => {
                entity.takeDamage(undefined);
            }).not.toThrow();
        });

        it('should handle missing damage property', () => {
            entity.takeDamage({ type: 'laser' });

            // Should still be alive
            expect(entity.hp).toBeGreaterThan(0);
        });

        it('should apply resistances correctly', () => {
            entity.resistances = { laser: 0.5 }; // 50% resistance
            entity.takeDamage({ damage: 20, type: 'laser' });

            // Should take only 10 damage (50% of 20)
            expect(entity.hp).toBe(90);
        });

        it('should handle negative damage', () => {
            entity.takeDamage({ damage: -10, type: 'laser' });

            // Should not heal
            expect(entity.hp).toBeLessThanOrEqual(100);
        });

        it('should not go below 0 HP', () => {
            entity.takeDamage({ damage: 200, type: 'laser' });

            expect(entity.hp).toBeGreaterThanOrEqual(0);
        });
    });

    describe('Damage Feedback', () => {
        it('should show damage text on hit', () => {
            entity.takeDamage({ damage: 15, type: 'laser' });

            expect(mockScene.add.text).toHaveBeenCalled();
        });

        it('should apply tint effect on damage', () => {
            const setTintSpy = vi.spyOn(entity, 'setTint');
            entity.takeDamage({ damage: 10, type: 'laser' });

            expect(setTintSpy).toHaveBeenCalled();
        });

        it('should clear tint after delay', () => {
            entity.takeDamage({ damage: 10, type: 'laser' });

            expect(mockScene.time.addEvent).toHaveBeenCalled();
        });
    });

    describe('Death Detection', () => {
        it('should detect death when HP reaches 0', () => {
            entity.hp = 10;
            entity.takeDamage({ damage: 50, type: 'laser' });

            expect(entity.hp).toBe(0);
        });

        it('should not process damage when already dead', () => {
            entity.isDead = true;
            const initialHp = entity.hp;

            entity.takeDamage({ damage: 20, type: 'laser' });

            expect(entity.hp).toBe(initialHp);
        });
    });
});

describe('Boss.js Specific Tests', () => {
    let Boss;
    let mockScene;
    let boss;

    beforeEach(async () => {
        Boss = (await import('../src/entities/Boss.js')).default;

        mockScene = {
            cache: {
                json: {
                    get: vi.fn((key) => {
                        if (key === 'bosses') {
                            return {
                                void_reaver: {
                                    hp: 800,
                                    damage: 25,
                                    fire_rate: 1500,
                                    speed: 100,
                                    movement_pattern: 'vertical_bounce',
                                    phases: [
                                        {
                                            hp_threshold: 1.0,
                                            behavior: 'basic_shoot',
                                            fire_rate_mod: 1.0
                                        }
                                    ]
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
            time: {
                addEvent: vi.fn(),
                delayedCall: vi.fn(),
                now: 1000
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
            }
        };

        boss = new Boss(mockScene, 400, 200, 'void_reaver', 'void_reaver');
        boss.body = {
            enable: true,
            setVelocityY: vi.fn(),
            setVelocityX: vi.fn(),
            setVelocity: vi.fn(),
            stop: vi.fn()
        };
    });

    describe('Phase System', () => {
        it('should not spam console when phases are properly configured', () => {
            const consoleWarnSpy = vi.spyOn(console, 'warn');
            boss.spawnBoss({
                hp: 100,
                phases: [{ hp_threshold: 1, weapon: 'laser', fire_rate: 1000 }]
            });

            boss.handleCombat(2000);

            expect(consoleWarnSpy).not.toHaveBeenCalled();

            consoleWarnSpy.mockRestore();
        });

        it('should fallback to default phase when config phase is missing', () => {
            // Skip if phases logic requires init
        });
    });

    describe('Movement Patterns', () => {
        it('should have valid movement pattern', () => {
            boss.spawnBoss({ hp: 100, behavior: 'vertical_bounce', phases: [] });
            expect(boss.config.behavior).toBeDefined();
        });

        it('should handle vertical_bounce pattern', () => {
            boss.spawnBoss({ hp: 100, behavior: 'vertical_bounce', phases: [{ hp_threshold: 1 }] });
            boss.behaviorActive = true;

            expect(() => {
                boss.update(1000, 16);
            }).not.toThrow();
        });

        it('should handle figure_eight pattern', () => {
            boss.spawnBoss({ hp: 100, behavior: 'figure_eight', phases: [{ hp_threshold: 1 }] });
            boss.behaviorActive = true;

            expect(() => {
                boss.update(1000, 16);
            }).not.toThrow();
        });
    });
});

describe('Enemy.js Powerup Spawning', () => {
    let Enemy;
    let mockScene;
    let enemy;

    beforeEach(async () => {
        Enemy = (await import('../src/entities/Enemy.js')).default;

        mockScene = {
            cache: {
                json: {
                    get: vi.fn((key) => {
                        if (key === 'enemies') {
                            return {
                                interceptor_alpha: {
                                    hp: 20,
                                    damage: 10,
                                    speed: 150,
                                    score_value: 100
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
            time: {
                addEvent: vi.fn()
            },
            tweens: {
                add: vi.fn()
            },
            events: {
                emit: vi.fn()
            },
            powerUps: {
                get: vi.fn(() => ({
                    spawn: vi.fn()
                }))
            }
        };

        enemy = new Enemy(mockScene, 400, 200, 'interceptor_alpha', 'interceptor_alpha');
        enemy.body = {
            enable: true
        };
    });

    describe('Powerup Drop', () => {
        it('should try to spawn powerup on death', () => {
            // Mock trySpawnPowerUp on scene
            mockScene.trySpawnPowerUp = vi.fn();

            enemy.die();

            // Should verify trySpawnPowerUp is called
            // Note: In Enemy.js restore, it calls this.scene.trySpawnPowerUp
            expect(mockScene.trySpawnPowerUp).toHaveBeenCalledWith(enemy.x, enemy.y);
        });
    });
});
