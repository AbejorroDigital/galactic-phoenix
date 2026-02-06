/**
 * 🚀 GALACTIC PHOENIX FX ENGINE - ULTIMATE EDITION (FULL REPAIRED)
 * Sistema integral de: 
 * 1. Explosiones | 2. Jefes | 3. Gratificación | 4. Clima | 5. Post-Processing
 */

const DistortShader = `
precision mediump float;
uniform sampler2D uMainSampler;
uniform float uTime;
uniform float uIntensity;
varying vec2 outTexCoord;
void main() {
    vec2 uv = outTexCoord;
    uv.x += sin(uv.y * 10.0 + uTime) * 0.005 * uIntensity;
    uv.y += cos(uv.x * 10.0 + uTime) * 0.005 * uIntensity;
    gl_FragColor = texture2D(uMainSampler, uv);
}`;

/**
 * Pipeline especializado para gestionar el tiempo y la intensidad de forma nativa
 */
class DistortPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
    constructor(game) {
        super({
            game,
            fragShader: DistortShader,
            uniforms: ['uMainSampler', 'uTime', 'uIntensity']
        });
        this.uTime = 0;
        this.uIntensity = 0;
    }
    onPreRender() {
        this.uTime += 0.05;
        this.set1f('uTime', this.uTime);
        this.set1f('uIntensity', this.uIntensity);
    }
}

export default class GalacticPhoenixFX {
    constructor(scene) {
        this.scene = scene;
        this.rectZone = new Phaser.Geom.Rectangle(0, 0, 800, 600);
        this.currentWeather = null;
        this.isDistortionActive = false;

        // Inicializar Pipeline de Post-Procesamiento
        if (this.scene.renderer.type !== Phaser.CANVAS) {
            const renderer = this.scene.renderer;
            if (!renderer.pipelines.has('Distort')) {
                renderer.pipelines.addPostPipeline('Distort', DistortPipeline);
            }
        }
    }

    /**
     * MÉTODO CORE: _emit (Optimizado)
     * En Phaser 3.60+, usamos el emisor directamente para evitar saturar el gestor.
     */
    _emit(x, y, config, soundKey, shake = null) {
        // Aseguramos que 'flare' exista o usamos una textura por defecto
        const emitter = this.scene.add.particles(x, y, config.texture || 'flare', config);

        if (soundKey && this.scene.cache.audio.exists(soundKey)) {
            this.scene.sound.play(soundKey, { 
                volume: 0.5, 
                detune: Phaser.Math.Between(-600, 600) 
            });
        }

        if (shake) {
            this.scene.cameras.main.shake(shake.duration, shake.intensity);
        }

        // Auto-limpieza inteligente
        if (!config.isWeather && !config.follow) {
            const maxLife = (config.lifespan?.max || config.lifespan || 1000);
            this.scene.time.delayedCall(maxLife + 200, () => {
                if (emitter) emitter.destroy();
            });
        }

        return emitter;
    }

    applyDistortion(duration = 500, intensity = 1.0) {
        const cam = this.scene.cameras.main;
        cam.setPostPipeline('Distort');
        const pipeline = cam.getPostPipeline('Distort');
        if (pipeline) pipeline.uIntensity = intensity;
        this.isDistortionActive = true;

        if (duration < 90000) { // No remover si es un clima infinito
            this.scene.time.delayedCall(duration, () => {
                cam.removePostPipeline('Distort');
                this.isDistortionActive = false;
            });
        }
    }

    updateAtmosphereForLevel(levelIndex) {
        if (this.currentWeather) {
            this.currentWeather.destroy();
            this.currentWeather = null;
            this.scene.cameras.main.removePostPipeline('Distort');
        }

        switch(levelIndex) {
            case 1: this.currentWeather = this.starField(800); break;
            case 2: this.currentWeather = this.spaceSnow(); break;
            case 3: this.currentWeather = this.acidRain(); break;
            case 4: 
                this.currentWeather = this.volcanicHeat();
                this.applyDistortion(999999, 0.4); 
                break;
            case 5: this.currentWeather = this.spaceFog(); break;
            default: this.currentWeather = this.starField(400);
        }
    }

