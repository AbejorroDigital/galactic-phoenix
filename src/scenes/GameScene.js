import { DEPTH, EVENTS, SCENES } from '../core/Constants.js';
import DamageText from '../effects/DamageText.js';
import ExplosionEffect from '../effects/ExplosionEffect.js';
import Boss from '../entities/Boss.js';
import Enemy from '../entities/Enemy.js';
import Player from '../entities/Player.js';
import PowerUp from '../entities/PowerUp.js';
import Projectile from '../entities/Projectile.js';
import AudioManager from '../managers/AudioManager.js';
import DebugManager from '../managers/DebugManager.js';
import LevelManager from '../managers/LevelManager.js';


/**
 * @class GameScene
 * @extends Phaser.Scene
 * @description La escena principal de juego para Galactic Phoenix.
 * Maneja el bucle del juego, las interacciones entre entidades y las transiciones de nivel.
 * 
 * @fires EVENTS.ENEMY_DESTROYED
 * @fires EVENTS.LEVEL_FINISHED
 * @fires EVENTS.GAME_OVER
 * @listens EVENTS.LEVEL_FINISHED
 * @listens EVENTS.ENEMY_DESTROYED
 * @listens EVENTS.GAME_OVER
 * 
 * @example
 * // En la configuración del juego
 * const config = {
 *     scene: [BootScene, MenuScene, GameScene, UIScene]
 * };
 */
export default class GameScene extends Phaser.Scene {
    /**
     * @constructor
     */
    constructor() {
        super(SCENES.GAME);
        /** @type {string} */
        this.currentLevelKey = 'level_1';
        /** @type {boolean} */
        this.isGameOver = false;
    }

    /**
     * Inicializa los datos de la escena.
     * @param {Object} data - Datos pasados desde la escena anterior.
     * @param {string} [data.levelKey] - La clave del nivel a cargar.
     */
    init(data) {
        if (data && data.levelKey) {
            this.currentLevelKey = data.levelKey;
        }
        this.isGameOver = false; // Reiniciar al inicializar
    }

