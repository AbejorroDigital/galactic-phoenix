import { EVENTS } from '../core/Constants.js';


/**
 * @class LevelManager
 * @description Gestiona la progresión del nivel, la generación de enemigos y los encuentros con jefes.
 * Lee las secuencias de nivel desde JSON y coordina el tiempo de los eventos.
 * 
 * @example
 * const levelManager = new LevelManager(gameScene);
 * levelManager.init('level_1');
 */
export default class LevelManager {
    /**
     * @param {Phaser.Scene} scene - La escena a la que pertenece este gestor.
     */
    constructor(scene) {
        /** @type {Phaser.Scene} */
        this.scene = scene;
        /** @type {boolean} */
        this.isLevelRunning = false;
        /** @type {number} */
        this.currentBlockIndex = 0;
        /** @type {number} */
        this.elapsedInBlock = 0;
        /** @type {Array<Object>} */
        this.currentBlockEvents = [];
        /** @type {Phaser.Time.TimerEvent|null} */
        this.bossEnemySpawner = null;
    }

    /**
     * Inicializa el gestor con un nivel específico.
     * @param {string} levelKey - Clave del nivel a cargar desde el caché JSON.
     */
    init(levelKey) {
        if (!this.scene.enemies || !this.scene.bossGroup) {
            console.error('LevelManager: La escena no tiene los grupos necesarios inicializados.');
            return;
        }

        const levelCache = this.scene.cache.json.get('levels');
        const blocksCache = this.scene.cache.json.get('blocks');

        if (!levelCache || !levelCache[levelKey]) {
            console.error(`Nivel no encontrado: ${levelKey}`);
            return;
        }

        this.levelData = levelCache[levelKey];
        this.blocksData = blocksCache;

        const enemiesJson = this.scene.cache.json.get('enemies');
        const bossesJson = this.scene.cache.json.get('bosses');

        this.enemyData = enemiesJson && enemiesJson.enemies ? enemiesJson.enemies : {};
        this.bossData = bossesJson && bossesJson.bosses ? bossesJson.bosses : {};

        this.startBlock(0);
    }

    /**
     * Inicia un nuevo bloque de secuencia por índice.
     * @param {number} index - Índice del bloque en la secuencia del nivel.
     * @fires EVENTS.LEVEL_FINISHED
     */
    startBlock(index) {
        if (!this.levelData || index >= this.levelData.sequence.length) {
            this.isLevelRunning = false;
            this.scene.events.emit(EVENTS.LEVEL_FINISHED);
            return;
        }

        const blockKey = this.levelData.sequence[index];
        const blockContent = this.blocksData[blockKey];

        if (!blockContent) {
            console.warn(`Bloque vacío o no encontrado: ${blockKey}, saltando...`);
            this.startBlock(index + 1);
            return;
        }

        this.currentBlockEvents = JSON.parse(JSON.stringify(blockContent))
            .sort((a, b) => a.time - b.time);

        this.currentBlockIndex = index;
        this.elapsedInBlock = 0;
        this.isLevelRunning = true;
    }

    /**
     * Actualiza el temporizador de progresión del nivel y genera actores si su tiempo ha llegado.
     * @param {number} time - Tiempo actual del juego.
     * @param {number} delta - Tiempo delta desde el último frame.
     */
    update(time, delta) {
        if (!this.isLevelRunning) return;

        this.elapsedInBlock += delta;

        while (this.currentBlockEvents.length > 0 && this.elapsedInBlock >= this.currentBlockEvents[0].time) {
            const event = this.currentBlockEvents.shift();
            this.spawnActor(event);
        }

        if (this.currentBlockEvents.length === 0) {
            this.checkBlockCompletion();
        }
    }

    /**
     * Método unificado para generar ya sea un enemigo regular o un jefe.
     * @param {Object} eventConfig - Configuración para el actor a generar.
     * @param {boolean} [eventConfig.isBoss] - Indica si el actor es un jefe.
     */
    spawnActor(eventConfig) {
        if (eventConfig.isBoss) {
            this.handleBossSpawn(eventConfig);
        } else {
            this.handleEnemySpawn(eventConfig);
        }
    }

    /**
     * Genera un enemigo regular basado en la configuración del evento.
     * @param {Object} eventConfig - Configuración para el enemigo.
     * @param {string} eventConfig.enemyId - El ID del tipo de enemigo.
     * @param {number} eventConfig.y - Coordenada Y para la generación.
     */
    handleEnemySpawn(eventConfig) {
        const stats = this.enemyData[eventConfig.enemyId];
        if (!stats) {
            console.warn(`Stats no encontrados para enemigo: ${eventConfig.enemyId}`);
            return;
        }

        const enemy = this.scene.enemies.get();

        if (enemy) {
            enemy.spawn(eventConfig.y, stats);
        }
    }

    /**
     * Maneja la lógica de generación de jefes, incluyendo detener el temporizador del nivel y configurar generadores de esbirros.
     * @param {Object} eventConfig - Configuración para el jefe.
     * @param {string} eventConfig.bossId - El ID del tipo de jefe.
     * @listens EVENTS.BOSS_DEFEATED
     */
    handleBossSpawn(eventConfig) {
        const stats = this.bossData[eventConfig.bossId];
        if (!stats) {
            console.warn(`LevelManager: Boss '${eventConfig.bossId}' no encontrado en datos`);
            return;
        }

        this.isLevelRunning = false;

        if (this.scene.bossGroup) {
            const boss = this.scene.bossGroup.get();
            if (boss) {
                boss.spawnBoss(stats);

                // NUEVO: Generar esbirros periódicamente durante la batalla del jefe
                this.bossEnemySpawner = this.scene.time.addEvent({
                    delay: 5000, // Cada 5 segundos
                    callback: () => {
                        if (boss.active && !boss.isDead) {
                            this.spawnBossMinion();
                        }
                    },
                    loop: true
                });

                this.scene.events.once(EVENTS.BOSS_DEFEATED, (bossName) => {
                    console.log(`Jefe ${bossName} derrotado!`);

                    // Limpiar generador de esbirros
                    if (this.bossEnemySpawner) {
                        this.bossEnemySpawner.remove();
                        this.bossEnemySpawner = null;
                    }

                    this.startBlock(this.currentBlockIndex + 1);
                });
            }
        }
    }

    /**
     * Genera un esbirro durante la batalla del jefe.
     */
    spawnBossMinion() {
        const enemy = this.scene.enemies.get();
        if (enemy) {
            const y = Phaser.Math.Between(100, 500);
            const stats = this.enemyData['interceptor_alpha'];
            if (stats) {
                enemy.spawn(y, stats);
            }
        }
    }

    /**
     * Comprueba si el bloque actual se ha completado (todos los eventos finalizados y enemigos destruidos).
     */
    checkBlockCompletion() {
        const activeEnemies = this.scene.enemies.countActive();

        if (this.elapsedInBlock > 3000 && activeEnemies === 0) {
            this.startBlock(this.currentBlockIndex + 1);
        }
    }
}