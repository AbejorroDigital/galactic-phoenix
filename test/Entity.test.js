import { beforeEach, describe, expect, it, vi } from 'vitest';

import '../test/setup.js';

// Mock de escena
const createMockScene = () => ({
    add: {
        existing: vi.fn(),
        text: vi.fn(() => ({
            setOrigin: vi.fn().mockReturnThis(),
            setDepth: vi.fn().mockReturnThis(),
            destroy: vi.fn()
        }))
    },
    physics: {
        add: {
            existing: vi.fn()
        }
    },
    tweens: {
        add: vi.fn((config) => {
            // Simular completado del tween inmediatamente
            if (config.onComplete) {
                setTimeout(config.onComplete, 0);
            }
        })
    },
    time: {
        delayedCall: vi.fn((delay, callback) => {
            setTimeout(callback, 0);
        })
    }
});

// Importar Entity después de los mocks
import Entity from '../src/entities/Entity.js';

describe('Entity - Sistema de Vida y Daño', () => {
    let scene;
    let entity;

    beforeEach(() => {
        scene = createMockScene();
    });

    it('debería inicializar correctamente con valores por defecto', () => {
        entity = new Entity(scene, 100, 200, 'test_sprite');

        expect(entity.hp).toBe(100);
        expect(entity.maxHp).toBe(100);
        expect(entity.isDead).toBe(false);
        expect(entity.x).toBe(100);
        expect(entity.y).toBe(200);
    });

    it('debería reducir HP al recibir daño', () => {
        entity = new Entity(scene, 100, 200, 'test_sprite');
        entity.body = { enable: true }; // Mock body

        const damage = { damage: 30, type: 'fisico' };
        entity.takeDamage(damage);

        expect(entity.hp).toBeLessThan(100);
        expect(entity.isDead).toBe(false);
    });

    it('debería morir cuando HP llega a 0 o menos', () => {
        entity = new Entity(scene, 100, 200, 'test_sprite');
        entity.body = { enable: true };

        const damage = { damage: 150, type: 'fisico' };
        entity.takeDamage(damage);

        expect(entity.hp).toBeLessThanOrEqual(0);
        expect(entity.isDead).toBe(true);
        expect(entity.active).toBe(false);
        expect(entity.visible).toBe(false);
    });

    it('no debería tomar daño si ya está muerto', () => {
        entity = new Entity(scene, 100, 200, 'test_sprite');
        entity.body = { enable: true };
        entity.isDead = true;
        const initialHp = entity.hp;

        const damage = { damage: 50, type: 'fisico' };
        entity.takeDamage(damage);

        expect(entity.hp).toBe(initialHp); // HP no cambió
    });

    it('no debería tomar daño si no está activo', () => {
        entity = new Entity(scene, 100, 200, 'test_sprite');
        entity.body = { enable: true };
        entity.setActive(false);
        const initialHp = entity.hp;

        const damage = { damage: 50, type: 'fisico' };
        entity.takeDamage(damage);

        expect(entity.hp).toBe(initialHp);
    });

    it('debería aplicar resistencias al calcular daño', () => {
        entity = new Entity(scene, 100, 200, 'test_sprite');
        entity.body = { enable: true };
        entity.resistances = { laser: 0.5 }; // 50% de resistencia
        entity.hp = 100;
        entity.maxHp = 100;

        const damage = { damage: 100, type: 'laser' };
        entity.takeDamage(damage);

        // Con 50% de resistencia, debería recibir 50 de daño
        expect(entity.hp).toBe(50);
    });

    it('die() debería desactivar la entidad para pooling', () => {
        entity = new Entity(scene, 100, 200, 'test_sprite');
        entity.body = { enable: true };

        entity.die();

        expect(entity.isDead).toBe(true);
        expect(entity.active).toBe(false);
        expect(entity.visible).toBe(false);
        expect(entity.body.enable).toBe(false);
    });

    it('die() no debería ejecutarse dos veces', () => {
        entity = new Entity(scene, 100, 200, 'test_sprite');
        entity.body = { enable: true };

        entity.die();
        const afterFirstDie = { ...entity };

        entity.die(); // Segunda llamada

        // Los valores no deberían cambiar
        expect(entity.isDead).toBe(afterFirstDie.isDead);
        expect(entity.active).toBe(afterFirstDie.active);
    });
});
