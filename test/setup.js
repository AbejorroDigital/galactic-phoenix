import { vi } from 'vitest';

console.log("Mocking Phaser Global...");

// Mock Phaser Global
global.Phaser = {
    Scene: class {
        constructor(key) {
            this.sys = {
                settings: { key: key }
            };
            this.scene = {
                bringToTop: vi.fn(),
                stop: vi.fn(),
                resume: vi.fn(),
                launch: vi.fn(),
                pause: vi.fn(),
                start: vi.fn(),
                isActive: vi.fn(() => true),
                get: vi.fn(() => ({
                    scene: {
                        resume: vi.fn(),
                        stop: vi.fn()
                    }
                }))
            };
            this.events = { on: vi.fn(), emit: vi.fn(), once: vi.fn(), off: vi.fn() };
            this.registry = {
                get: vi.fn((key) => {
                    if (key === 'musicVolume') return 0.5;
                    if (key === 'sfxVolume') return 0.7;
                    if (key === 'graphicsQuality') return 1;
                    return null;
                }),
                set: vi.fn(),
                has: vi.fn().mockReturnValue(true)
            };
            this.game = {
                registry: this.registry,
                events: { emit: vi.fn(), on: vi.fn(), once: vi.fn(), off: vi.fn() },
                settings: {
                    applySettings: vi.fn(),
                    getGraphicsQualityName: vi.fn().mockReturnValue('MEDIA'),
                    setMusicVolume: vi.fn(),
                    setSfxVolume: vi.fn(),
                    setGraphicsQuality: vi.fn()
                },
                sound: { volume: 1, sounds: [] }
            };
            this.cameras = {
                main: {
                    fadeOut: vi.fn(),
                    shake: vi.fn(),
                    on: vi.fn(),
                    once: vi.fn((event, callback) => callback && callback()), // Auto-resolve for tests
                    off: vi.fn()
                }
            };
            this.time = { delayedCall: vi.fn(), addEvent: vi.fn() };
            this.add = { image: vi.fn(), text: vi.fn(), existing: vi.fn(), group: vi.fn() };
            this.physics = { add: { group: vi.fn(), existing: vi.fn(), overlap: vi.fn() }, world: { enable: vi.fn() } };
            this.make = { text: vi.fn() };
            this.input = { keyboard: { createCursorKeys: vi.fn(), on: vi.fn() } };
            this.bgScrollSpeed = 0;
        }
        update() { }
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
                    this.alpha = 1;
                    this.body = {
                        enable: true,
                        setVelocity: vi.fn(),
                        setVelocityX: vi.fn(),
                        setVelocityY: vi.fn(),
                        stop: vi.fn(),
                        setSize: vi.fn(),
                        width: 10,
                        height: 10
                    };
                    this.setTint = vi.fn().mockReturnThis();
                    this.clearTint = vi.fn().mockReturnThis();
                    this.setActive = vi.fn().mockImplementation((v) => { this.active = v; return this; });
                    this.setVisible = vi.fn().mockImplementation((v) => { this.visible = v; return this; });
                    this.setAlpha = vi.fn().mockImplementation((a) => { this.alpha = a; return this; });
                    this.setPosition = vi.fn().mockReturnThis();
                    this.setTexture = vi.fn().mockReturnThis();
                    this.setScale = vi.fn().mockReturnThis();
                    this.setOrigin = vi.fn().mockReturnThis();
                    this.setDepth = vi.fn().mockReturnThis();
                    this.setCollideWorldBounds = vi.fn().mockReturnThis();
                }
            }
        }
    },
    Math: {
        Clamp: (v, min, max) => Math.min(Math.max(v, min), max),
        Between: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
        Angle: {
            Between: () => 0
        },
        RadToDeg: (rad) => rad * 180 / Math.PI
    },
    Utils: {
        Array: {
            GetRandom: (arr) => arr[0]
        }
    }
};

// Mock window.DEBUG_LOGGER
global.window = global.window || {};
global.window.__VITEST__ = true;
global.window.DEBUG_LOGGER = {
    log: vi.fn(),
    logPlayerState: vi.fn(),
    logSpriteState: vi.fn(),
    logSceneState: vi.fn(),
    logCriticalError: vi.fn()
};
