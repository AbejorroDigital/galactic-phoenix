import { EVENTS, SCENES } from '../core/Constants.js';

/**
 * @class UIScene
 * @description Gestiona el HUD y los paneles de estado. 
 * Adaptado para leer la configuración de player.json y soportar ZenDots.
 */
export default class UIScene extends Phaser.Scene {
    constructor() {
        super(SCENES.UI);
        this.score = 0;
    }

    create() {
        const gameScene = this.scene.get(SCENES.GAME);
        const playerData = this.cache.json.get('player')?.player;

        // --- 1. ESTADO INICIAL ---
        this.score = 0;
        this.currentLives = playerData?.lives || 5;

        // --- 2. ELEMENTOS VISUALES (HUD) ---
        // Contenedor de Salud
        this.add.text(20, 35, 'HULL INTEGRITY', {
            fontSize: '12px', fontFamily: 'ZenDots, monospace', color: '#00ffff'
        });
        this.healthBar = this.add.graphics();

        // Texto de Score con estilo futurista
        this.scoreText = this.add.text(20, 20, 'SCORE: 000000', {
            fontSize: '22px', 
            fontFamily: 'ZenDots, monospace', 
            color: '#ffffff',
            stroke: '#00fbff',
            strokeThickness: 1
        });

        // Vidas con color según la salud del sistema
        this.livesText = this.add.text(20, 80, `LIVES: ${this.currentLives}`, {
            fontSize: '18px', fontFamily: 'ZenDots, monospace', color: '#00ff00'
        });

        // Luck y Weapon (Esquina superior derecha)
        const luckValue = playerData?.luck || 15;
        this.luckText = this.add.text(this.scale.width - 20, 45, `LUCK: ${luckValue}`, {
            fontSize: '14px', fontFamily: 'ZenDots, monospace', color: '#00ff00'
        }).setOrigin(1, 0);

        this.powerupText = this.add.text(this.scale.width - 20, 20, '', {
            fontSize: '16px', fontFamily: 'ZenDots, monospace', color: '#ffff00'
        }).setOrigin(1, 0).setVisible(false);

        // --- 3. PANELES DE ESTADO ---
        this.createVictoryPanel();
        this.createGameOverPanel();

        // --- 4. LISTENERS (COMUNICACIÓN CON GAMESCENE) ---
        gameScene.events.on(EVENTS.PLAYER_HIT, this.updateHealth, this);
        gameScene.events.on(EVENTS.PLAYER_HEAL, this.updateHealth, this);
        
        gameScene.events.on(EVENTS.SCORE_CHANGE, (points) => {
            this.score += points;
            this.scoreText.setText(`SCORE: ${this.score.toString().padStart(6, '0')}`);
        }, this);

        gameScene.events.on(EVENTS.WEAPON_CHANGE, this.updateWeapon, this);
        gameScene.events.on(EVENTS.LIFE_CHANGE, this.updateLives, this);

        gameScene.events.on(EVENTS.LEVEL_FINISHED, this.showVictoryScreen, this);
        gameScene.events.on(EVENTS.GAME_OVER, this.showGameOverScreen, this);

        // Inicializar barra de vida con datos de player.json
        if (playerData) {
            this.updateHealth({ current: playerData.hp, max: playerData.max_hp });
        }
    }

    updateHealth(data) {
        const { current, max } = data;
        const percent = Phaser.Math.Clamp(current / max, 0, 1);
        
        this.healthBar.clear();

        // Glow effect (opcional, sombra de la barra)
        this.healthBar.fillStyle(0x00ffff, 0.2);
        this.healthBar.fillRect(18, 53, 204, 24);

        // Fondo de la barra
        this.healthBar.fillStyle(0x222222).fillRect(20, 55, 200, 20);

        // Color dinámico (Cian -> Amarillo -> Rojo)
        let color = 0x00ffff;
        if (percent < 0.6) color = 0xffff00;
        if (percent < 0.3) color = 0xff0000;

        this.healthBar.fillStyle(color).fillRect(20, 55, 200 * percent, 20);
        
        // Brillo superior
        this.healthBar.fillStyle(0xffffff, 0.3).fillRect(20, 55, 200 * percent, 5);
    }

    updateLives(lives) {
        this.currentLives = lives;
        this.livesText.setText(`LIVES: ${lives}`);
        // Cambiar color si queda 1 vida
        this.livesText.setColor(lives <= 1 ? '#ff0000' : '#00ff00');
    }

    updateWeapon(weaponName) {
        if (weaponName && !weaponName.toLowerCase().includes('basic')) {
            this.powerupText.setText(`SYSTEM: ${weaponName.toUpperCase()}`);
            this.powerupText.setVisible(true);
        } else {
            this.powerupText.setVisible(false);
        }
    }

    createVictoryPanel() {
        const { width, height } = this.cameras.main;
        this.victoryPanel = this.add.container(0, 0).setDepth(100).setVisible(false);
        
        const bg = this.add.rectangle(width/2, height/2, width, height, 0x000000, 0.8);
        const text = this.add.text(width/2, height/2, 'MISSION ACCOMPLISHED', {
            fontSize: '40px', fontFamily: 'ZenDots, monospace', color: '#00ffff'
        }).setOrigin(0.5);

        this.victoryPanel.add([bg, text]);
    }

    createGameOverPanel() {
        const { width, height } = this.cameras.main;
        this.gameOverPanel = this.add.container(0, 0).setDepth(100).setVisible(false);

        const bg = this.add.rectangle(width/2, height/2, width, height, 0x000000, 0.9);
        
        this.add.text(width/2, height/2 - 50, 'SYSTEM FAILURE', {
            fontSize: '50px', fontFamily: 'ZenDots, monospace', color: '#ff0000'
        }).setOrigin(0.5).setParentContainer(this.gameOverPanel);

        this.finalScoreText = this.add.text(width/2, height/2 + 20, '', {
            fontSize: '20px', fontFamily: 'ZenDots, monospace', color: '#ffffff'
        }).setOrigin(0.5).setParentContainer(this.gameOverPanel);

        const btn = this.add.text(width/2, height/2 + 100, 'REBOOT SYSTEM (RETURN TO MENU)', {
            fontSize: '16px', fontFamily: 'ZenDots, monospace', color: '#00ffff'
        }).setOrigin(0.5)
          .setInteractive({ useHandCursor: true })
          .on('pointerdown', () => {
              this.scene.stop(SCENES.GAME);
              this.scene.start(SCENES.MENU);
          });

        this.gameOverPanel.add([bg, btn]);
    }

    showVictoryScreen() { this.victoryPanel.setVisible(true); }

    showGameOverScreen() {
        this.finalScoreText.setText(`TOTAL SCORE: ${this.score}`);
        this.gameOverPanel.setVisible(true);
    }
}
