import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EVENTS } from '../src/core/Constants.js';

// Mock Phaser globally
global.Phaser = {
    Physics: {
        Arcade: {
            Sprite: class {
                constructor(scene, x, y, texture) {
                    this.scene = scene;
                    this.x = x;
                    this.y = y;
                    this.texture = texture;
                    this.active = true;
                    this.visible = true;
                }
                setTint() { return this; }
                clearTint() { return this; }
                setActive(val) { this.active = val; return this; }
                setVisible(val) { this.visible = val; return this; }
                setVelocity(x, y) { }
                setScale(s) { }
                setAlpha(a) { }
                setCollideWorldBounds(b) { }
                setPosition(x, y) { this.x = x; this.y = y; }
            }
        }
    },
    Math: {
        Clamp: (value, min, max) => Math.min(Math.max(value, min), max)
    }
};

describe('Player Death Integration (Crash Fix)', () => {
    let mockScene;
    let player;
    let Player;

    beforeEach(async () => {
        // Dynamic import to ensure global Phaser mock is present
        const playerModule = await import('../src/entities/Player.js');
        Player = playerModule.default;

        mockScene = {
            cache: {
                json: {
                    get: vi.fn(() => ({
                        player: {
                            hp: 100,
                            max_hp: 100
                        }
                    }))
                }
            },
            add: {
                existing: vi.fn(),
                text: vi.fn(() => ({
                    setOrigin: vi.fn().mockReturnThis(),
                    setDepth: vi.fn().mockReturnThis(),
                    destroy: vi.fn()
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
                            setCollideWorldBounds: vi.fn(),
                            setDrag: vi.fn()
                        };
                    }),
                    group: vi.fn(() => ({ get: vi.fn() }))
                }
            },
            time: {
                delayedCall: vi.fn((delay, callback) => callback()), // Execute immediately
                addEvent: vi.fn(() => ({ remove: vi.fn() })),
                now: 1000
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
            scale: { width: 800, height: 600 },
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
            lives: 3 // Start with 3 lives
        };

        // Mock window.DEBUG_LOGGER to prevent errors
        global.window = global.window || {};
        global.window.DEBUG_LOGGER = {
            log: vi.fn(),
            logPlayerState: vi.fn(),
            logSpriteState: vi.fn(),
            logSceneState: vi.fn(),
            logCriticalError: vi.fn()
        };

        player = new Player(mockScene, 100, 100);
        player.body = { enable: true, setVelocity: vi.fn() };
        player.setVisible = vi.fn();
        player.setPosition = vi.fn();
        player.setAlpha = vi.fn();
    });

    it('should correctly handle lethal damage using new die() override', () => {
        // Log original lives
        const initialLives = mockScene.lives;

        // Apply lethal damage
        // This simulates the flow: takeDamage -> hp<=0 -> die() -> handleDeath()
        player.takeDamage({ damage: 200, type: 'test' });

        // VERIFY: Lives should have decreased
        expect(mockScene.lives, 'Lives should decrement on death').toBe(initialLives - 1);

        // VERIFY: isDead should be false after respawn (since delayedCall is mocked to run immediately)
        expect(player.isDead, 'Player should be alive after respawn').toBe(false);

        // VERIFY: HP should be restored
        expect(player.hp, 'HP should be restored').toBe(100);

        // VERIFY: Events
        expect(mockScene.events.emit).toHaveBeenCalledWith(EVENTS.LIFE_CHANGE, expect.anything());
    });

    it('should NOT soft-lock active state when taking lethal damage', () => {
        // This tests the regression where Entity.die() would set active=false
        player.takeDamage({ damage: 200 });

        // Even during death process (before respawn), we don't strictly need active=false 
        // if we are hiding the sprite. But importantly, we want to ensure custom logic ran.
        // If Player.die() was NOT overridden, Entity.die() would run and disable everything,
        // potentially preventing handleDeath if called after.

        // Check that handleDeath logic executed (e.g., stopping particles)
        expect(player.engineEmitter.stop).toHaveBeenCalled();
    });
});
