import { EVENTS, SCENES } from '../core/Constants.js';

/**
 * @class UIScene
 * @extends Phaser.Scene
 * @description Handles the Heads-Up Display (HUD) and overlay panels.
 * Manages the score display, health bar, lives, and weapon status.
 * 
 * @listens EVENTS.PLAYER_HIT
 * @listens EVENTS.PLAYER_HEAL
 * @listens EVENTS.SCORE_CHANGE
 * @listens EVENTS.WEAPON_CHANGE
 * @listens EVENTS.LIFE_CHANGE
 * @listens EVENTS.LEVEL_FINISHED
 * @listens EVENTS.GAME_OVER
 */
export default class UIScene extends Phaser.Scene {
    constructor() {
        super(SCENES.UI);
        /** @type {number} */
        this.score = 0;
    }

    /**
     * Sets up UI elements and event listeners for game state updates.
     */
    create() {
        const gameScene = this.scene.get(SCENES.GAME);

        // UI Reset
        this.score = 0;
        this.lives = gameScene.lives || 3; // Get lives from GameScene

        /** @type {Phaser.GameObjects.Graphics} */
        this.healthBar = this.add.graphics();
        /** @type {Phaser.GameObjects.Text} */
        this.scoreText = this.add.text(20, 20, 'SCORE: 0', {
            fontSize: '20px', fontFamily: 'ZenDots', color: '#ffffff'
        });

        // Mostrar vidas
        this.livesText = this.add.text(20, 80, 'LIVES: 3', {
            fontSize: '18px', fontFamily: 'ZenDots', color: '#00ff00'
        });

        // Powerup y Luck display (initially hidden for basic weapon)
        this.powerupText = this.add.text(620, 20, '', {
            fontSize: '16px', fontFamily: 'ZenDots', color: '#ffff00'
        });
        this.powerupText.setVisible(false);

        this.luckText = this.add.text(620, 45, 'LUCK: 15', {
            fontSize: '14px', fontFamily: 'ZenDots', color: '#00ff00'
        });

        this.createVictoryPanel();
        this.createGameOverPanel();

        // Listeners corregidos para recibir Objetos
        gameScene.events.on(EVENTS.PLAYER_HIT, (data) => this.updateHealth(data), this);
        gameScene.events.on(EVENTS.PLAYER_HEAL, (data) => this.updateHealth(data), this);

        gameScene.events.on(EVENTS.SCORE_CHANGE, (points) => {
            this.score += points;
            this.scoreText.setText(`SCORE: ${this.score}`);
        }, this);

        // Listen to weapon changes
        gameScene.events.on(EVENTS.WEAPON_CHANGE, (weaponName) => {
            // Don't show "Basic Cannon" as it's the default weapon
            if (weaponName && !weaponName.toLowerCase().includes('basic')) {
                this.powerupText.setText(`WEAPON: ${weaponName}`);
                this.powerupText.setVisible(true);
            } else {
                this.powerupText.setVisible(false);
            }
        }, this);

        // Listen to life changes
        gameScene.events.on(EVENTS.LIFE_CHANGE, (lives) => {
            this.lives = lives;
            this.livesText.setText(`LIVES: ${lives}`);
        }, this);

        // Update luck display (get from player)
        if (gameScene.player && gameScene.player.stats) {
            this.luckText.setText(`LUCK: ${gameScene.player.stats.luck || 15}`);
        }

        // CRITICAL FIX: Initialize healthbar with player's current HP
        if (gameScene.player) {
            this.updateHealth({
                current: gameScene.player.hp || gameScene.player.maxHp,
                max: gameScene.player.maxHp
            });
        }

        gameScene.events.on(EVENTS.LEVEL_FINISHED, this.showVictoryScreen, this);
        gameScene.events.on(EVENTS.GAME_OVER, this.showGameOverScreen, this);
    }

