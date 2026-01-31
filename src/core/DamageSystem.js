/**
 * @typedef {Object} DamageResult
 * @property {number} amount - La cantidad final de daño después de los cálculos.
 * @property {boolean} isCritical - Indica si el golpe fue crítico.
 * @property {string} type - El tipo de daño utilizado.
 * @property {number} multiplierApplied - El multiplicador de resistencia que se aplicó.
 */

/**
 * @class DamageSystem
 * @description Clase de utilidad estática para la lógica de cálculo de daño.
 * Encapsula la fórmula de resistencias y golpes críticos.
 */
export default class DamageSystem {
    /**
     * Calcula el daño final basado en el tipo, las resistencias y la suerte.
     * @param {number} [baseDamage=0] - La cantidad de daño inicial.
     * @param {string} [damageType='fisico'] - El tipo de daño que se inflige.
     * @param {Object.<string, number>} [resistances={}] - Un mapa de tipos de daño a multiplicadores (ej. { laser: 0.5 }).
     * @param {number} [luck=0] - La estadística de suerte del atacante, que aumenta la probabilidad de crítico.
     * @returns {DamageResult} El resultado del daño calculado.
     */
    static calculateDamage(baseDamage = 0, damageType = 'fisico', resistances = {}, luck = 0) {
        // Validación de base para evitar errores
        const safeBaseDamage = Math.max(0, baseDamage);

        // Multiplicador: 1.0 por defecto
        const multiplier = (resistances && resistances[damageType] !== undefined)
            ? resistances[damageType]
            : 1.0;

        let finalDamage = safeBaseDamage * multiplier;
        let isCritical = false;

        // Sistema de Suerte: Probabilidad de Crítico (luck 10 = 5% chance)
        if (Math.random() * 100 < (luck * 0.5)) {
            finalDamage *= 2;
            isCritical = true;
        }

        return {
            amount: Math.floor(finalDamage),
            isCritical: isCritical,
            type: damageType,
            multiplierApplied: multiplier
        };
    }
}