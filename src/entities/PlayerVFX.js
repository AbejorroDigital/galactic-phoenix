/**
 * @class PlayerVFX
 * @description Gestiona los efectos visuales, partículas y tweens de la nave.
 */
export default class PlayerVFX {
    constructor(player) {
        this.player = player;
        this.scene = player.scene;
        this.engineEmitter = null;
        this.init();
    }

    init() {
        if (!this.scene.add.particles) return;

        const quality = this.scene.registry.get('graphicsQuality') || 1;
        const frequency = quality === 0 ? 100 : (quality === 1 ? 20 : 8);

        this.engineEmitter = this.scene.add.particles(0, 0, 'flare', {
            speed: { min: 40, max: 80 },
            scale: { start: 0.2, end: 0 },
            alpha: { start: 0.6, end: 0 },
            lifespan: 400,
            blendMode: 'ADD',
            follow: this.player,
            followOffset: { x: -25, y: 0 },
            frequency: frequency
        });
    }

    updateQuality(q) {
        if (!this.engineEmitter) return;
        const freq = q === 0 ? 100 : (q === 1 ? 20 : 8);
        this.engineEmitter.setConfig({ frequency: freq });
    }

    playFlash(duration) {
        this.scene.tweens.add({
            targets: this.player,
            alpha: 0.5,
            duration: 100,
            yoyo: true,
            repeat: duration / 200,
            onComplete: () => {
                if (this.player.active) this.player.setAlpha(1);
            }
        });
    }

    stopEngine() { if (this.engineEmitter) this.engineEmitter.stop(); }
    startEngine() { if (this.engineEmitter) this.engineEmitter.start(); }
}