    /**
     * Updates the health bar graphic based on player HP.
     * @param {Object} data - HP information.
     * @param {number} data.current - Current HP.
     * @param {number} data.max - Maximum HP.
     */
    updateHealth(data) {
        const { current, max } = data;
        this.healthBar.clear();
        const percent = Phaser.Math.Clamp(current / max, 0, 1);

        // Fondo
        this.healthBar.fillStyle(0x333333).fillRect(20, 50, 200, 20);
        // Barra (Dinámica de color con gradiente)
        let color;
        if (percent > 0.6) color = 0x00ff00; // Verde
        else if (percent > 0.3) color = 0xffff00; // Amarillo
        else color = 0xff0000; // Rojo

        this.healthBar.fillStyle(color).fillRect(20, 50, 200 * percent, 20);
        // Borde
        this.healthBar.lineStyle(2, 0xffffff).strokeRect(20, 50, 200, 20);
    }

    /**
     * Creates the Level Complete container.
     */
    createVictoryPanel() {
        const { width, height } = this.cameras.main;

        this.victoryPanel = this.add.container(0, 0).setDepth(100).setVisible(false);

        const bg = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7);
        const text = this.add.text(width / 2, height / 2, 'LEVEL COMPLETE', {
            fontSize: '42px', fontFamily: 'ZenDots', color: '#00ff00'
        }).setOrigin(0.5);

        this.victoryPanel.add([bg, text]);
    }

    /**
     * Creates the Game Over screen with interactive return logic.
     */
    createGameOverPanel() {
        const { width, height } = this.cameras.main;

        this.gameOverPanel = this.add.container(0, 0).setDepth(100).setVisible(false);

        // Background image
        const bgImage = this.add.image(width / 2, height / 2, 'bg_gameover');
        bgImage.setDisplaySize(width, height);

        // Dark overlay for readability
        const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.5);

        const text = this.add.text(width / 2, height / 2 - 40, 'GAME OVER', {
            fontSize: '54px', fontFamily: 'ZenDots', color: '#ff0000',
            stroke: '#000000', strokeThickness: 8
        }).setOrigin(0.5);

        const subText = this.add.text(width / 2, height / 2 + 40, 'Click to Return to Menu', {
            fontSize: '20px', fontFamily: 'ZenDots', color: '#ffffff'
        }).setOrigin(0.5);

        // Score display
        this.gameOverScoreText = this.add.text(width / 2, height / 2 + 100, '', {
            fontSize: '18px', fontFamily: 'ZenDots', color: '#ffff00'
        }).setOrigin(0.5);

        this.gameOverPanel.add([bgImage, overlay, text, subText, this.gameOverScoreText]);

        // Reiniciar al hacer click - FIXED: Go to menu instead of restart
        overlay.setInteractive().on('pointerdown', () => {
            if (this.gameOverPanel.visible) {
                this.gameOverPanel.setVisible(false);

                // Stop both scenes
                this.scene.stop(SCENES.GAME);
                this.scene.stop(SCENES.UI);

                // Go to menu
                this.scene.start(SCENES.MENU);
            }
        });
    }

    /**
     * Displays the victory overlay when a level is finished.
     */
    showVictoryScreen() {
        this.victoryPanel.setVisible(true);
    }

    /**
     * Displays the game over screen and updates the final score.
     */
    showGameOverScreen() {
        // Update final score
        if (this.gameOverScoreText) {
            this.gameOverScoreText.setText(`FINAL SCORE: ${this.score}`);
        }
        this.gameOverPanel.setVisible(true);
    }

    /**
     * Updates the lives display.
     * @param {number} lives - Current lives count.
     */
    updateLives(lives) {
        this.lives = lives;
        if (this.livesText) {
            this.livesText.setText(`LIVES: ${lives}`);
        }
    }

    /**
     * Updates the weapon display text.
     * @param {string} weaponName - The name of the equipped weapon.
     */
    updateWeapon(weaponName) {
        if (weaponName && !weaponName.toLowerCase().includes('basic')) {
            this.powerupText.setText(`WEAPON: ${weaponName}`);
            this.powerupText.setVisible(true);
        } else {
            this.powerupText.setVisible(false);
        }
    }
}
