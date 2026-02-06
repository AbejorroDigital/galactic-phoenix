/**
 * 🚀 GALACTIC PHOENIX FX ENGINE - OPTIMIZED V2
 * Compatible con: Phaser 3.60+
 */

const SHADER_FRAG = `
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

class DistortPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
    constructor(game) {
        super({
            game,
            name: 'Distort',
            fragShader: SHADER_FRAG,
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
        this.width = scene.scale.width;
        this.height = scene.scale.height;
        this.rectZone = new Phaser.Geom.Rectangle(0, 0, this.width, this.height);
        this.currentWeather = null;
        this.isDistortionActive = false;

        // Registro seguro del Pipeline
        if (this.scene.renderer.type === Phaser.WEBGL) {
            const renderer = this.scene.renderer;
            if (!renderer.pipelines.has('Distort')) {
                renderer.pipelines.addPostPipeline('Distort', DistortPipeline);
            }
        }
    }

    /**
     * NÚCLEO OPTIMIZADO: _emit
     * Gestiona la creación, sonido y limpieza automática basada en eventos.
     */
    _emit(x, y, config, soundKey, shakeConfig = null) {
        if (!this.scene || !this.scene.sys) return null; // Protección contra escena destruida

        // 1. Configuración por defecto para asegurar compatibilidad
        const texture = config.texture || 'flare';
        const isWeather = config.isWeather || false;
        const follow = config.follow || false;

        // 2. Crear emisor (Phaser 3.60+ crea el emisor directamente, no necesita manager previo para casos simples)
        const emitter = this.scene.add.particles(x, y, texture, config);

        // 3. Audio con variación (pitch/detune) para evitar monotonía
        if (soundKey && this.scene.cache.audio.exists(soundKey)) {
            this.scene.sound.play(soundKey, { 
                volume: config.volume || 0.5, 
                detune: Phaser.Math.Between(-600, 600) 
            });
        }

        // 4. Screen Shake
        if (shakeConfig) {
            this.scene.cameras.main.shake(shakeConfig.duration, shakeConfig.intensity);
        }

        // 5. Limpieza Inteligente (Garbage Collection Friendly)
        // Si no es clima y no sigue a nadie, se autodestruye al terminar las partículas.
        if (!isWeather && !follow) {
            // Calculamos el tiempo de vida máximo para forzar limpieza si el evento falla
            const maxLife = (config.lifespan?.max || config.lifespan || 1000) + 500;
            
            // Método A: Evento nativo (Más limpio en 3.60+)
            if (config.emitting === false || config.duration) {
                emitter.once('complete', () => {
                    if (emitter && emitter.active) emitter.destroy();
                });
            } 
            
            // Método B: Fallback de seguridad por tiempo
            this.scene.time.delayedCall(maxLife, () => {
                if (emitter && emitter.active) emitter.destroy();
            });
        }

        return emitter;
    }

    // --- SISTEMA DE POST-PROCESADO ---

    applyDistortion(duration = 500, intensity = 1.0) {
        if (this.scene.renderer.type !== Phaser.WEBGL) return;

        const cam = this.scene.cameras.main;
        
        // Evitar duplicar pipeline
        if (!cam.getPostPipeline('Distort')) {
            cam.setPostPipeline('Distort');
        }
        
        const pipeline = cam.getPostPipeline('Distort');
        if (pipeline) pipeline.uIntensity = intensity;
        
        this.isDistortionActive = true;

        if (duration < 90000) { 
            this.scene.time.delayedCall(duration, () => {
                if (cam && !cam.destroyed) {
                    cam.removePostPipeline('Distort');
                    this.isDistortionActive = false;
                }
            });
        }
    }

    updateAtmosphereForLevel(levelIndex) {
        // Limpieza previa
        if (this.currentWeather) {
            this.currentWeather.destroy();
            this.currentWeather = null;
        }
        
        // Limpiar distorsión si existía por clima anterior
        if(this.scene.renderer.type === Phaser.WEBGL) {
            this.scene.cameras.main.removePostPipeline('Distort');
        }

        // Selección de clima
        const weathers = {
            1: () => this.starField(800),
            2: () => this.spaceSnow(),
            3: () => this.acidRain(),
            4: () => {
                const w = this.volcanicHeat();
                this.applyDistortion(999999, 0.4);
                return w;
            },
            5: () => this.spaceFog()
        };

        const weatherFn = weathers[levelIndex] || (() => this.starField(400));
        this.currentWeather = weatherFn();
    }

    // ==========================================================
    // SECCIÓN 1: COMBATE (Standard & Explosions)
    // ==========================================================
    standard(x, y) { 
        return this._emit(x, y, { speed: { min: 100, max: 200 }, scale: { start: 0.6, end: 0 }, blendMode: 'ADD', lifespan: 600, tint: 0xffa500, emitting: false }).explode(20); 
    }
    
    plasma(x, y) { 
        return this._emit(x, y, { speed: { min: 50, max: 400 }, scale: { start: 0.8, end: 0 }, tint: [0x00ffff, 0x0000ff], blendMode: 'SCREEN', lifespan: 400, emitting: false }, 'explosion2.ogg').explode(30); 
    }
    
    sparks(x, y) { 
        return this._emit(x, y, { speed: { min: 200, max: 300 }, scale: { start: 0.2, end: 0 }, lifespan: 200, emitting: false, tint: 0xffff00 }, 'impact.ogg').explode(8); 
    }
    
    toxic(x, y) { 
        return this._emit(x, y, { speed: { min: 20, max: 50 }, scale: { start: 0.5, end: 2 }, alpha: { start: 0.5, end: 0 }, tint: 0x32cd32, lifespan: 1000, emitting: false }, 'gas_leak.ogg').explode(15); 
    }
    
    starNova(x, y) { 
        return this._emit(x, y, { speed: { min: -100, max: 600 }, scale: { start: 0, end: 1.5 }, blendMode: 'ADD', lifespan: 500, emitting: false }, 'big_boom.ogg', { duration: 200, intensity: 0.02 }).explode(40); 
    }
    
    debris(x, y) { 
        return this._emit(x, y, { speed: { min: 150, max: 250 }, gravityY: 400, scale: { start: 0.4, end: 0.1 }, tint: 0x666666, lifespan: 1000, emitting: false }, 'debris_fall.ogg').explode(10); 
    }
    
    // ==========================================================
    // SECCIÓN 2: JEFES Y EVENTOS MAYORES
    // ==========================================================
    chainReaction(x, y, count = 5) { 
        for(let i = 0; i < count; i++) { 
            this.scene.time.delayedCall(i * 200, () => this.standard(x + Phaser.Math.Between(-60, 60), y + Phaser.Math.Between(-60, 60))); 
        } 
    }
    
    blackHole(x, y) { 
        this.applyDistortion(1000, 4.0); 
        return this._emit(x, y, { speed: { min: -600, max: -200 }, scale: { start: 2.5, end: 0 }, tint: 0x220044, blendMode: 'MULTIPLY', lifespan: 1000, emitting: false }, 'vortex.ogg').explode(100); 
    }
    
    phoenixRise(x, y) { 
        return this._emit(x, y, { speedX: { min: -300, max: 300 }, speedY: { min: -100, max: -600 }, scale: { start: 1, end: 0 }, tint: [0xff4400, 0xffd700, 0xffffff], blendMode: 'ADD', lifespan: 1500, emitting: false, gravityY: -300 }, 'phoenix_shout.ogg', { duration: 500, intensity: 0.03 }).explode(120); 
    }
    
    bigBang(x, y) { 
        this.applyDistortion(1500, 3.0); 
        return this._emit(x, y, { speed: { min: 0, max: 1000 }, scale: { start: 1.5, end: 0 }, tint: 0xffffff, lifespan: 2500, emitting: false }, 'grand_explosion.ogg', { duration: 1500, intensity: 0.06 }).explode(400); 
    }

    mechanicalFailure(x, y) { 
        return this._emit(x, y, { speed: { min: 200, max: 400 }, rotate: { start: 0, end: 720 }, scale: { start: 0.5, end: 0.2 }, tint: 0x999999, lifespan: 2000, emitting: false }, 'metal_crash.ogg').explode(40); 
    }
    
    digitalDeath(x, y) { 
        return this._emit(x, y, { speed: { min: 100, max: 500 }, tint: [0x00ff00, 0x00ffaa], emitZone: { type: 'random', source: this.rectZone }, lifespan: 400, emitting: false }, 'glitch_short.ogg').explode(150); 
    }

    // ==========================================================
    // SECCIÓN 3: GRATIFICACIÓN (UI & PowerUps)
    // ==========================================================
    shieldUp(x, y) { 
        return this._emit(x, y, { speed: { min: -100, max: -300 }, scale: { start: 0.5, end: 0 }, tint: 0x00aaff, blendMode: 'ADD', lifespan: 600, emitZone: { type: 'edge', source: new Phaser.Geom.Circle(0, 0, 50), quantity: 40 }, emitting: false }, 'shield_on.ogg').explode(40); 
    }
    
    weaponUpgrade(x, y) { 
        return this._emit(x, y, { angle: { min: 0, max: 360, step: 45 }, speed: 300, scale: { start: 1, end: 0 }, tint: 0xffd700, blendMode: 'ADD', lifespan: 500, emitting: false }, 'power_up_weapon.ogg', { duration: 100, intensity: 0.01 }).explode(16); 
    }
    
    levelUp(x, y) { 
        this.scene.cameras.main.flash(500, 255, 215, 0); 
        return this._emit(x, y, { speedY: { min: -1000, max: 1000 }, scale: { start: 0.1, end: 5 }, alpha: { start: 0.5, end: 0 }, tint: 0xffffff, blendMode: 'ADD', lifespan: 400, emitting: false }, 'level_up.ogg').explode(50); 
    }

    magnetActive(x, y, targetShip) { 
        const em = this._emit(x, y, { speed: 100, scale: { start: 0.2, end: 0 }, tint: 0xaaaaff, lifespan: 500, follow: true }, 'magnet_loop.ogg'); 
        if(targetShip) em.startFollow(targetShip); 
        return em; 
    }

    ghostMode(targetShip) { 
        return this.scene.tweens.add({ targets: targetShip, alpha: 0.3, duration: 100, yoyo: true, repeat: -1 }); 
    }

    // ==========================================================
    // SECCIÓN 4: CLIMA (Persistentes con isWeather: true)
    // ==========================================================
    starField(speed = 1000) { 
        return this._emit(this.width + 50, 0, { isWeather: true, x: this.width + 50, y: { min: 0, max: this.height }, speedX: -speed, scale: { start: 0.5, end: 0 }, alpha: { start: 0.8, end: 0.2 }, lifespan: 2000, frequency: 20 }); 
    }
    
    spaceFog() { 
        return this._emit(this.width / 2, this.height / 2, { isWeather: true, emitZone: { type: 'random', source: this.rectZone }, speed: { min: 5, max: 20 }, scale: { start: 4, end: 8 }, alpha: { start: 0, end: 0.2, yoyo: true }, tint: 0x4400aa, lifespan: 5000, frequency: 500, blendMode: 'ADD' }); 
    }
    
    acidRain() { 
        return this._emit(this.width / 2, -20, { isWeather: true, x: { min: 0, max: this.width }, speedY: 800, speedX: 200, scaleY: 2, scaleX: 0.1, tint: 0xccff00, alpha: 0.4, lifespan: 1000, frequency: 15 }, 'acid_hiss.ogg'); 
    }
    
    spaceSnow() { 
        return this._emit(this.width / 2, -10, { isWeather: true, x: { min: 0, max: this.width }, speedY: { min: 50, max: 150 }, speedX: { min: -20, max: 20 }, scale: { start: 0.2, end: 0.4 }, rotate: { start: 0, end: 360 }, lifespan: 6000, frequency: 100 }); 
    }
    
    volcanicHeat() { 
        return this._emit(this.width / 2, this.height + 20, { isWeather: true, x: { min: 0, max: this.width }, speedY: { min: -100, max: -300 }, speedX: { min: -50, max: 50 }, scale: { start: 0.3, end: 0 }, tint: [0xff4400, 0xffaa00], blendMode: 'ADD', lifespan: 3000, frequency: 80 }); 
    }
}
