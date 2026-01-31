import { describe, expect, it } from 'vitest';
import DamageSystem from '../src/core/DamageSystem.js';

describe('DamageSystem - Cálculo de Daño', () => {

    it('debería calcular daño base sin resistencias', () => {
        const result = DamageSystem.calculateDamage(100, 'fisico', {}, 0);

        expect(result.amount).toBe(100);
        expect(result.isCritical).toBe(false);
        expect(result.type).toBe('fisico');
        expect(result.multiplierApplied).toBe(1.0);
    });

    it('debería aplicar resistencia de 0.5 (reducción de daño)', () => {
        const resistances = { fisico: 0.5 };
        const result = DamageSystem.calculateDamage(100, 'fisico', resistances, 0);

        expect(result.amount).toBe(50);
        expect(result.multiplierApplied).toBe(0.5);
    });

    it('debería aplicar debilidad de 1.5 (aumento de daño)', () => {
        const resistances = { laser: 1.5 };
        const result = DamageSystem.calculateDamage(100, 'laser', resistances, 0);

        expect(result.amount).toBe(150);
        expect(result.multiplierApplied).toBe(1.5);
    });

    it('debería aplicar inmunidad de 2.0 (doble daño)', () => {
        const resistances = { espiritual: 2.0 };
        const result = DamageSystem.calculateDamage(100, 'espiritual', resistances, 0);

        expect(result.amount).toBe(200);
        expect(result.multiplierApplied).toBe(2.0);
    });

    it('debería usar multiplicador 1.0 si el tipo de daño no está en resistencias', () => {
        const resistances = { fisico: 0.5 };
        const result = DamageSystem.calculateDamage(100, 'plasma', resistances, 0);

        expect(result.amount).toBe(100);
        expect(result.multiplierApplied).toBe(1.0);
    });

    it('debería generar críticos con suerte alta', () => {
        // Con suerte 100, hay 50% de chance de crítico (100 * 0.5 = 50)
        // Ejecutamos múltiples veces para probar probabilidad
        let critCount = 0;
        const iterations = 100;

        for (let i = 0; i < iterations; i++) {
            const result = DamageSystem.calculateDamage(100, 'fisico', {}, 100);
            if (result.isCritical) {
                critCount++;
                expect(result.amount).toBe(200); // Crítico dobla el daño
            }
        }

        // Con 50% de probabilidad, esperamos al menos 30 críticos en 100 iteraciones
        expect(critCount).toBeGreaterThan(30);
    });

    it('no debería generar críticos con suerte 0', () => {
        // Probar varias veces para asegurar que no hay críticos
        for (let i = 0; i < 20; i++) {
            const result = DamageSystem.calculateDamage(100, 'fisico', {}, 0);
            expect(result.isCritical).toBe(false);
            expect(result.amount).toBe(100);
        }
    });

    it('debería manejar daño base negativo o cero', () => {
        const result1 = DamageSystem.calculateDamage(-50, 'fisico', {}, 0);
        expect(result1.amount).toBe(0);

        const result2 = DamageSystem.calculateDamage(0, 'fisico', {}, 0);
        expect(result2.amount).toBe(0);
    });

    it('debería redondear hacia abajo el daño final', () => {
        const resistances = { ionico: 0.33 }; // 100 * 0.33 = 33.33
        const result = DamageSystem.calculateDamage(100, 'ionico', resistances, 0);

        expect(result.amount).toBe(33); // Floor de 33.33
    });

    it('debería combinar resistencia y crítico correctamente', () => {
        const resistances = { laser: 0.5 };

        // Forzar crítico con suerte muy alta
        let foundCrit = false;
        for (let i = 0; i < 50 && !foundCrit; i++) {
            const result = DamageSystem.calculateDamage(100, 'laser', resistances, 200);
            if (result.isCritical) {
                // 100 * 0.5 (resistencia) = 50, luego 50 * 2 (crítico) = 100
                expect(result.amount).toBe(100);
                foundCrit = true;
            }
        }

        expect(foundCrit).toBe(true);
    });
});
