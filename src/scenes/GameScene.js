import { DEPTH, EVENTS, SCENES } from '../core/Constants.js';
import GalacticPhoenixFX from '../core/Galactic-Phoenix-FX-Engine.js';
import Boss from '../entities/Boss.js';
import Enemy from '../entities/Enemy.js';
import Player from '../entities/Player.js';
import PowerUp from '../entities/PowerUp.js';
import Projectile from '../entities/Projectile.js';
import AudioManager from '../managers/AudioManager.js';
import LevelManager from '../managers/LevelManager.js';

/**
 * @class GameScene
 * @description Escena principal. Coordina entidades, colisiones y el motor FX.
 */
export default class GameScene extends Phaser.Scene {
    constructor() {
        super(SCENES.GAME);
        this.currentLevelKey = 'level_1';
        this.isGameOver = false;
        this.fx = null;
    }

    init(data) {
        if (data && data.levelKey) this.currentLevelKey = data.levelKey;
        this.isGameOver = false;
        this.isTransitioning = false;
    }

    create() {
        // --- 1. LIMPIEZA DE EVENTOS PREVIOS ---
        this.events.off(EVENTS.ENEMY_DESTROYED);
        this.events.off(EVENTS.LEVEL_FINISHED);
        this.events.off(EVENTS.GAME_OVER);

        // --- 2. MOTORES CORE ---
        this.fx = new GalacticPhoenixFX(this);
        this.audioManager = new AudioManager(this);

        // --- 3. DATOS DEL NIVEL Y FONDO ---
        const levels = this.cache.json.get('levels');
        const levelData = levels ? levels[this.currentLevelKey] : null;
        
        this.setupBackground(levelData);

        if (levelData?.music) {
            this.audioManager.playMusic(levelData.music, true, 1000);
        }

        // Configurar clima según nivel
        const levelNum = parseInt(this.currentLevelKey.split('_')[1]) || 1;
        this.fx.updateAtmosphereForLevel(levelNum);

        // --- 4. ENTIDADES Y GRUPOS ---
        this.setupGroups();
        this.cursors = this.input.keyboard.createCursorKeys();

        const playerData = this.cache.json.get('player');
        const spawn = playerData?.player?.spawn_position || { x: 100, y: 300 };
        this.player = new Player(this, spawn.x, spawn.y);

        // --- 5. GESTORES ---
        this.levelManager = new LevelManager(this);
        this.levelManager.init(this.currentLevelKey);
        this.setupCollisions();

        if (!this.scene.isActive(SCENES.UI)) this.scene.launch(SCENES.UI);

        // --- 6. ESCUCHA DE EVENTOS FX ---
        this.events.on(EVENTS.ENEMY_DESTROYED, (x, y, isBoss) => {
            if (isBoss) {
                this.fx.bigBang(x, y);
                this.fx.chainReaction(x, y, 6);
            } else {
                // Selección aleatoria de explosión
                const roll = Math.random();
                if (roll > 0.7) this.fx.plasma(x, y);
                else if (roll > 0.4) this.fx.standard(x, y);
                else this.fx.mechanicalFailure(x, y);
            }
        });

        this.events.once(EVENTS.GAME_OVER, () => this.handleGameOver());
        
        this.events.once(EVENTS.LEVEL_FINISHED, () => {
            this.fx.levelUp(this.player.x, this.player.y);
            this.time.delayedCall(2000, () => this.goToNextLevel());
        });
    }

    /**
     * Arreglo del fondo: Usa un fallback si la textura no existe.
     */
    setupBackground(levelData) {
        // En BootScene cargamos 'bg_block', lo usamos de fallback
        const bgKey = levelData?.background || 'bg_block';
        const scrollSpeed = levelData?.bg_tile_speed || 2;

        // Si la textura no existe en el cache, forzamos la que sí tenemos
        const finalKey = this.textures.exists(bgKey) ? bgKey : 'bg_block';

        if (this.background) this.background.destroy();

        this.background = this.add.tileSprite(0, 0, this.scale.width, this.scale.height, finalKey)
            .setOrigin(0, 0)
            .setDepth(DEPTH.BACKGROUND);

        this.bgScrollSpeed = scrollSpeed;
    }

    setupGroups() {
        const config = { runChildUpdate: true };
        this.playerBullets = this.physics.add.group({ ...config, classType: Projectile });
        this.enemiesBullets = this.physics.add.group({ ...config, classType: Projectile });
        this.enemies = this.physics.add.group({ ...config, classType: Enemy });
        this.powerUps = this.physics.add.group({ ...config, classType: PowerUp });
        this.bossGroup = this.physics.add.group({ ...config, classType: Boss });
    }

    setupCollisions() {
        // Balas Jugador -> Enemigos
        this.physics.add.overlap(this.playerBullets, [this.enemies, this.bossGroup], (bullet, target) => {
            if (bullet.active && target.active) {
                this.fx.sparks(bullet.x, bullet.y);
                target.takeDamage(bullet.stats);
                bullet.kill();
            }
        });

        // Balas Enemigas -> Jugador
        this.physics.add.overlap(this.player, this.enemiesBullets, (player, bullet) => {
            if (bullet.active && !player.isDead) {
                this.fx.sparks(bullet.x, bullet.y);
                player.takeDamage(bullet.stats);
                bullet.kill();
            }
        });

        // Jugador -> PowerUps
        this.physics.add.overlap(this.player, this.powerUps, (player, pu) => {
            if (pu.active) {
                this.fx.weaponUpgrade(pu.x, pu.y);
                pu.collect(player);
            }
        });
    }

    /**
     * FIX: Se cambió 'extraLife' por 'orbitalRing' que sí existe en el motor.
     */
    trySpawnPowerUp(x, y) {
        if (!this.powerUps || this.isGameOver) return;

        const luck = this.player?.currentStats?.luck || 15;
        if (Phaser.Math.Between(1, 100) <= luck) {
            const powerup = this.powerUps.get();
            if (powerup) {
                const powerupData = this.cache.json.get('powerups');
                const keys = Object.keys(powerupData || {});
                const type = keys.length > 0 ? Phaser.Utils.Array.GetRandom(keys) : 'heal';
                
                this.fx.orbitalRing(x, y); // Efecto visual de spawn
                powerup.spawn(x, y, type);
            }
        }
    }

    update(time, delta) {
        if (this.isGameOver || this.isTransitioning) return;

        if (this.background) {
            this.background.tilePositionX += this.bgScrollSpeed;
        }

        if (this.player?.active) {
            this.player.update(this.cursors, time);
        }

        this.levelManager?.update(time, delta);
    }

    handleGameOver() {
        if (this.isGameOver) return;
        this.isGameOver = true;
        this.physics.pause();
        
        this.fx.applyDistortion(2000, 2.0);
        this.audioManager.stopMusic(500);
        this.audioManager.playSFX('sfx_gameover');

        this.time.delayedCall(2000, () => {
            this.scene.stop(SCENES.UI);
            this.scene.start(SCENES.MENU);
        });
    }

    goToNextLevel() {
        this.isTransitioning = true;
        this.cameras.main.fadeOut(1000, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            const nextLevel = this.currentLevelKey === 'level_1' ? 'level_2' : 'level_1';
            this.scene.restart({ levelKey: nextLevel });
        });
    }
}