    /**
     * Método del ciclo de vida de Phaser. Configura los objetos del juego, gestores y entrada.
     */
    create() {
        // ...
        // Reiniciar estado de eventos si venimos de un restart
        this.events.removeAllListeners(EVENTS.LEVEL_FINISHED);
        this.events.removeAllListeners(EVENTS.ENEMY_DESTROYED);
        this.events.removeAllListeners(EVENTS.GAME_OVER);

        // Reset victory panel in UI
        const uiScene = this.scene.get(SCENES.UI);
        if (uiScene && uiScene.victoryPanel) {
            uiScene.victoryPanel.setVisible(false);
        }
        if (uiScene && uiScene.gameOverPanel) {
            uiScene.gameOverPanel.setVisible(false);
        }

        // Cargar datos del nivel actual
        const levelData = this.cache.json.get('levels')[this.currentLevelKey];

        // Crear fondo con tiles
        this.setupBackground(levelData);

        // Inicializar AudioManager
        this.audioManager = new AudioManager(this);

        // Reproducir música del nivel
        if (levelData && levelData.music) {
            this.audioManager.playMusic(levelData.music, true, 1500);
        }

        this.cursors = this.input.keyboard.createCursorKeys();
        this.setupGroups();

        // CORRECCIÓN: Usar estructura aplanada de player.json
        const playerData = this.cache.json.get('player');
        const spawn = playerData && playerData.player && playerData.player.spawn_position
            ? playerData.player.spawn_position
            : { x: 100, y: 300 };

        // Crear Jugador
        this.player = new Player(this, spawn.x, spawn.y);
        this.player.canShoot = true;
        // Lanzar UI después de crear al jugador
        if (!this.scene.isActive(SCENES.UI)) {
            this.scene.launch(SCENES.UI);
        }

        // CRITICAL: Initialize lives system (only on first create)
        if (this.lives === undefined) {
            this.lives = 3;
        }
        this.isTransitioning = false;

        // Inicializar Gestor de Nivel
        this.levelManager = new LevelManager(this);
        this.levelManager.init(this.currentLevelKey);



        this.setupCollisions();

        // Escuchar destrucción de enemigos para efectos
        this.events.on(EVENTS.ENEMY_DESTROYED, (x, y, isBoss) => {
            if (isBoss) {
                ExplosionEffect.createBossExplosion(this, x, y);
                // AUDIO: Boss Death -> Fade out boss music -> Play Victory
                if (this.audioManager) {
                    this.audioManager.stopMusic(1000); // Fade out ominous_boss
                    this.time.delayedCall(200, () => {
                        this.audioManager.playSFX('exito', { volume: 0.9 });
                        this.audioManager.playSFX('sfx_boss_explosion', { volume: 0.9 });
                    });
                }
            } else {
                ExplosionEffect.createSmallExplosion(this, x, y);
                this.audioManager.playSFX('sfx_enemy_explosion', { volume: 0.4 });
            }
        });

        // Escuchar aparición de jefe para reproducir audio ominoso
        this.events.on('BOSS_SPAWNED', (data) => {
            if (this.audioManager) {
                // AUDIO: Stop Level Music Immediately -> Start Boss Loop
                // Forzamos stop inmediato (0ms match) para dar impacto
                this.audioManager.stopMusic(200);
                this.time.delayedCall(200, () => {
                    this.audioManager.playMusic('ominous_boss', true, 500);
                });
            }
        });

        // ==========================================
        // DEBUG MANAGER INITIALIZATION (LATE BINDING)
        // ==========================================
        // Se inicializa al final para garantizar acceso a physics, cameras y eventos
        if (window.DEBUG_MODE === false) {
            try {
                this.debugManager = new DebugManager(this);
                // Forzar activación inicial si es necesario
                if (this.debugManager.enabled) {
                    this.debugManager.showDebugUI();
                    this.debugManager.renderHitboxes();
                }
            } catch (err) {
                console.error('Error inicializando DebugManager:', err);
            }
        }

        // ========== SISTEMA DE FEEDBACK VISUAL ==========
        // Listener para números de daño flotantes y flares de impacto
        this.events.on(EVENTS.DAMAGE_DEALT, (data) => {
            // Crear número de daño flotante usando DamageText (con safe fallback)
            try {
                new DamageText(this, data.x, data.y, data.amount, data.isCritical);
            } catch (error) {
                console.warn('Error al crear DamageText:', error);
            }

            // Crear destello de impacto con flare.png
            try {
                ExplosionEffect.createHitFlare(this, data.x, data.y, data.damageType);
            } catch (error) {
                console.warn('Error al crear Hit Flare:', error);
            }
        });

        // Listener para aura de powerup
        this.events.on(EVENTS.POWERUP_ACTIVATED, (data) => {
            if (this.player && this.player.showPowerupAura) {
                this.player.showPowerupAura(data.type, data.duration);
            }

            // Power-Up Audio Logic
            if (this.audioManager) {
                if (data.type === 'vida' || data.type === 'health') {
                    this.audioManager.playSFX('powerupExtraLife');
                } else {
                    // Default for shields/weapons
                    this.audioManager.playSFX('powerup1');
                }
            }
        });

        // Usamos 'on' y verificamos duplicados manualmente para mayor seguridad
        this.events.off(EVENTS.LEVEL_FINISHED);
        this.events.on(EVENTS.LEVEL_FINISHED, () => {
            console.log('[GameScene] LEVEL_FINISHED received. Starting transition timer...');

            // Si ya estamos transicionando, ignorar
            if (this.isTransitioning) return;

            // Usar un timer con nombre para evitar cancelación accidental
            this.levelFinishTimer = this.time.addEvent({
                delay: 4000,
                callback: () => {
                    console.log('[GameScene] Timer finished. Calling goToNextLevel.');
                    this.goToNextLevel();
                },
                callbackScope: this
            });
        });

        // Listen for GAME_OVER unconditionally
        // This must override any level finished logic
        this.events.off(EVENTS.GAME_OVER); // Prevent duplicates
        this.events.once(EVENTS.GAME_OVER, () => {
            console.log('[GameScene] GAME_OVER event received.');
            this.handleGameOver();
        });

        // ESC key to pause
        this.input.keyboard.on('keydown-ESC', () => {
            if (!this.isGameOver) {
                this.pauseGame();
            }
        });

        // Fix: Pausar automáticamente si el usuario cambia de pestaña o minimiza
        this.onGameBlur = () => {
            if (!this.isGameOver && !this.scene.isPaused(SCENES.GAME)) {
                this.pauseGame();
            }
        };
        this.game.events.on('blur', this.onGameBlur);
    }

