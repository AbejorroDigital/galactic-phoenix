import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('Boss Movement Patterns', () => {
    let mockScene;
    let Boss;
    let boss;

    beforeEach(async () => {
        Boss = (await import('../src/entities/Boss.js')).default;

        mockScene = {
            cache: {
                json: {
                    get: vi.fn()
                }
            },
            add: {
                existing: vi.fn()
            },
            physics: {
                add: {
                    existing: vi.fn()
                }
            },
            tweens: {
                add: vi.fn((config) => {
                    // Simulate tween completion immediately for testing
                    if (config.onComplete) {
                        config.onComplete();
                    }
                })
            },
            time: {
                now: 1000
            },
            events: {
                emit: vi.fn()
            },
            scale: {
                width: 800,
                height: 600
            },
            enemiesBullets: {
                get: vi.fn(() => ({
                    fire: vi.fn()
                }))
            }
        };

        boss = new Boss(mockScene);
        boss.body = {
            enable: true,
            setVelocityY: vi.fn(),
            setVelocityX: vi.fn(),
            stop: vi.fn()
        };
    });

    it('should activate movement after entrance tween', () => {
        const config = {
            hp: 1000,
            speed: 80,
            behavior: 'vertical_bounce',
            visual_scale: 1.0,
            phases: [
                { hp_threshold: 1.0, weapon: 'enemy_laser', fire_rate: 1000 }
            ]
        };

        boss.spawnBoss(config);

        // Tween completion callback should activate behavior
        expect(boss.behaviorActive).toBe(true);
    });

    it('should move with vertical_bounce pattern', () => {
        const config = {
            hp: 1000,
            speed: 100,
            behavior: 'vertical_bounce',
            phases: []
        };

        boss.spawnBoss(config);
        boss.behaviorActive = true;

        boss.handleMovement(2000);

        expect(boss.body.setVelocityY).toHaveBeenCalled();
        expect(boss.body.setVelocityX).toHaveBeenCalledWith(0);
    });

    it('should move with figure_eight pattern', () => {
        const config = {
            hp: 1500,
            speed: 60,
            behavior: 'figure_eight',
            phases: []
        };

        boss.spawnBoss(config);
        boss.behaviorActive = true;

        boss.handleMovement(3000);

        expect(boss.body.setVelocityY).toHaveBeenCalled();
        expect(boss.body.setVelocityX).toHaveBeenCalled();
    });

    it('should not move if behaviorActive is false', () => {
        const config = {
            hp: 1000,
            speed: 80,
            behavior: 'vertical_bounce',
            phases: []
        };

        boss.spawnBoss(config);
        boss.behaviorActive = false;

        boss.handleMovement(1000);

        // Should not call velocity methods
        expect(boss.body.setVelocityY).not.toHaveBeenCalled();
    });

    it('should not spam console when phases missing', () => {
        const consoleWarnSpy = vi.spyOn(console, 'warn');

        const config = {
            hp: 1000,
            visual_scale: 1.0,
            weapon_phase1: 'enemy_laser',
            fire_rate_phase1: 500
            // No phases array
        };

        boss.spawnBoss(config);
        boss.behaviorActive = true;
        boss.fireTimer = 0;

        // Call multiple times to simulate game loop
        for (let i = 0; i < 100; i++) {
            boss.handleCombat(1000 + i * 100);
        }

        // Should not have any console.warn calls
        expect(consoleWarnSpy).not.toHaveBeenCalled();

        consoleWarnSpy.mockRestore();
    });
});

describe('UIScene Healthbar Initialization', () => {
    let mockGameScene;
    let UIScene;
    let uiScene;

    beforeEach(async () => {
        UIScene = (await import('../src/scenes/UIScene.js')).default;

        mockGameScene = {
            player: {
                hp: 100,
                maxHp: 100,
                stats: {
                    luck: 15
                }
            },
            events: {
                on: vi.fn(),
                emit: vi.fn()
            }
        };

        uiScene = new UIScene();
        uiScene.add = {
            graphics: vi.fn(() => ({
                clear: vi.fn(),
                fillStyle: vi.fn().mockReturnThis(),
                fillRect: vi.fn().mockReturnThis(),
                lineStyle: vi.fn().mockReturnThis(),
                strokeRect: vi.fn().mockReturnThis()
            })),
            text: vi.fn(() => ({
                setOrigin: vi.fn().mockReturnThis(),
                setDepth: vi.fn().mockReturnThis(),
                setVisible: vi.fn().mockReturnThis(),
                setText: vi.fn()
            })),
            container: vi.fn(() => ({
                setDepth: vi.fn().mockReturnThis(),
                setVisible: vi.fn().mockReturnThis(),
                add: vi.fn()
            })),
            rectangle: vi.fn(() => ({
                setInteractive: vi.fn().mockReturnThis(),
                on: vi.fn().mockReturnThis()
            })),
            image: vi.fn(() => ({
                setDisplaySize: vi.fn().mockReturnThis()
            }))
        };
        uiScene.cameras = {
            main: {
                width: 800,
                height: 600
            }
        };
        uiScene.scene = {
            get: vi.fn(() => mockGameScene),
            stop: vi.fn(),
            start: vi.fn()
        };
    });

    it('should initialize healthbar with player HP on create', () => {
        const updateHealthSpy = vi.spyOn(uiScene, 'updateHealth');

        uiScene.create();

        expect(updateHealthSpy).toHaveBeenCalledWith({
            current: 100,
            max: 100
        });
    });

    it('should show healthbar even when player has full HP', () => {
        uiScene.create();

        // Call updateHealth manually to verify it works with full HP
        uiScene.updateHealth({ current: 100, max: 100 });

        // Healthbar graphics should be updated
        expect(uiScene.healthBar.clear).toHaveBeenCalled();
        expect(uiScene.healthBar.fillRect).toHaveBeenCalled();
    });

    it('should handle player with reduced HP at scene start', () => {
        mockGameScene.player.hp = 50;
        mockGameScene.player.maxHp = 100;

        const updateHealthSpy = vi.spyOn(uiScene, 'updateHealth');

        uiScene.create();

        expect(updateHealthSpy).toHaveBeenCalledWith({
            current: 50,
            max: 100
        });
    });
});
