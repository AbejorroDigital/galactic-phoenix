/**
 * @class PlayerVFX
 * @description Gestiona los efectos visuales persistentes de la nave, 
 * incluyendo propulsores dinámicos y estados de daño.
 */
export default class PlayerVFX {
    constructor(player) {
        this.player = player;
        this.scene = player.scene;
        this.fx = player.scene.fx; // Referencia al motor global

        /** @type {Phaser.GameObjects.Particles.ParticleEmitter} */
        this.engineEmitter = null;
        /** @type {Phaser.GameObjects.Particles.ParticleEmitter} */
        this.smokeEmitter = null;

        this.init();
    }

    /**
     * Inicializa los emisores de partículas para el propulsor y el daño.
     */
    init() {
        if (!this.scene.add.particles) return;

        const quality = this.scene.registry.get('graphicsQuality') ?? 1;
        const config = this.getQualityConfig(quality);

        // --- Propulsor Principal (Plasma Blue) ---
        this.engineEmitter = this.scene.add.particles(0, 0, 'flare', {
            speed: { min: 60, max: 120 },
            scale: { start: 0.3, end: 0 },
            alpha: { start: 0.8, end: 0 },
            lifespan: 300,
            blendMode: 'ADD',
            follow: this.player,
            followOffset: { x: -30, y: 0 },
            tint: [0x00ffff, 0x0088ff, 0xffffff],
            frequency: config.frequency
        });

        // --- Emisor de Humo (Se activa solo con daño crítico) ---
        this.smokeEmitter = this.scene.add.particles(0, 0, 'flare', {
            speed: { min: 20, max: 50 },
            scale: { start: 0.4, end: 0.8 },
            alpha: { start: 0.3, end: 0 },
            lifespan: 800,
            follow: this.player,
            followOffset: { x: -10, y: 0 },
            tint: 0x333333, // Humo oscuro
            frequency: -1 // Empezar desactivado
        });

        // Asegurar que las partículas se dibujen detrás de la nave
        this.engineEmitter.setDepth(this.player.depth - 1);
        this.smokeEmitter.setDepth(this.player.depth - 1);
    }

    /**
     * Mapea la calidad gráfica a parámetros técnicos.
     */
    getQualityConfig(q) {
        return {
            frequency: q === 0 ? 80 : (q === 1 ? 25 : 10),
            quantity: q === 2 ? 2 : 1
        };
    }

    /**
     * Actualiza la calidad de las partículas en tiempo real.
     */
    updateQuality(q) {
        if (!this.engineEmitter) return;
        const config = this.getQualityConfig(q);
        this.engineEmitter.setConfig({ frequency: config.frequency });
    }

    /**
     * Actualiza el estado visual del motor basado en la salud.
     * Llamado desde PlayerHealth o en el update del Player.
     */
    updateThrustVisuals(hpPercent) {
        if (!this.engineEmitter || !this.smokeEmitter) return;

        if (hpPercent < 0.3) {
            // Estado Crítico: Motor rateando y humo activo
            this.engineEmitter.setTint([0xff0000, 0xffaa00]); // Fuego rojo/naranja
            this.engineEmitter.setFrequency(50); // Menos potencia
            if (this.smokeEmitter.frequency === -1) this.smokeEmitter.start();
        } else {
            // Estado Normal: Plasma azul
            this.engineEmitter.setTint([0x00ffff, 0x0088ff]);
            this.smokeEmitter.stop();
        }
    }

    /**
     * Efecto visual de invulnerabilidad (Parpadeo).
     */
    playFlash(duration) {
        // Detenemos cualquier tween de alpha previo para evitar conflictos
        this.scene.tweens.killTweensOf(this.player);
        this.player.setAlpha(1);

        this.scene.tweens.add({
            targets: this.player,
            alpha: 0.2,
            duration: 100,
            yoyo: true,
            repeat: Math.floor(duration / 200),
            onComplete: () => {
                if (this.player.active) {
                    this.player.setAlpha(1);
                    // Pequeño brillo al terminar la invulnerabilidad
                    if (this.fx) this.fx.sparks(this.player.x, this.player.y);
                }
            }
        });
    }

    /**
     * Control de flujo de los motores.
     */
    stopEngine() {
        this.engineEmitter?.stop();
        this.smokeEmitter?.stop();
    }

    startEngine() {
        this.engineEmitter?.start();
        // El humo solo arrancará si updateThrustVisuals lo permite
    }

    /**
     * Limpieza de recursos al destruir al jugador.
     */
    destroy() {
        this.engineEmitter?.destroy();
        this.smokeEmitter?.destroy();
    }
}