    /**
     * Pausa el juego.
     */
    pauseGame() {
        if (!this.scene.isActive(SCENES.GAME)) return;

        if (this.physics && this.physics.world) {
            this.physics.pause();
        }
        if (this.audioManager) {
            // Pausar música (reducir volumen)
            if (this.audioManager.currentMusic) {
                this.tweens.add({
                    targets: this.audioManager.currentMusic,
                    volume: this.audioManager.musicVolume * 0.3,
                    duration: 300
                });
            }
        }
        this.scene.launch(SCENES.PAUSE);
        this.scene.pause();

        // Escuchador para reanudar
        this.events.once('resume', () => {
            this.physics.resume();
            if (this.audioManager && this.audioManager.currentMusic) {
                this.tweens.add({
                    targets: this.audioManager.currentMusic,
                    volume: this.audioManager.musicVolume,
                    duration: 300
                });
            }
        });
    }

    /**
     * Maneja el estado de fin de juego (Game Over).
     * Muestra la pantalla de Game Over y detiene la lógica del juego.
     */
    handleGameOver() {
        // Priority Check: If level transition (fade out) has already started, ignore death (player 'escaped')
        if (this.isTransitioning) {
            console.log('[GameScene] Player died during transition - Ignoring Game Over.');
            return;
        }

        if (this.isGameOver) return;

        this.isGameOver = true;
        console.log('[GameScene] Handling Game Over...');

        // CRITICAL: Stop Level Finish Timer immediately to prevent 'Level Completed' overlap
        if (this.levelFinishTimer) {
            console.log('[GameScene] Cancelling Level Finish Timer.');
            this.levelFinishTimer.remove();
            this.levelFinishTimer = null;
        }

        // 1. Detener el mundo físico y el scroll
        this.physics.pause();
        this.bgScrollSpeed = 0;

        // 2. Desactivar al jugador por completo para evitar respawns fantasma
        if (this.player) {
            this.player.setActive(false);
            this.player.setVisible(false);
            if (this.player.body) this.player.body.enable = false;
            // Importante: cancelar cualquier temporizador de respawn pendiente
            this.time.removeAllEvents();
        }

        if (this.levelManager) this.levelManager.isLevelRunning = false;

        // 3. Audio: Detener música ABSOLUTAMENTE antes del Game Over SFX
        // "Stop All" fulminante como solicitado
        if (this.audioManager) {
            this.audioManager.stopAll(); // Silencio total inmediato
            // Pequeño delay dramático solo para el SFX
            this.time.delayedCall(100, () => {
                this.audioManager.playSFX('sfx_gameover', { volume: 0.8 });
            });
        }

        // 4. Comunicación con la UI
        this.events.emit('SHOW_GAME_OVER_PANEL');
        this.scene.launch(SCENES.UI, { gameOver: true });

        // 5. FAILSAFE DE TRANSICIÓN
        // Si tras 3 segundos no ha pasado nada (la escena UI no cargó o algo se colgó), forzamos.
        // Esto asegura que la pantalla de Game Over aparezca sí o sí.
        this.time.delayedCall(3000, () => {
            console.log('[GameScene] Failsafe: Ensuring Game Over UI is active.');
            if (this.scene.isActive(SCENES.GAME)) {
                // Ensure UI is up
                if (!this.scene.isActive(SCENES.UI)) {
                    this.scene.launch(SCENES.UI, { gameOver: true });
                }
                // Force pause explicitly if not already
                this.scene.pause(SCENES.GAME);
            }
        });
    }