    /* ==========================================================
       SECCIÓN 1: COMBATE Y EXPLOSIONES ESTÁNDAR
       ========================================================== */
    standard(x, y) { return this._emit(x, y, { speed: { min: 100, max: 200 }, scale: { start: 0.6, end: 0 }, blendMode: 'ADD', lifespan: 600, tint: 0xffa500, emitting: false }).explode(20); }
    plasma(x, y) { return this._emit(x, y, { speed: { min: 50, max: 400 }, scale: { start: 0.8, end: 0 }, tint: [0x00ffff, 0x0000ff], blendMode: 'SCREEN', lifespan: 400, emitting: false }, 'explosion2.ogg').explode(30); }
    sparks(x, y) { return this._emit(x, y, { speed: { min: 200, max: 300 }, scale: { start: 0.2, end: 0 }, lifespan: 200, emitting: false, tint: 0xffff00 }, 'impact.ogg').explode(8); }
    toxic(x, y) { return this._emit(x, y, { speed: { min: 20, max: 50 }, scale: { start: 0.5, end: 2 }, alpha: { start: 0.5, end: 0 }, tint: 0x32cd32, lifespan: 1000, emitting: false }, 'gas_leak.ogg').explode(15); }
    starNova(x, y) { return this._emit(x, y, { speed: { min: -100, max: 600 }, scale: { start: 0, end: 1.5 }, blendMode: 'ADD', lifespan: 500, emitting: false }, 'big_boom.ogg', { duration: 200, intensity: 0.02 }).explode(40); }
    debris(x, y) { return this._emit(x, y, { speed: { min: 150, max: 250 }, gravityY: 400, scale: { start: 0.4, end: 0.1 }, tint: 0x666666, lifespan: 1000, emitting: false }, 'debris_fall.ogg').explode(10); }
    firework(x, y, color = 0xff00ff) { return this._emit(x, y, { speed: 200, scale: { start: 0.5, end: 0 }, tint: color, gravityY: 100, lifespan: 1000, emitting: false }, 'firework.ogg').explode(50); }
    frost(x, y) { return this._emit(x, y, { speed: { min: 10, max: 100 }, scale: { start: 1, end: 0 }, tint: 0xddeeff, blendMode: 'ADD', lifespan: 1200, emitting: false }, 'freeze.ogg').explode(25); }
    emp(x, y) { return this._emit(x, y, { scale: { start: 0, end: 5 }, alpha: { start: 1, end: 0 }, tint: 0x9933ff, lifespan: 400, emitting: false }, 'electric.ogg').explode(1); }
    mushroomCloud(x, y) { this.standard(x, y); return this._emit(x, y - 40, { speedY: { min: -100, max: -200 }, scale: { start: 1, end: 2.5 }, alpha: { start: 0.6, end: 0 }, tint: 0x333333, lifespan: 1500, emitting: false }, 'nuke.ogg').explode(15); }

