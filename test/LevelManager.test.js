import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock de Phaser Time Event
class MockTimeEvent {
    constructor(config) {
        this.delay = config.delay;
        this.callback = config.callback;
        this.callbackScope = config.callbackScope;
        this.loop = config.loop || false;
    }
}

// Mock de escena para LevelManager
const createMockScene = () => {
    const enemiesGroup = {
        get: vi.fn(() => ({
            spawn: vi.fn(),
            active: true
        })),
        countActive: vi.fn(() => 0)
    };

    const bossGroup = {
        get: vi.fn(() => ({
            spawnBoss: vi.fn(),
            active: true
        }))
    };

    return {
        cache: {
            json: {
                get: vi.fn((key) => {
                    if (key === 'levels') {
                        return {
                            level_1: {
                                sequence: ['scout_wave', 'boss_encounter_1']
                            }
                        };
                    }
                    if (key === 'blocks') {
                        return {
                            scout_wave: [
                                { time: 1000, enemyId: 'interceptor_alpha', y: 100 }
                            ],
                            boss_encounter_1: [
                                { time: 2000, bossId: 'void_reaver', isBoss: true, y: 300 }
                            ]
                        };
                    }
                    if (key === 'enemies') {
                        return {
                            enemies: {
                                interceptor_alpha: {
                                    health: 30,
                                    sprite: 'enemy1',
                                    score: 100
                                }
                            }
                        };
                    }
                    if (key === 'bosses') {
                        return {
                            bosses: {
                                void_reaver: {
                                    name: 'Void Reaver',
                                    hp: 2000
                                }
                            }
                        };
                    }
                })
            }
        },
        enemies: enemiesGroup,
        bossGroup: bossGroup,
        time: {
            now: 0,
            addEvent: vi.fn((config) => new MockTimeEvent(config))
        },
        events: {
            emit: vi.fn(),
            once: vi.fn()
        },
        scale: {
            width: 800,
            height: 600
        }
    };
};

import LevelManager from '../src/managers/LevelManager.js';

describe('LevelManager - Gestión de Niveles', () => {
    let scene;
    let levelManager;

    beforeEach(() => {
        scene = createMockScene();
        levelManager = new LevelManager(scene);
    });

    it('debería inicializar correctamente con un nivel válido', () => {
        levelManager.init('level_1');

        expect(levelManager.levelData).toBeDefined();
        expect(levelManager.levelData.sequence).toEqual(['scout_wave', 'boss_encounter_1']);
        expect(levelManager.isLevelRunning).toBe(true);
    });

    it('debería cargar datos de enemigos y jefes correctamente', () => {
        levelManager.init('level_1');

        expect(levelManager.enemyData).toBeDefined();
        expect(levelManager.enemyData.interceptor_alpha).toBeDefined();
        expect(levelManager.bossData).toBeDefined();
        expect(levelManager.bossData.void_reaver).toBeDefined();
    });

    it('debería iniciar el primer bloque al inicializar', () => {
        levelManager.init('level_1');

        expect(levelManager.currentBlockIndex).toBe(0);
        expect(levelManager.currentBlockEvents).toBeDefined();
        expect(levelManager.currentBlockEvents.length).toBeGreaterThan(0);
    });

    it('debería procesar eventos de spawn cuando el tiempo se cumple', () => {
        levelManager.init('level_1');

        // Avanzar tiempo suficiente para spawnear el primer enemigo
        levelManager.elapsedInBlock = 0;
        levelManager.update(1500, 1500); // 1.5 segundos

        // Debería haber spawneado al menos un enemigo
        expect(scene.enemies.get).toHaveBeenCalled();
    });

    it('debería distinguir entre enemigos normales y jefes', () => {
        levelManager.init('level_1');

        const normalEvent = { time: 1000, enemyId: 'interceptor_alpha', y: 100 };
        const bossEvent = { time: 2000, bossId: 'void_reaver', isBoss: true, y: 300 };

        levelManager.spawnActor(normalEvent);
        expect(scene.enemies.get).toHaveBeenCalled();

        levelManager.spawnActor(bossEvent);
        expect(scene.bossGroup.get).toHaveBeenCalled();
    });

    it('debería pausar el nivel cuando aparece un jefe', () => {
        levelManager.init('level_1');
        levelManager.isLevelRunning = true;

        const bossEvent = { time: 2000, bossId: 'void_reaver', isBoss: true, y: 300 };
        levelManager.handleBossSpawn(bossEvent);

        expect(levelManager.isLevelRunning).toBe(false);
    });

    it('debería emitir LEVEL_FINISHED cuando se completan todos los bloques', () => {
        levelManager.init('level_1');

        // Simular que estamos en el último bloque y no hay más
        levelManager.currentBlockIndex = levelManager.levelData.sequence.length - 1;
        levelManager.currentBlockEvents = [];

        levelManager.startBlock(levelManager.currentBlockIndex + 1);

        expect(scene.events.emit).toHaveBeenCalledWith('level-finished');
        expect(levelManager.isLevelRunning).toBe(false);
    });

    it('debería ordenar eventos por tiempo al cargar un bloque', () => {
        scene.cache.json.get = vi.fn((key) => {
            if (key === 'blocks') {
                return {
                    test_block: [
                        { time: 3000, enemyId: 'enemy3', y: 300 },
                        { time: 1000, enemyId: 'enemy1', y: 100 },
                        { time: 2000, enemyId: 'enemy2', y: 200 }
                    ]
                };
            }
            if (key === 'levels') {
                return {
                    level_1: { sequence: ['test_block'] }
                };
            }
            if (key === 'enemies') {
                return { enemies: {} };
            }
            if (key === 'bosses') {
                return { bosses: {} };
            }
        });

        levelManager.init('level_1');

        // Los eventos deberían estar ordenados por tiempo
        expect(levelManager.currentBlockEvents[0].time).toBe(1000);
        expect(levelManager.currentBlockEvents[1].time).toBe(2000);
        expect(levelManager.currentBlockEvents[2].time).toBe(3000);
    });
});