    /**
     * Configura el fondo con tiles animados.
     * @param {Object} levelData - Datos del nivel actual.
     */
    setupBackground(levelData) {
        const bgKey = levelData && levelData.background ? levelData.background : 'bg_space_nebula';
        const scrollSpeed = levelData && levelData.bg_tile_speed ? levelData.bg_tile_speed : 2;

        // Crear TileSprite para fondo repetido
        // bg_nebula.png y bg_void.png son 16x16 pixels
        this.background = this.add.tileSprite(
            0, 0,
            this.scale.width * 2,
            this.scale.height * 2,
            bgKey
        )
            .setOrigin(0, 0)
            .setDepth(DEPTH.BACKGROUND);

        // Guardar velocidad de scroll
        this.bgScrollSpeed = scrollSpeed;
    }

    /**
     * Configura los grupos para varios objetos del juego (balas, enemigos, powerups).
     */
    setupGroups() {
        const groupConfig = { runChildUpdate: true };
        this.playerBullets = this.physics.add.group({ ...groupConfig, classType: Projectile, maxSize: 50 });
        this.enemies = this.physics.add.group({ ...groupConfig, classType: Enemy, maxSize: 20 });
        this.powerUps = this.physics.add.group({ ...groupConfig, classType: PowerUp, maxSize: 10 });
        this.bossGroup = this.physics.add.group({ ...groupConfig, classType: Boss, maxSize: 1 });
        this.enemiesBullets = this.physics.add.group({ ...groupConfig, classType: Projectile, maxSize: 100 });
    }

    /**
     * Configura la lógica de colisión y solapamiento entre las entidades del juego.
     */
    setupCollisions() {
        // ...
        // Colisiones jugador → enemigos
        this.physics.add.overlap(this.playerBullets, this.enemies, (bullet, enemy) => {
            if (bullet.active && enemy.active) {
                enemy.takeDamage(bullet.stats);
                bullet.kill();
            }
        });

        // Colisiones jugador → jefes
        this.physics.add.overlap(this.playerBullets, this.bossGroup, (bullet, boss) => {
            if (bullet.active && boss.active && !boss.isDead) {
                boss.takeDamage(bullet.stats);
                bullet.kill();
            }
        });

        // Colisiones enemigos → jugador
        this.physics.add.overlap(this.player, this.enemiesBullets, (player, bullet) => {
            if (bullet.active && !player.isDead) {
                player.takeDamage(bullet.stats);
                bullet.kill();
            }
        });

        // Colisiones powerups
        this.physics.add.overlap(this.player, this.powerUps, (player, pu) => {
            if (pu.active) pu.collect(player);
        });

        // Colisiones físicas jugador-enemigos
        this.physics.add.overlap(this.player, this.enemies, (player, enemy) => {
            if (enemy.active && !player.isDead) {
                player.takeDamage({ damage: 20, type: 'fisico' });
                enemy.die();
            }
        });

        // Colisiones físicas jugador-jefes
        this.physics.add.overlap(this.player, this.bossGroup, (player, boss) => {
            if (boss.active && !player.isDead && !boss.isDead) {
                player.takeDamage({ damage: 30, type: 'fisico' });
            }
        });
    }

    /**
     * Bucle principal de actualización.
     * @param {number} time - Tiempo actual del juego.
     * @param {number} delta - Tiempo delta desde el último frame.
     */
    update(time, delta) {
        // No actualizar si el juego ha terminado o está en transición
        if (this.isGameOver || this.isTransitioning) return;

        // Animar fondo
        if (this.background) {
            this.background.tilePositionX += this.bgScrollSpeed;
        }

        if (!this.player || this.player.isDead) return;

        this.player.update(this.cursors, time);
        if (this.levelManager) this.levelManager.update(time, delta);
        if (this.debugManager) this.debugManager.update();
    }