    /* ==========================================================
       SECCIÓN 2: DERROTA DE JEFES
       ========================================================== */
    chainReaction(x, y, count = 5) { for(let i = 0; i < count; i++) { this.scene.time.delayedCall(i * 200, () => this.standard(x + Phaser.Math.Between(-60, 60), y + Phaser.Math.Between(-60, 60))); } }
    blackHole(x, y) { this.applyDistortion(1000, 4.0); return this._emit(x, y, { speed: { min: -600, max: -200 }, scale: { start: 2.5, end: 0 }, tint: 0x220044, blendMode: 'MULTIPLY', lifespan: 1000, emitting: false }, 'vortex.ogg').explode(100); }
    phoenixRise(x, y) { return this._emit(x, y, { speedX: { min: -300, max: 300 }, speedY: { min: -100, max: -600 }, scale: { start: 1, end: 0 }, tint: [0xff4400, 0xffd700, 0xffffff], blendMode: 'ADD', lifespan: 1500, emitting: false, gravityY: -300 }, 'phoenix_shout.ogg', { duration: 500, intensity: 0.03 }).explode(120); }
    bigBang(x, y) { this.applyDistortion(1500, 3.0); return this._emit(x, y, { speed: { min: 0, max: 1000 }, scale: { start: 1.5, end: 0 }, tint: 0xffffff, lifespan: 2500, emitting: false }, 'grand_explosion.ogg', { duration: 1500, intensity: 0.06 }).explode(400); }
    orbitalRing(x, y) { return this._emit(x, y, { scale: { start: 0, end: 20 }, alpha: { start: 0.8, end: 0 }, tint: 0x00ff00, lifespan: 700, emitting: false }, 'energy_wave.ogg').explode(1); }
    mechanicalFailure(x, y) { return this._emit(x, y, { speed: { min: 200, max: 400 }, rotate: { start: 0, end: 720 }, scale: { start: 0.5, end: 0.2 }, tint: 0x999999, lifespan: 2000, emitting: false }, 'metal_crash.ogg').explode(40); }
    digitalDeath(x, y) { return this._emit(x, y, { speed: { min: 100, max: 500 }, tint: [0x00ff00, 0x00ffaa], emitZone: { type: 'random', source: this.rectZone }, lifespan: 400, emitting: false }, 'glitch_short.ogg').explode(150); }
    overload(x, y) { return this._emit(x, y, { speed: { min: 700, max: 1200 }, angle: { min: 0, max: 360 }, scale: { start: 0.05, end: 2.5 }, tint: 0xffffff, blendMode: 'ADD', lifespan: 400, emitting: false }, 'electricity_zap.ogg').explode(30); }
    nebulaExplosion(x, y) { return this._emit(x, y, { speed: { min: 10, max: 60 }, scale: { start: 2, end: 6 }, alpha: { start: 0.5, end: 0 }, tint: 0xaa00ff, blendMode: 'SCREEN', lifespan: 3500, emitting: false }, 'low_rumble.ogg').explode(20); }
    photonDissolve(x, y) { return this._emit(x, y, { x: { min: x - 80, max: x + 80 }, speedY: { min: -200, max: -500 }, scale: { start: 0.4, end: 0 }, tint: 0xffffff, lifespan: 1800, emitting: false }, 'dissolve.ogg').explode(150); }

