import { EVENTS } from '../core/Constants.js';
import Entity from './Entity.js';

/**
 * @class Boss
 * @extends Entity
 * @description Entidad enemiga de alto nivel optimizada con Galactic Phoenix FX.
 */
export default class Boss extends Entity {
    /**
     * @param {Phaser.Scene} scene - La escena a la que pertenece este jefe.
     */
    constructor(scene) {
        super(scene, 0, 0, 'boss_1');
        
        /** @type {boolean} */
        this.behaviorActive = false;
        /** @type {number} */
        this.fireTimer = 0;
        /** @type {Object} */
        this.currentPhase = null;
        
        // Referencia rápida al motor de efectos de la escena
        this.fx = scene.fx; 
    }

    /**
     * Inicializa al jefe y lanza la entrada dramática.
     */
    spawnBoss(config) {
        this.config = config;
        this.hp = config.hp;
        this.maxHp = config.hp;
        this.setTexture(config.sprite);
        this.setScale(config.visual_scale);
        this.resistances = config.resistances || {};

        // Posicionamiento inicial (fuera de pantalla)
        this.setPosition(this.scene.scale.width + 400, this.scene.scale.height / 2);
        this.setActive(true);
        this.setVisible(true);
        this.isDead = false;
        this.body.enable = true;
        this.clearTint();

        // Entrada triunfal con distorsión sutil
        if (this.fx) this.fx.applyDistortion(2000, 0.5);

        this.scene.tweens.add({
            targets: this,
            x: this.scene.scale.width - 200,
            duration: 3000,
            ease: 'Expo.easeOut',
            onComplete: () => {
                this.behaviorActive = true;
                // Efecto visual al activarse
                if (this.fx) this.fx.orbitalRing(this.x, this.y);
            }
        });
    }

    update(time, delta) {
        if (!this.active || !this.behaviorActive || this.isDead) return;

        this.handleMovement(time);
        this.handleCombat(time);
    }

    handleMovement(time) {
        const speed = this.config.speed || 100;
        const behavior = this.config.behavior;

        if (behavior === 'vertical_bounce') {
            const vy = Math.sin(time * 0.002) * speed;
            this.body.setVelocity(0, vy);
        } else if (behavior === 'figure_eight') {
            const vy = Math.sin(time * 0.002) * speed;
            const vx = Math.cos(time * 0.001) * (speed / 2);
            this.body.setVelocity(vx, vy);
        }
    }

    handleCombat(time) {
        const hpPercent = this.hp / this.maxHp;
        const phases = this.config.phases;
        if (!phases || phases.length === 0) return;

        // Determinar fase actual
        const nextPhase = phases.reduce((prev, curr) => {
            return (hpPercent <= curr.hp_threshold) ? curr : prev;
        }, phases[0]);

        // Si cambiamos de fase, lanzamos un efecto de "enfado"
        if (this.currentPhase !== nextPhase) {
            this.currentPhase = nextPhase;
            this.onPhaseChange();
        }

        if (time > this.fireTimer) {
            this.shoot(this.currentPhase.weapon);
            this.fireTimer = time + this.currentPhase.fire_rate;
        }
    }

    /**
     * Feedback visual cuando el jefe entra en una nueva fase de dificultad
     */
    onPhaseChange() {
        if (!this.fx) return;
        
        // Flash rojo y chispas masivas
        this.scene.cameras.main.flash(300, 255, 0, 0);
        this.fx.overload(this.x, this.y);
        
        // Si está muy bajo de vida (Fase final), activamos una distorsión persistente
        if (this.hp / this.maxHp < 0.3) {
            this.fx.applyDistortion(1000, 1.5);
            this.setTint(0xff8888);
        }
    }

    shoot(weaponKey) {
        if (!this.scene.enemiesBullets) return;

        const bullet = this.scene.enemiesBullets.get();
        if (bullet) {
            // Ajuste de posición de disparo según el sprite
            bullet.fire(this.x - 80, this.y, weaponKey, false);
            
            // Efecto de disparo si es una fase avanzada
            if (this.hp / this.maxHp < 0.5 && this.fx) {
                this.fx.sparks(this.x - 60, this.y);
            }
        }
    }

    /**
     * Sobreescritura de takeDamage para añadir feedback visual metálico
     */
    takeDamage(stats) {
        super.takeDamage(stats);
        
        // Cada vez que recibe daño, hay una probabilidad de soltar "debris" (escombros)
        if (this.fx && Phaser.Math.Between(0, 10) > 7) {
            this.fx.debris(this.x, this.y);
        }
    }

    /**
     * Secuencia de muerte épica utilizando el Phoenix FX Engine
     */
    die() {
        if (this.isDead) return;
        this.isDead = true;
        this.behaviorActive = false;
        this.body.stop();
        this.body.enable = false;

        // 1. Iniciamos distorsión de agujero negro
        if (this.fx) {
            this.fx.applyDistortion(2000, 3.0);
            
            // 2. Explosiones en cadena (Chain Reaction)
            this.fx.chainReaction(this.x, this.y, 10);
            
            // 3. Efectos de fallo mecánico mientras explota
            this.scene.time.addEvent({
                delay: 200,
                repeat: 5,
                callback: () => this.fx.mechanicalFailure(
                    this.x + Phaser.Math.Between(-50, 50),
                    this.y + Phaser.Math.Between(-50, 50)
                )
            });
        }

        // Tintado de agonía
        this.setTint(0xff0000);

        // 4. Explosión final definitiva (Big Bang)
        this.scene.time.delayedCall(1500, () => {
            if (this.fx) {
                this.fx.bigBang(this.x, this.y);
                this.fx.nebulaExplosion(this.x, this.y);
            }

            // Notificar eventos de juego
            this.scene.events.emit(EVENTS.BOSS_DEFEATED, this.config.name);
            this.scene.events.emit(EVENTS.SCORE_CHANGE, 5000);
            
            // Destrucción física del objeto
            super.die();
        });
    }
}
