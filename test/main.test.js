// 1. PRIMERO importamos el setup para que Phaser exista globalmente
import './setup.js';

// 2. DESPUÉS importamos las herramientas de test
import { describe, expect, it } from 'vitest';

// 3. Y FINALMENTE el código de tu juego
import { config } from '../main.js';
import BootScene from '../src/scenes/BootScene.js';
import GameScene from '../src/scenes/GameScene.js';
import MenuScene from '../src/scenes/MenuScene.js';

describe('Galactic Phoenix - Main Game Configuration', () => {
    
    it('debería tener las dimensiones de pantalla correctas', () => {
        expect(config.width).toBe(800);
        expect(config.height).toBe(600);
    });

    it('debería usar el sistema de físicas Arcade sin gravedad', () => {
        expect(config.physics.default).toBe('arcade');
        expect(config.physics.arcade.gravity.y).toBe(0);
    });

    it('debería incluir todas las escenas necesarias', () => {
        expect(config.scene).toContain(BootScene);
        expect(config.scene).toContain(MenuScene);
        expect(config.scene).toContain(GameScene);
        expect(config.scene.length).toBe(7);
    });

    it('debería tener configurado el contenedor del DOM correcto', () => {
        expect(config.parent).toBe('game-container');
    });
});