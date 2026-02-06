/**
 * @file main.js
 * @description Punto de entrada principal para el juego Galactic Phoenix.
 * Configura la instancia del juego Phaser e inicializa las escenas.
 */

import BootScene from './src/scenes/BootScene.js';
import ControlsScene from './src/scenes/ControlsScene.js';
import GameScene from './src/scenes/GameScene.js';
import MenuScene from './src/scenes/MenuScene.js';
import OptionsScene from './src/scenes/OptionsScene.js';
import PauseScene from './src/scenes/PauseScene.js';
import UIScene from './src/scenes/UIScene.js';


// ==================== GLOBAL DEBUG CONFIGURATION ====================
if (typeof window !== 'undefined') {
    window.DEBUG_MODE = true;
    window.DEBUG_KEYS = {
        TOGGLE_DEBUG: 'H',
        INSTAKILL: 'K',
        LEVEL_SELECT_1: 'D',
        LEVEL_SELECT_2: 'B',
        LEVEL_SELECT_3: 'G'
    };
    console.log('[Main] Modo Debug Global:', window.DEBUG_MODE);
}
// ===================================================================

/**
 * Configuración del Juego Phaser.
 * Define el tipo de renderizado, dimensiones, sistema de físicas y orden de las escenas.
 * @type {Phaser.Types.Core.GameConfig}
 */
export const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    backgroundColor: '#000000',
    pixelArt: false,
    physics: {
        default: 'arcade',
        arcade: {
            debug: false,
            gravity: { y: 0 }
        }
    },
    scene: [BootScene, MenuScene, ControlsScene, OptionsScene, GameScene, UIScene, PauseScene]
};

/**
 * La instancia global del Juego Phaser.
 * @type {Phaser.Game|undefined}
 */
export let game;

// Solo inicializamos el juego si NO estamos en un entorno de pruebas (Vitest)
if (typeof window !== 'undefined' && !window.__VITEST__) {
    game = new Phaser.Game(config);
}