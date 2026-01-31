/**
 * @class DebugLogger
 * @description Sistema auxiliar para rastrear flujos complejos del juego (como la muerte/reaparición del jugador) con marcas de tiempo.
 * Proporciona métodos de registro especializados para diferentes componentes del juego.
 */
class DebugLogger {
    constructor() {
        /** @type {Array<Object>} */
        this.logs = [];
        /** @type {number} */
        this.startTime = Date.now();
        /** @type {boolean} */
        this.enabled = true; // Establecer a false en producción
    }

    /**
     * Método de registro genérico con formato basado en categorías.
     * @param {string} category - Categoría del registro (ej. 'player', 'death', 'error').
     * @param {string} message - Mensaje descriptivo.
     * @param {Object} [data={}] - Metadatos a incluir.
     */
    log(category, message, data = {}) {
        if (!this.enabled) return;

        const timestamp = Date.now() - this.startTime;
        const logEntry = {
            time: timestamp,
            category,
            message,
            data: JSON.parse(JSON.stringify(data)) // Clonación profunda para evitar problemas de referencia
        };

        this.logs.push(logEntry);

        // Salida por consola con formato
        console.log(
            `%c[${timestamp}ms] ${category.toUpperCase()}`,
            `color: ${this.getCategoryColor(category)}; font-weight: bold`,
            message,
            data
        );
    }

    /**
     * Devuelve una cadena de color CSS para una categoría dada.
     * @param {string} category - Nombre de la categoría.
     * @returns {string} Color hexadecimal.
     */
    getCategoryColor(category) {
        const colors = {
            player: '#00ff00',
            death: '#ff0000',
            respawn: '#00ffff',
            sprite: '#ffff00',
            collision: '#ff00ff',
            state: '#ff8800',
            scene: '#0088ff',
            particle: '#88ff00',
            error: '#ff0000'
        };
        return colors[category] || '#ffffff';
    }

    /**
     * Registrador especializado para la entidad Player.
     * @param {Player} player - La instancia del jugador.
     * @param {string} label - Etiqueta de contexto.
     */
    logPlayerState(player, label) {
        if (!this.enabled || !player) return;

        this.log('player', `ESTADO DEL JUGADOR: ${label}`, {
            isDead: player.isDead,
            canShoot: player.canShoot,
            isInvulnerable: player.isInvulnerable,
            hp: player.hp,
            maxHp: player.maxHp,
            x: player.x,
            y: player.y,
            visible: player.visible,
            active: player.active,
            bodyEnabled: player.body ? player.body.enable : 'SIN_CUERPO',
            hasParticles: !!player.engineEmitter
        });
    }

    /**
     * Registrador especializado para sprites.
     * @param {Phaser.GameObjects.Sprite} sprite - La instancia del sprite.
     * @param {string} label - Etiqueta de contexto.
     */
    logSpriteState(sprite, label) {
        if (!this.enabled || !sprite) return;

        this.log('sprite', `ESTADO DEL SPRITE: ${label}`, {
            texture: sprite.texture?.key || 'SIN_TEXTURA',
            visible: sprite.visible,
            active: sprite.active,
            x: sprite.x,
            y: sprite.y,
            alpha: sprite.alpha,
            scale: sprite.scale
        });
    }

    /**
     * Registrador especializado para colisiones.
     * @param {Object} objA - Primer objeto.
     * @param {Object} objB - Segundo objeto.
     * @param {string} type - Descriptor del tipo de colisión.
     */
    logCollision(objA, objB, type) {
        if (!this.enabled) return;

        this.log('collision', `COLISIÓN: ${type}`, {
            objectA: {
                type: objA.constructor.name,
                texture: objA.texture?.key,
                active: objA.active
            },
            objectB: {
                type: objB.constructor.name,
                texture: objB.texture?.key,
                active: objB.active
            }
        });
    }

    /**
     * Registrador especializado para escenas.
     * @param {Phaser.Scene} scene - La instancia de la escena.
     * @param {string} label - Etiqueta de contexto.
     */
    logSceneState(scene, label) {
        if (!this.enabled || !scene) return;

        this.log('scene', `ESTADO DE LA ESCENA: ${label}`, {
            key: scene.scene.key,
            isActive: scene.scene.isActive(),
            isVisible: scene.scene.isVisible(),
            isPaused: scene.physics?.world?.isPaused || 'SIN_FÍSICAS',
            isGameOver: scene.isGameOver,
            isTransitioning: scene.isTransitioning,
            lives: scene.lives
        });
    }

    /**
     * Exporta todos los registros capturados como una cadena JSON.
     * @returns {string}
     */
    exportLogs() {
        return JSON.stringify(this.logs, null, 2);
    }

    /**
     * Reinicia el registrador.
     */
    clear() {
        this.logs = [];
        this.startTime = Date.now();
    }

    /**
     * Captura un error crítico con el rastro de la pila.
     * @param {string} location - Nombre de la función o componente.
     * @param {Error|string} error - El objeto de error o mensaje.
     * @param {Object} [context={}] - Datos adicionales.
     */
    logCriticalError(location, error, context = {}) {
        this.log('error', `ERROR CRÍTICO en ${location}`, {
            error: error.message || String(error),
            stack: error.stack,
            context
        });
    }
}

// Global debug logger instance
/** @type {DebugLogger} */
window.DEBUG_LOGGER = new DebugLogger();

export default DebugLogger;