    /* ==========================================================
       SECCIÓN 3: GRATIFICACIÓN Y POWER-UPS
       ========================================================== */
    shieldUp(x, y) { return this._emit(x, y, { speed: { min: -100, max: -300 }, scale: { start: 0.5, end: 0 }, tint: 0x00aaff, blendMode: 'ADD', lifespan: 600, emitZone: { type: 'edge', source: new Phaser.Geom.Circle(0, 0, 50), quantity: 40 }, emitting: false }, 'shield_on.ogg').explode(40); }
    weaponUpgrade(x, y) { return this._emit(x, y, { angle: { min: 0, max: 360, step: 45 }, speed: 300, scale: { start: 1, end: 0 }, tint: 0xffd700, blendMode: 'ADD', lifespan: 500, emitting: false }, 'power_up_weapon.ogg', { duration: 100, intensity: 0.01 }).explode(16); }
    extraLife(x, y) { return this._emit(x, y, { speedY: -200, speedX: { min: -50, max: 50 }, scale: { start: 1, end: 0.2 }, alpha: { start: 1, end: 0 }, tint: 0xff66bb, lifespan: 1500, emitting: false }, 'one_up.ogg').explode(10); }
    nitroBoost(x, y) { return this._emit(x, y, { speedX: -800, speedY: { min: -20, max: 20 }, scale: { start: 0.4, end: 0 }, tint: [0xffffff, 0x00ffff], blendMode: 'ADD', lifespan: 300, emitting: false }, 'boost.ogg').explode(5); }
    collectItem(x, y) { return this._emit(x, y, { speed: { min: 50, max: 150 }, scale: { start: 0.3, end: 0 }, tint: 0xffff00, lifespan: 300, emitting: false }, 'coin.ogg').explode(12); }
    repair(x, y) { return this._emit(x, y, { x: { min: x - 20, max: x + 20 }, y: { min: y - 20, max: y + 20 }, speedY: -100, scale: { start: 0.5, end: 0 }, tint: 0x00ff00, lifespan: 800, emitting: false }, 'heal.ogg').explode(5); }
    levelUp(x, y) { this.scene.cameras.main.flash(500, 255, 215, 0); return this._emit(x, y, { speedY: { min: -1000, max: 1000 }, scale: { start: 0.1, end: 5 }, alpha: { start: 0.5, end: 0 }, tint: 0xffffff, blendMode: 'ADD', lifespan: 400, emitting: false }, 'level_up.ogg').explode(50); }
    magnetActive(x, y, targetShip) { const em = this._emit(x, y, { speed: 100, scale: { start: 0.2, end: 0 }, tint: 0xaaaaff, lifespan: 500, follow: true }, 'magnet_loop.ogg'); em.startFollow(targetShip); return em; }
    ghostMode(targetShip) { return this.scene.tweens.add({ targets: targetShip, alpha: 0.3, duration: 100, yoyo: true, repeat: -1 }); }
    phoenixRebirth(x, y) { this.scene.cameras.main.flash(1000, 255, 100, 0); return this._emit(x, y, { speed: { min: 100, max: 800 }, angle: { min: 0, max: 360 }, scale: { start: 0, end: 2 }, alpha: { start: 1, end: 0 }, tint: [0xff0000, 0xffaa00, 0xffffff], blendMode: 'ADD', lifespan: 1000, emitting: false }, 'phoenix_rebirth.ogg', { duration: 800, intensity: 0.04 }).explode(200); }

    /* ==========================================================
       SECCIÓN 4: CLIMA Y ATMÓSFERA (Persistentes)
       ========================================================== */
    starField(speed = 1000) { return this._emit(850, 0, { isWeather: true, x: 850, y: { min: 0, max: 600 }, speedX: -speed, scale: { start: 0.5, end: 0 }, alpha: { start: 0.8, end: 0.2 }, lifespan: 2000, frequency: 20 }); }
    spaceFog() { return this._emit(400, 300, { isWeather: true, emitZone: { type: 'random', source: this.rectZone }, speed: { min: 5, max: 20 }, scale: { start: 4, end: 8 }, alpha: { start: 0, end: 0.2, yoyo: true }, tint: 0x4400aa, lifespan: 5000, frequency: 500, blendMode: 'ADD' }); }
    acidRain() { return this._emit(400, -20, { isWeather: true, x: { min: 0, max: 800 }, speedY: 800, speedX: 200, scaleY: 2, scaleX: 0.1, tint: 0xccff00, alpha: 0.4, lifespan: 1000, frequency: 15 }, 'acid_hiss.ogg'); }
    spaceSnow() { return this._emit(400, -10, { isWeather: true, x: { min: 0, max: 800 }, speedY: { min: 50, max: 150 }, speedX: { min: -20, max: 20 }, scale: { start: 0.2, end: 0.4 }, rotate: { start: 0, end: 360 }, lifespan: 6000, frequency: 100 }); }
    volcanicHeat() { return this._emit(400, 620, { isWeather: true, x: { min: 0, max: 800 }, speedY: { min: -100, max: -300 }, speedX: { min: -50, max: 50 }, scale: { start: 0.3, end: 0 }, tint: [0xff4400, 0xffaa00], blendMode: 'ADD', lifespan: 3000, frequency: 80 }); }
}