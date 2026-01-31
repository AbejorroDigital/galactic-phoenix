import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('Player Death Crash Debug Tests', () => {
    let mockScene;
    let Player;
    let player;
    let debugLogs;

    beforeEach(async () => {
        // Mock DEBUG_LOGGER
        debugLogs = [];
        global.window = global.window || {};
        global.window.DEBUG_LOGGER = {
            log: vi.fn((category, message, data) => {
                debugLogs.push({ category, message, data });
            }),
            logPlayerState: vi.fn((player, label) => {
                debugLogs.push({ type: 'playerState', label, player });
            }),
            logSpriteState: vi.fn((sprite, label) => {
                debugLogs.push({ type: 'spriteState', label, sprite });
            }),
            logSceneState: vi.fn((scene, label) => {
                debugLogs.push({ type: 'sceneState', label, scene });
            }),
            logCriticalError: vi.fn((location, error, context) => {
                debugLogs.push({ type: 'error', location, error, context });
            })
        };

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
                delayedCall: vi.fn(),
                addEvent: vi.fn(() => ({
                    remove: vi.fn()
                })),
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
        player.setVisible = vi.fn();
        player.setPosition = vi.fn();
        player.setAlpha = vi.fn();
        player.engineEmitter = {
            stop: vi.fn(),
            start: vi.fn()
        };
    });

    afterEach(() => {
        debugLogs = [];
        delete global.window.DEBUG_LOGGER;
    });

    describe('Death Logging Verification', () => {
        it('should log handleDeath() entry', () => {
            player.handleDeath();

            const entryLog = debugLogs.find(log =>
                log.message === '=== handleDeath() CALLED ==='
            );

            expect(entryLog).toBeDefined();
            expect(entryLog.category).toBe('death');
        });

        it('should log player state before death', () => {
            player.handleDeath();

            const stateLog = debugLogs.find(log =>
                log.type === 'playerState' && log.label === 'BEFORE handleDeath'
            );

            expect(stateLog).toBeDefined();
        });

        it('should log all death steps in order', () => {
            player.handleDeath();

            const expectedSteps = [
                '=== handleDeath() CALLED ===',
                'Setting isDead = true',
                'Stopping player movement',
                'Stopping engine particles',
                'Hiding player sprite'
            ];

            expectedSteps.forEach(step => {
                const log = debugLogs.find(log => log.message === step);
                expect(log).toBeDefined();
            });
        });

        it('should log particle operations', () => {
            player.handleDeath();

            const particleStopLog = debugLogs.find(log =>
                log.category === 'particle' && log.message === 'Stopping engine particles'
            );

            expect(particleStopLog).toBeDefined();
            expect(player.engineEmitter.stop).toHaveBeenCalled();
        });

        it('should log lives decrement', () => {
            const initialLives = mockScene.lives;
            player.handleDeath();

            const livesLog = debugLogs.find(log =>
                log.message === 'Decrementing lives'
            );

            expect(livesLog).toBeDefined();
            expect(livesLog.data.before).toBe(initialLives);
            expect(livesLog.data.after).toBe(initialLives - 1);
        });

        it('should log game over when lives = 0', () => {
            mockScene.lives = 1;
            player.handleDeath();

            const gameOverLog = debugLogs.find(log =>
                log.message === '=== GAME OVER - NO LIVES REMAINING ==='
            );

            expect(gameOverLog).toBeDefined();
        });

        it('should log respawn schedule when lives > 0', () => {
            mockScene.lives = 5;
            player.handleDeath();

            const respawnLog = debugLogs.find(log =>
                log.message &&
                log.message.includes('Will respawn in 1500ms')
            );

            expect(respawnLog).toBeDefined();
            expect(respawnLog.message).toContain('4 lives remaining');
        });
    });

    describe('Error Handling', () => {
        it('should catch and log errors in setVisible', () => {
            player.setVisible = vi.fn(() => {
                throw new Error('Sprite error');
            });

            player.handleDeath();

            const errorLog = debugLogs.find(log =>
                log.type === 'error' && log.location === 'setVisible(false)'
            );

            expect(errorLog).toBeDefined();
        });

        it('should catch and log errors in particle stop', () => {
            player.engineEmitter.stop = vi.fn(() => {
                throw new Error('Particle error');
            });

            player.handleDeath();

            const errorLog = debugLogs.find(log =>
                log.type === 'error' && log.location === 'engineEmitter.stop()'
            );

            expect(errorLog).toBeDefined();
        });

        it('should fallback to game over on critical error', () => {
            // Force critical error by making isDead throw
            Object.defineProperty(player, 'isDead', {
                get() { throw new Error('Critical error'); }
            });

            expect(() => {
                player.handleDeath();
            }).not.toThrow(); // Should be caught

            expect(mockScene.events.emit).toHaveBeenCalledWith('game-over');
        });

        it('should log missing body error', () => {
            player.body = null;
            player.handleDeath();

            const errorLog = debugLogs.find(log =>
                log.type === 'error' &&
                log.error &&
                log.error.message === 'NO BODY FOUND'
            );

            expect(errorLog).toBeDefined();
        });

        it('should log missing engine emitter', () => {
            player.engineEmitter = null;
            player.handleDeath();

            const log = debugLogs.find(log =>
                log.message === 'NO ENGINE EMITTER FOUND'
            );

            expect(log).toBeDefined();
        });
    });

    describe('Respawn Logging', () => {
        it('should log respawn() entry', () => {
            player.respawn();

            const entryLog = debugLogs.find(log =>
                log.message === '=== respawn() CALLED ==='
            );

            expect(entryLog).toBeDefined();
        });

        it('should log all respawn steps', () => {
            player.respawn();

            const expectedSteps = [
                'Resetting HP to max',
                'Resetting position',
                'Making player visible',
                'Re-enabling physics body',
                'Restarting engine particles'
            ];

            expectedSteps.forEach(step => {
                const log = debugLogs.find(log => log.message === step);
                expect(log).toBeDefined();
            });
        });

        it('should log invulnerability activation', () => {
            player.respawn();

            const invulnLog = debugLogs.find(log =>
                log.message === 'Starting invulnerability flash effect'
            );

            expect(invulnLog).toBeDefined();
        });

        it('should handle respawn errors gracefully', () => {
            player.setPosition = vi.fn(() => {
                throw new Error('Position error');
            });

            expect(() => {
                player.respawn();
            }).not.toThrow();

            const errorLog = debugLogs.find(log =>
                log.type === 'error' && log.location === 'respawn() - TOP LEVEL'
            );

            expect(errorLog).toBeDefined();
        });
    });

    describe('State Validation', () => {
        it('should prevent double death', () => {
            player.handleDeath();
            const firstCallLogs = debugLogs.length;

            player.handleDeath(); // Try again

            const earlyReturnLog = debugLogs.find(log =>
                log.message === 'Already dead, returning early'
            );

            expect(earlyReturnLog).toBeDefined();
        });

        it('should track sprite visibility correctly', () => {
            player.handleDeath();

            const visibilityLog = debugLogs.find(log =>
                log.type === 'spriteState' && log.label === 'AFTER setVisible(false)'
            );

            expect(visibilityLog).toBeDefined();
            expect(player.setVisible).toHaveBeenCalledWith(false);
        });

        it('should track body enabled state', () => {
            player.handleDeath();

            const bodyLog = debugLogs.find(log =>
                log.message === 'Body disabled'
            );

            expect(bodyLog).toBeDefined();
            expect(bodyLog.data.bodyEnabled).toBe(false);
        });
    });
});

