import { SCENES } from '../core/Constants.js';
import SettingsManager from '../core/SettingsManager.js';

/**
 * @class BootScene
 * @extends Phaser.Scene
 * @description El punto de entrada del juego. Responsable de precargar todos los recursos (assets),
 * incluyendo archivos JSON de datos, sprites y archivos de audio. Muestra una barra de progreso durante la carga.
 */
export default class BootScene extends Phaser.Scene {
    constructor() {
        super(SCENES.BOOT);
    }

    /**
     * Método del ciclo de vida de Phaser. Maneja la precarga de recursos y la interfaz de usuario de progreso.
     */
    preload() {
        // ... (lógica de precarga igual)
        const { width, height } = this.cameras.main;

        // --- Interfaz de Carga ---
        const progressBox = this.add.graphics()
            .fillStyle(0x0b0e14, 0.8)
            .fillRect(width / 2 - 160, height / 2 - 25, 320, 50);

        const progressBar = this.add.graphics();

        this.load.on('progress', (value) => {
            progressBar.clear()
                .fillStyle(0x00f2ff, 1)
                .fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30);
        });

        this.load.on('loaderror', (file) => {
            console.warn(`🚨 Error en radar: No se encontró el asset ${file.src}`);
        });

        // 1. --- DATA CORE ---
        this.load.json('player', 'assets/data/player.json');
        this.load.json('enemies', 'assets/data/enemies.json');
        this.load.json('weapons', 'assets/data/weapons.json');
        this.load.json('levels', 'assets/data/levels.json');
        this.load.json('blocks', 'assets/data/blocks.json');
        this.load.json('powerups', 'assets/data/powerups.json');
        this.load.json('bosses', 'assets/data/bosses.json');

        // 2. --- SPRITES ---
        this.load.image('bg_intro', 'assets/sprites/bg-intro.png');
        this.load.image('bg_gameover', 'assets/sprites/bg-gameover.png');
        this.load.image('bg_block', 'assets/sprites/bg-block.png');
        this.load.image('bg_block2', 'assets/sprites/bg-block2.png');

        // Bosses
        this.load.image('boss_1', 'assets/sprites/doggusano-boss.png');
        this.load.image('boss_2', 'assets/sprites/boss_nebula_titan.png');
        this.load.image('boss_void_reaver', 'assets/sprites/boss_void_reaver.png');
        this.load.image('boss_nebula_titan', 'assets/sprites/boss_nebula_titan.png');

        // Projectiles
        this.load.image('shot-hero', 'assets/sprites/shot.png');
        this.load.image('shot-enemy', 'assets/sprites/shot-enemy.png');
        this.load.image('shot-special', 'assets/sprites/shot-special.png');
        this.load.image('shot-special2', 'assets/sprites/shot-special2.png');

        // Effects & UI
        this.load.image('flare', 'assets/sprites/flare.png');
        this.load.image('vida', 'assets/sprites/vida.png');
        this.load.image('powerup_orb', 'assets/sprites/powerup_orb.png');
        this.load.image('powerup_box', 'assets/sprites/powerup_box.png');

        // Entities - Using images instead of spritesheets if they aren't animated yet, 
        // but keeping keys as expected by other classes.
        this.load.image('ship', 'assets/sprites/ship.png');
        this.load.image('enemy1', 'assets/sprites/enemy1.png');
        this.load.image('enemy2', 'assets/sprites/enemy2.png');
        this.load.image('enemy3', 'assets/sprites/enemy3.png');

        // 3. --- AUDIO ---
        this.load.audio('intro_music', 'assets/sound/intro.ogg');
        this.load.audio('level1_music', 'assets/sound/level1.ogg');
        this.load.audio('level2_music', 'assets/sound/level2.ogg');
        this.load.audio('sfx_shot', 'assets/sound/shot.ogg');
        this.load.audio('sfx_enemy_explosion', 'assets/sound/enemy-explosion.ogg');
        this.load.audio('sfx_boss_explosion', 'assets/sound/boss-explosion.ogg');
        this.load.audio('sfx_gameover', 'assets/sound/gameover.ogg');
        this.load.audio('sfx_pickup', 'assets/sound/shot.ogg'); // Fallback if pickup not found
    }

    /**
     * Método del ciclo de vida de Phaser. Transiciona a MenuScene una vez finalizada la carga.
     */
    create() {
        console.log("🚀 Todos los sistemas cargados. Iniciando secuencia...");

        // Inicializar Gestor de Configuración
        this.game.settings = new SettingsManager(this.game);
        this.game.settings.applySettings();

        this.scene.start(SCENES.MENU); // CHANGED: Start at menu instead of game
    }
}
