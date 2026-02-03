import { DEPTH, EVENTS, SCENES } from '../core/Constants.js';
import ExplosionEffect from '../effects/ExplosionEffect.js';
import Boss from '../entities/Boss.js';
import Enemy from '../entities/Enemy.js';
import Player from '../entities/Player.js';
import PowerUp from '../entities/PowerUp.js';
import Projectile from '../entities/Projectile.js';
import AudioManager from '../managers/AudioManager.js';
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
                this.audioManager.playSFX('sfx_boss_explosion', { volume: 0.8 });
            } else {
                ExplosionEffect.createSmallExplosion(this, x, y);
                this.audioManager.playSFX('sfx_enemy_explosion', { volume: 0.4 });
            }
        });

        this.events.once(EVENTS.LEVEL_FINISHED, () => {
            this.time.delayedCall(2000, () => this.goToNextLevel());
        });

        this.events.once(EVENTS.GAME_OVER, () => {
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
        this.physics.pause();
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
    if (this.isGameOver) return;

    this.isGameOver = true;
    
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
    
    // 3. Audio: Detener música y lanzar efecto de derrota
    if (this.audioManager) {
        this.audioManager.stopMusic(500);
        this.audioManager.playSFX('sfx_gameover', { volume: 0.8 });
    }

    // 4. Comunicación con la UI
    // En lugar de launch (que puede fallar si ya está activa), usamos events
    this.events.emit('SHOW_GAME_OVER_PANEL'); 
    
    // O si prefieres mantener el sistema de paso de datos, asegúrate de que UIScene escuche 'wake'
    this.scene.launch(SCENES.UI, { gameOver: true });
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
    }

    /**
     * Lógica para la transición al siguiente nivel.
     * Maneja el desvanecimiento de la cámara y el reinicio del nivel.
     */
    goToNextLevel() {
        this.isTransitioning = true;

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

        // Desvanecer música
        if (this.audioManager) {
            this.audioManager.stopMusic(500);
        }

        this.cameras.main.fadeOut(1000, 0, 0, 0);
        if (this.cameras.main.once) {
            this.cameras.main.once('camerafadeoutcomplete', () => {
                this.finalizeLevelTransition();
            });
        } else {
            // Fallback para mocks de test
            this.finalizeLevelTransition();
        }
    }

    /**
     * Finaliza la transición del nivel, cambiando al siguiente mapa o volviendo al menú.
     */
    finalizeLevelTransition() {
        if (this.currentLevelKey === 'level_2') {
            // Si terminamos el nivel 2, volvemos al menú principal
            this.scene.stop(SCENES.UI);
            this.scene.start(SCENES.MENU);
        } else {
            // De lo contrario, pasamos al siguiente nivel (nivel 2)
            const nextLevel = 'level_2';

            // Limpiar audio antes de cambiar nivel
            if (this.audioManager && this.audioManager.destroy) {
                this.audioManager.destroy();
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
        // Limpieza al cerrar la escena
        if (this.audioManager) {
            this.audioManager.destroy();
        }
        // Limpiar evento global para evitar duplicados al reiniciar
        if (this.onGameBlur) {
            this.game.events.off('blur', this.onGameBlur);
        }
    }
}
