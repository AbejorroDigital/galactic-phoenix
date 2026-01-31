import { describe, expect, it, vi } from 'vitest';

// Simulamos el entorno de navegador básico para Phaser
global.window = window;
global.document = window.document;
global.navigator = window.navigator;

// Mock de Phaser
global.Phaser = {
    AUTO: 0,
    CANVAS: 1,
    WEBGL: 2,
    Game: vi.fn().mockImplementation(() => ({
        // Mock de una instancia de juego mínima
        destroy: vi.fn(),
        canvas: {}
    }))
};

// Importamos la configuración desde main.js
// IMPORTANTE: Asegúrate de que main.js exporte 'config'
import { config } from '../main.js';

describe('Pruebas de Configuración de Galactic Phoenix', () => {

    it('debería tener las dimensiones correctas', () => {
        expect(config.width).toBe(800);
        expect(config.height).toBe(600);
    });

    it('debería tener cargadas las escenas principales', () => {
        // Verificamos que el array tenga las 7 escenas esperadas
        expect(config.scene).toHaveLength(7);
        // Verificamos por nombre de la función constructora
        expect(config.scene[0].name).toBe('BootScene');
    });

    it('debería usar física arcade con gravedad 0', () => {
        expect(config.physics.default).toBe('arcade');
        expect(config.physics.arcade.gravity.y).toBe(0);
    });
});