    /**
     * Lógica para la transición al siguiente nivel.
     * Maneja el desvanecimiento de la cámara y el reinicio del nivel.
     */
    goToNextLevel() {
        console.log('[GameScene] goToNextLevel called.');
        if (this.isTransitioning) {
            console.warn('[GameScene] Already transitioning. Ignoring call.');
            return;
        }

        this.isTransitioning = true;

        // Cancelar el timer si se disparó manualmente para evitar doble llamada
        if (this.levelFinishTimer) {
            this.levelFinishTimer.remove();
            this.levelFinishTimer = null;
        }

        if (this.player) {
            this.player.canShoot = false;
            if (!this.player.isDead) {
                this.player.hp = this.player.maxHp;
                // Actualizar UI inmediatamente
                const uiScene = this.scene.get(SCENES.UI);
                if (uiScene) {
                    uiScene.updateHealth({
                        current: this.player.hp,
                        max: this.player.maxHp
                    });
                }
            }
        }

        // Detener a todos los enemigos
        if (this.enemies) {
            this.enemies.children.entries.forEach(enemy => {
                if (enemy.active) {
                    enemy.body.setVelocity(0, 0);
                    enemy.setActive(false);
                }
            });
        }

        // Matar todas las balas enemigas
        if (this.enemiesBullets) {
            this.enemiesBullets.children.entries.forEach(bullet => {
                if (bullet.active) bullet.kill();
            });
        }

        // Desvanecer música (Fire and Forget - No esperar callback)
        if (this.audioManager) {
            this.audioManager.stopMusic(500);
        }

        // La transición depende EXCLUSIVAMENTE de la cámara, no del audio
        this.cameras.main.fadeOut(1000, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.finalizeLevelTransition();
        });
    }

    /**
     * Finaliza la transición del nivel, cambiando al siguiente mapa o volviendo al menú.
     */
    finalizeLevelTransition() {
        // Mapa de progresión de niveles
        const levelProgression = {
            'level_1': 'level_2',
            'level_2': 'level_3',
            'level_3': 'level_4',
            'level_4': 'level_5',
            'level_5': 'level_6',
            'level_6': 'level_7',
            'level_7': null // Final del juego
        };

        const nextLevel = levelProgression[this.currentLevelKey];

        if (nextLevel === null) {
            // Si terminamos el nivel 7, volvemos al menú principal con victoria
            this.scene.stop(SCENES.UI);
            this.scene.start(SCENES.MENU, { victory: true });
        } else {
            // Limpiar audio STRICTLY antes de cambiar nivel
            if (this.audioManager) {
                this.audioManager.stopAll();
                this.audioManager.destroy();
            } else {
                this.sound.stopAll();
            }

            this.scene.restart({ levelKey: nextLevel });
        }
    }

    /**
     * Intenta spawnear un power-up en la posición dada.
     * @param {number} x - Posición horizontal.
     * @param {number} y - Posición vertical.
     */
    trySpawnPowerUp(x, y) {
        if (!this.powerUps || !this.player) return;

        // Probabilidad basada en la estadística de suerte del jugador
        const luck = this.player.currentStats.luck || 15;
        const roll = Phaser.Math.Between(1, 100);

        if (roll <= luck) {
            const powerupData = this.cache.json.get('powerups');
            if (!powerupData) return;

            // Obtener todas las claves de powerups disponibles
            const keys = Object.keys(powerupData);
            if (keys.length === 0) return;

            // Seleccionar uno al azar
            const randomKey = Phaser.Utils.Array.GetRandom(keys);

            // Obtener del pool
            const powerup = this.powerUps.get();
            if (powerup) {
                powerup.spawn(x, y, randomKey);
            }
        }
    }

    /**
     * Limpieza cuando la escena se cierra o se reinicia.
     */
    shutdown() {
        // Stop all running tweens to prevent callbacks on destroyed objects
        this.tweens.killAll();

        // Limpieza al cerrar la escena
        if (this.audioManager) {
            this.audioManager.destroy();
        }

        if (this.debugManager) {
            this.debugManager.destroy();
            this.debugManager = null;
        }

        // Limpiar evento global para evitar duplicados al reiniciar
        if (this.onGameBlur) {
            this.game.events.off('blur', this.onGameBlur);
        }
    }
}
