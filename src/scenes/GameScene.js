import { DEPTH, EVENTS, SCENES } from '../core/Constants.js';
// import ExplosionEffect from '../effects/ExplosionEffect.js'; // REEMPLAZADO POR FX ENGINE
import GalacticPhoenixFX from '../core/Galactic-Phoenix-FX-Engine.js'; // NUEVO MOTOR FX
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
 * Integra el motor GalacticPhoenixFX para gestión visual y auditiva avanzada.
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
        /** @type {GalacticPhoenixFX} */
        this.fx = null;
    }

    /**
     * Inicializa los datos de la escena.
     * @param {Object} data - Datos pasados desde la escena anterior.
     */
    init(data) {
        if (data && data.levelKey) {
            this.currentLevelKey = data.levelKey;
        }
        this.isGameOver = false;
    }

    /**
     * Método del ciclo de vida de Phaser.
     */
    create() {
        // --- 1. CONFIGURACIÓN INICIAL Y LIMPIEZA ---
        this.events.removeAllListeners(EVENTS.LEVEL_FINISHED);
        this.events.removeAllListeners(EVENTS.ENEMY_DESTROYED);
        this.events.removeAllListeners(EVENTS.GAME_OVER);

        // Reset UI Panels
        const uiScene = this.scene.get(SCENES.UI);
        if (uiScene) {
            if (uiScene.victoryPanel) uiScene.victoryPanel.setVisible(false);
            if (uiScene.gameOverPanel) uiScene.gameOverPanel.setVisible(false);
        }

        // --- 2. CARGA DE DATOS Y FONDO ---
        const levelData = this.cache.json.get('levels')[this.currentLevelKey];
        this.setupBackground(levelData);

        // --- 3. INICIALIZAR MOTORES (AUDIO Y FX) ---
        this.audioManager = new AudioManager(this);
        if (levelData && levelData.music) {
            this.audioManager.playMusic(levelData.music, true, 1500);
        }

        // INICIALIZAR GALACTIC PHOENIX FX ENGINE
        this.fx = new GalacticPhoenixFX(this);
        
        // Configurar atmósfera basada en el nivel (extraer número del string 'level_X')
        const levelIndex = parseInt(this.currentLevelKey.replace('level_', '')) || 1;
        this.fx.updateAtmosphereForLevel(levelIndex);

        // --- 4. CONFIGURACIÓN DE ENTIDADES ---
        this.cursors = this.input.keyboard.createCursorKeys();
        this.setupGroups();

        const playerData = this.cache.json.get('player');
        const spawn = playerData?.player?.spawn_position || { x: 100, y: 300 };
        this.player = new Player(this, spawn.x, spawn.y);

        if (!this.scene.isActive(SCENES.UI)) {
            this.scene.launch(SCENES.UI);
        }

        if (this.lives === undefined) this.lives = 3;
        this.isTransitioning = false;

        // --- 5. GESTORES DE JUEGO ---
        this.levelManager = new LevelManager(this);
        this.levelManager.init(this.currentLevelKey);
        this.setupCollisions();

        // --- 6. GESTIÓN DE EVENTOS (INTEGRACIÓN FX) ---
        
        // Evento: Enemigo destruido
        this.events.on(EVENTS.ENEMY_DESTROYED, (x, y, isBoss) => {
            if (isBoss) {
                // Secuencia dramática para el jefe
                this.fx.bigBang(x, y);
                this.fx.chainReaction(x, y, 8); // 8 explosiones secundarias
                // El FX Engine ya maneja el sonido, pero si quieres refuerzo:
                // this.audioManager.playSFX('sfx_boss_explosion', { volume: 0.8 });
            } else {
                // Variedad aleatoria para enemigos comunes
                const rand = Phaser.Math.Between(0, 2);
                if (rand === 0) this.fx.standard(x, y);
                else if (rand === 1) this.fx.plasma(x, y);
                else this.fx.mechanicalFailure(x, y);
            }
        });

        this.events.once(EVENTS.LEVEL_FINISHED, () => {
            this.fx.levelUp(this.player.x, this.player.y); // Efecto visual de victoria
            this.time.delayedCall(2000, () => this.goToNextLevel());
        });

        this.events.once(EVENTS.GAME_OVER, () => {
            this.handleGameOver();
        });

        // --- 7. INPUTS Y PAUSA ---
        this.input.keyboard.on('keydown-ESC', () => {
            if (!this.isGameOver) this.pauseGame();
        });

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
        if (this.audioManager && this.audioManager.currentMusic) {
            this.tweens.add({
                targets: this.audioManager.currentMusic,
                volume: this.audioManager.musicVolume * 0.3,
                duration: 300
            });
        }
        this.scene.launch(SCENES.PAUSE);
        this.scene.pause();

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
     */
    handleGameOver() {
        if (this.isGameOver) return;
        this.isGameOver = true;
        
        this.physics.pause();
        this.bgScrollSpeed = 0;

        // Efectos FX de Game Over
        if (this.fx) {
            this.fx.applyDistortion(2000, 2.0); // Distorsión fuerte
            this.fx.mechanicalFailure(this.player.x, this.player.y); // Explosión de la nave
        }

        if (this.player) {
            this.player.setActive(false);
            this.player.setVisible(false);
            if (this.player.body) this.player.body.enable = false;
            this.time.removeAllEvents(); 
        }

        if (this.levelManager) this.levelManager.isLevelRunning = false;
        
        if (this.audioManager) {
            this.audioManager.stopMusic(500);
            this.audioManager.playSFX('sfx_gameover', { volume: 0.8 });
        }

        this.events.emit('SHOW_GAME_OVER_PANEL');
    }

    /**
     * Configura el fondo con tiles animados.
     */
    setupBackground(levelData) {
        const bgKey = levelData && levelData.background ? levelData.background : 'bg_space_nebula';
        const scrollSpeed = levelData && levelData.bg_tile_speed ? levelData.bg_tile_speed : 2;

        this.background = this.add.tileSprite(
            0, 0,
            this.scale.width * 2,
            this.scale.height * 2,
            bgKey
        )
            .setOrigin(0, 0)
            .setDepth(DEPTH.BACKGROUND);

        this.bgScrollSpeed = scrollSpeed;
    }

    /**
     * Configura los grupos para varios objetos del juego.
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
     * Configura la lógica de colisión y solapamiento.
     */
    setupCollisions() {
        // Colisiones jugador → enemigos
        this.physics.add.overlap(this.playerBullets, this.enemies, (bullet, enemy) => {
            if (bullet.active && enemy.active) {
                // Pequeño efecto de impacto en el enemigo
                this.fx.sparks(bullet.x, bullet.y);
                enemy.takeDamage(bullet.stats);
                bullet.kill();
            }
        });

        // Colisiones jugador → jefes
        this.physics.add.overlap(this.playerBullets, this.bossGroup, (bullet, boss) => {
            if (bullet.active && boss.active && !boss.isDead) {
                this.fx.sparks(bullet.x, bullet.y);
                boss.takeDamage(bullet.stats);
                bullet.kill();
            }
        });

        // Colisiones enemigos → jugador
        this.physics.add.overlap(this.player, this.enemiesBullets, (player, bullet) => {
            if (bullet.active && !player.isDead) {
                // Efecto visual de daño al jugador
                this.fx.sparks(player.x, player.y);
                this.cameras.main.shake(100, 0.01); // Shake ligero
                
                player.takeDamage(bullet.stats);
                bullet.kill();
            }
        });

        // Colisiones powerups
        this.physics.add.overlap(this.player, this.powerUps, (player, pu) => {
            if (pu.active) {
                // FX de recolección
                this.fx.weaponUpgrade(pu.x, pu.y); 
                pu.collect(player);
            }
        });

        // Colisiones físicas jugador-enemigos (choque directo)
        this.physics.add.overlap(this.player, this.enemies, (player, enemy) => {
            if (enemy.active && !player.isDead) {
                this.fx.mechanicalFailure(player.x, player.y); // Efecto de choque
                player.takeDamage({ damage: 20, type: 'fisico' });
                enemy.die();
            }
        });

        // Colisiones físicas jugador-jefes
        this.physics.add.overlap(this.player, this.bossGroup, (player, boss) => {
            if (boss.active && !player.isDead && !boss.isDead) {
                this.fx.mechanicalFailure(player.x, player.y);
                player.takeDamage({ damage: 30, type: 'fisico' });
            }
        });
    }

    /**
     * Bucle principal de actualización.
     */
    update(time, delta) {
        if (this.isGameOver || this.isTransitioning) return;

        if (this.background) {
            this.background.tilePositionX += this.bgScrollSpeed;
        }

        if (!this.player || this.player.isDead) return;

        this.player.update(this.cursors, time);
        if (this.levelManager) this.levelManager.update(time, delta);
    }

    /**
     * Lógica para la transición al siguiente nivel.
     */
    goToNextLevel() {
        this.isTransitioning = true;
        
        // Efecto Warp/Velocidad visual (opcional si lo agregas al FX engine)
        // this.fx.starField(2000); // Acelerar estrellas

        if (this.player) {
            this.player.canShoot = false;
            if (!this.player.isDead) {
                this.player.hp = this.player.maxHp;
                const uiScene = this.scene.get(SCENES.UI);
                if (uiScene) {
                    uiScene.updateHealth({
                        current: this.player.hp,
                        max: this.player.maxHp
                    });
                }
            }
        }

        // Limpieza de entidades
        if (this.enemies) {
            this.enemies.children.entries.forEach(enemy => {
                if (enemy.active) {
                    enemy.body.setVelocity(0, 0);
                    enemy.setActive(false);
                }
            });
        }

        if (this.enemiesBullets) {
            this.enemiesBullets.children.entries.forEach(bullet => {
                if (bullet.active) bullet.kill();
            });
        }

        if (this.audioManager) {
            this.audioManager.stopMusic(500);
        }

        this.cameras.main.fadeOut(1000, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.finalizeLevelTransition();
        });
    }

    /**
     * Finaliza la transición del nivel.
     */
    finalizeLevelTransition() {
        // Limpiar el clima actual para evitar que persista en el menú o carga
        if (this.fx && this.fx.currentWeather) {
            this.fx.currentWeather.destroy();
        }

        if (this.currentLevelKey === 'level_2') {
            this.scene.stop(SCENES.UI);
            this.scene.start(SCENES.MENU);
        } else {
            const nextLevel = 'level_2';
            if (this.audioManager && this.audioManager.destroy) {
                this.audioManager.destroy();
            }
            this.scene.restart({ levelKey: nextLevel });
        }
    }

    /**
     * Intenta spawnear un power-up.
     */
    trySpawnPowerUp(x, y) {
        if (!this.powerUps || !this.player) return;

        const luck = this.player.currentStats.luck || 15;
        const roll = Phaser.Math.Between(1, 100);

        if (roll <= luck) {
            const powerupData = this.cache.json.get('powerups');
            if (!powerupData) return;

            const keys = Object.keys(powerupData);
            if (keys.length === 0) return;

            const randomKey = Phaser.Utils.Array.GetRandom(keys);
            const powerup = this.powerUps.get();
            if (powerup) {
                // Efecto visual al aparecer el item
                this.fx.extraLife(x, y); 
                powerup.spawn(x, y, randomKey);
            }
        }
    }

    /**
     * Limpieza cuando la escena se cierra o se reinicia.
     */
    shutdown() {
        if (this.audioManager) {
            this.audioManager.destroy();
        }
        // Asegurar que el FX Engine limpie sus listeners o shaders
        if (this.fx && this.fx.currentWeather) {
            this.fx.currentWeather.destroy();
        }
        if (this.onGameBlur) {
            this.game.events.off('blur', this.onGameBlur);
        }
    }
}