describe('GameScene Death Tracking', () => {
    let GameScene;
    let mockScene;
    let debugLogs;

    beforeEach(async () => {
        debugLogs = [];
        global.window = global.window || {};
        global.window.DEBUG_LOGGER = {
            log: vi.fn((category, message, data) => {
                debugLogs.push({ category, message, data });
            }),
            logSceneState: vi.fn((scene, label) => {
                debugLogs.push({ type: 'sceneState', label, scene });
            }),
            logCriticalError: vi.fn((location, error, context) => {
                debugLogs.push({ type: 'error', location, error, context });
            })
        };

        GameScene = (await import('../src/scenes/GameScene.js')).default;
        mockScene = new GameScene();

        mockScene.physics = {
            pause: vi.fn()
        };
        mockScene.levelManager = {
            isLevelRunning: true
        };
        mockScene.audioManager = {
            fadeOutMusic: vi.fn(),
            playSFX: vi.fn()
        };
        mockScene.isGameOver = false;
    });

    afterEach(() => {
        debugLogs = [];
        delete global.window.DEBUG_LOGGER;
    });

    it('should log handleGameOver entry', () => {
        mockScene.handleGameOver();

        const entryLog = debugLogs.find(log =>
            log.message === '=== handleGameOver() CALLED ==='
        );

        expect(entryLog).toBeDefined();
    });

    it('should prevent double game over', () => {
        mockScene.handleGameOver();
        mockScene.handleGameOver(); // Try again

        const earlyReturnLog = debugLogs.find(log =>
            log.message === 'Already in game over state, returning'
        );

        expect(earlyReturnLog).toBeDefined();
    });

    it('should log all game over steps', () => {
        mockScene.handleGameOver();

        const expectedSteps = [
            'Setting isGameOver = true',
            'Pausing physics',
            'Stopping level manager',
            'Fading out audio'
        ];

        expectedSteps.forEach(step => {
            const log = debugLogs.find(log => log.message === step);
            expect(log).toBeDefined();
        });
    });
});
