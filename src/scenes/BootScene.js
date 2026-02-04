import { SCENES } from '../core/Constants.js';
import SettingsManager from '../core/SettingsManager.js';

/**
 * @class BootScene
 * @extends Phaser.Scene
 * @description Punto de entrada. Precarga assets y prepara el motor de configuración.
 */
export default class BootScene extends Phaser.Scene {
    constructor() {
        super(SCENES.BOOT);
    }

    preload() {
        const { width, height } = this.cameras.main;

        // --- Interfaz de Carga "Phoenix Style" ---
        const guiColor = 0x00f2ff; // Cian neón
        
        const progressBox = this.add.graphics()
            .fillStyle(0x0b0e14, 0.9)
            .lineStyle(2, guiColor, 0.5)
            .strokeRect(width / 2 - 162, height / 2 - 27, 324, 54)
            .fillRect(width / 2 - 160, height / 2 - 25, 320, 50);

        const progressBar = this.add.graphics();
        
        const loadingText = this.make.text({
            x: width / 2,
            y: height / 2 - 50,
            text: 'INITIALIZING SYSTEMS...',
            style: { font: '14px monospace', fill: '#00f2ff' }
        }).setOrigin(0.5);

        this.load.on('progress', (value) => {
            progressBar.clear()
                .fillStyle(guiColor, 1)
                .fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30);
            loadingText.setText(`SYNCING DATA: ${Math.round(value * 100)}%`);
        });

        // Manejo de errores de carga
        this.load.on('loaderror', (file) => {
            console.error(`🚨 Fallo crítico en: ${file.src}`);
        });

        // 1. --- DATA CORE ---
        this.load.json('player', 'assets/data/player.json');
        this.load.json('enemies', 'assets/data/enemies.json');
        this.load.json('weapons', 'assets/data/weapons.json');
        this.load.json('levels', 'assets/data/levels.json');
        this.load.json('blocks', 'assets/data/blocks.json');
        this.load.json('powerups', 'assets/data/powerups.json');
        this.load.json('bosses', 'assets/data/bosses.json');

        // 2. --- SPRITES & FX ASSETS ---
        // Fondos
        this.load.image('bg_intro', 'assets/sprites/bg-intro.png');
        this.load.image('bg_gameover', 'assets/sprites/bg-gameover.png');
        
        // Entidades
        this.load.image('ship', 'assets/sprites/ship.png');
        this.load.image('enemy1', 'assets/sprites/enemy1.png');
        this.load.image('enemy2', 'assets/sprites/enemy2.png');
        this.load.image('enemy3', 'assets/sprites/enemy3.png');

        // Bosses
        this.load.image('boss_1', 'assets/sprites/boss_void_reaver.png');
        this.load.image('boss_2', 'assets/sprites/boss_nebula_titan.png');

        // Projectiles
        this.load.image('shot-hero', 'assets/sprites/shot.png');
        this.load.image('shot-enemy', 'assets/sprites/shot-enemy.png');

        // FX Engine Necessities
        this.load.image('flare', 'assets/sprites/flare.png');
        this.load.image('shield_aura', 'assets/sprites/vida.png'); // Reutilizando para el aura de escudo
        this.load.image('particle_smoke', 'assets/sprites/flare.png'); // Para el motor dañado

        // UI
        this.load.image('vida', 'assets/sprites/vida.png');
        this.load.image('powerup_orb', 'assets/sprites/powerup_orb.png');

        // 3. --- AUDIO ---
        this.load.audio('intro_music', 'assets/sound/intro.ogg');
        this.load.audio('level1_music', 'assets/sound/level1.ogg');
        this.load.audio('sfx_shot', 'assets/sound/shot.ogg');
        this.load.audio('sfx_enemy_explosion', 'assets/sound/enemy-explosion.ogg');
        this.load.audio('sfx_player_explode', 'assets/sound/boss-explosion.ogg'); // Usado en PlayerHealth
    }

    create() {
        console.log("🚀 Phoenix Engine: Online. Procediendo al menú.");

        // Inicializar Gestor de Configuración
        this.game.settings = new SettingsManager(this.game);
        this.game.settings.applySettings();

        // Pequeño efecto de desvanecimiento antes de cambiar de escena
        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start(SCENES.MENU);
        });
    }
}
