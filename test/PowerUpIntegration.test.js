import { beforeEach, describe, expect, it, vi } from 'vitest';

// 1. Mock Phaser BEFORE importing classes that extend it
global.Phaser = {
    Scene: class { },
    Math: {
        Between: vi.fn(),
    },
    Utils: {
        Array: {
            GetRandom: vi.fn((arr) => arr[0]),
        }
    },
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
                    this.body = { setVelocityX: vi.fn(), setVelocityY: vi.fn(), stop: vi.fn() };
                }
                setPosition(x, y) { this.x = x; this.y = y; return this; }
                setTexture(t) { this.texture = t; return this; }
                setTint(t) { this.tint = t; return this; }
                setActive(a) { this.active = a; return this; }
                setVisible(v) { this.visible = v; return this; }
                setScale(s) { this.scale = s; return this; }
                setCollideWorldBounds() { return this; }
                setAlpha() { return this; }
            },
            Group: class {
                constructor() {
                    this.children = { entries: [] };
                }
                get() {
                    const child = new (require('../src/entities/PowerUp.js').default)(this.scene);
                    this.children.entries.push(child);
                    return child;
                }
            }
        }
    }
};

// 2. Now import the classes
import Player from '../src/entities/Player.js';
import GameScene from '../src/scenes/GameScene.js';

describe('PowerUp Integration', () => {
    let scene;

    beforeEach(() => {
        scene = new GameScene();
        scene.cache = {
            json: {
                get: vi.fn((key) => {
                    if (key === 'powerups') {
                        return {
                            speed_boost: { type: 'stat_mod', luck: 100 },
                            extra_life: { type: 'life', sprite: 'vida' }
                        };
                    }
                    if (key === 'player') {
                        return { player: { luck: 100 } };
                    }
                    return {};
                })
            }
        };
        scene.physics = {
            add: {
                group: vi.fn(() => new Phaser.Physics.Arcade.Group()),
                existing: vi.fn(),
                overlap: vi.fn()
            }
        };
        scene.add = {
            existing: vi.fn(),
            particles: vi.fn(() => ({ stop: vi.fn(), start: vi.fn(), setConfig: vi.fn() })),
            text: vi.fn(() => ({ setOrigin: vi.fn(() => ({ setDepth: vi.fn() })) }))
        };
        scene.registry = { get: vi.fn(), set: vi.fn(), has: vi.fn() };
        scene.game = { events: { on: vi.fn() } };
        scene.events = { emit: vi.fn(), once: vi.fn(), on: vi.fn(), removeAllListeners: vi.fn() };
        scene.time = { now: 0, delayedCall: vi.fn() };
        scene.scale = { width: 800, height: 600 };
        scene.tweens = { add: vi.fn() };

        scene.player = new Player(scene, 100, 100);
        scene.powerUps = new Phaser.Physics.Arcade.Group();
        scene.powerUps.scene = scene;
    });

    it('should spawn a powerup based on luck', () => {
        Phaser.Math.Between.mockReturnValue(1);
        scene.trySpawnPowerUp(400, 300);

        expect(scene.powerUps.children.entries.length).toBe(1);
        const spawned = scene.powerUps.children.entries[0];
        expect(spawned.active).toBe(true);
        expect(spawned.x).toBe(400);
        expect(spawned.y).toBe(300);
    });

    it('should NOT spawn a powerup if luck fails', () => {
        scene.player.currentStats.luck = 0;
        Phaser.Math.Between.mockReturnValue(50);
        scene.trySpawnPowerUp(400, 300);
        expect(scene.powerUps.children.entries.length).toBe(0);
    });
});
