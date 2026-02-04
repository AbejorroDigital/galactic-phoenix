import { EVENTS } from '../core/Constants.js';
import Entity from './Entity.js';
import PlayerVFX from './PlayerVFX.js';
import PlayerHealth from './PlayerHealth.js';

/**
 * @class Player
 * @extends Entity
 * @description Entidad del jugador con soporte para módulos de salud, VFX y 
 * sistema de estadísticas dinámico.
 */
export default class Player extends Entity {
    /**
     * @param {Phaser.Scene} scene - Escena GameScene.
     * @param {number} x - Posición X inicial.
     * @param {number} y - Posición Y inicial.
     */
    constructor(scene, x, y) {
        super(scene, x, y, 'ship');

        // --- Carga de Configuración ---
        const playerData = scene.cache.json.get('player');
        const data = playerData?.player || playerData || {};

        // --- Estado y Estadísticas ---
        this.statsBase = {
            speed: data.speed || 300,
            fire_rate: data.fire_rate || 250,
            luck: data.luck || 15,
            visual_scale: data.visual_scale || 0.8
        };
        
        this.currentStats = { ...this.statsBase };
        this.hp = data.hp || data.max_hp || 100;
        this.maxHp = data.max_hp || 100;
        this.shield = data.base_shields || 0;
        this.maxShield = data.base_shields || 0;
        this.currentWeapon = data.starting_weapon || 'basic_cannon';
        
        this.isDead = false;
        this.isInvulnerable = false;
        this.lastFired = 0;
        this.canShoot = true;

        // --- Referencia a Motores Externos ---
        this.fx = scene.fx; // Galactic Phoenix FX Engine

        // --- Módulos Auxiliares ---
        // Se pasan las referencias necesarias para la delegación de responsabilidades
        this.vfx = new PlayerVFX(this);
        this.health = new PlayerHealth(this);

        // --- Configuración Física y Visual ---
        this.setScale(this.statsBase.visual_scale);
        this.setCollideWorldBounds(true);
        this.body.setMass(1);

        // --- Listeners de Configuración ---
        scene.game.events.on('settings-changed', (s) => {
            if (this.vfx?.updateQuality) this.vfx.updateQuality(s.graphicsQuality);
        });

        // Emitir estado inicial una vez que la escena esté lista
        scene.events.once('update', () => this.emitStatus());
    }

    /**
     * Gestión de movimiento y entrada.
     * @param {Phaser.Input.Keyboard.CursorKeys} cursors 
     * @param {number} time 
     */
    update(cursors, time) {
        if (this.isDead || !this.active) return;

        this.handleMovement(cursors);
        
        // Lógica de disparo
        if (cursors.space.isDown && this.canShoot && time > this.lastFired) {
            this.shoot(time);
        }
    }

    /**
     * Maneja el desplazamiento y la inclinación visual de la nave.
     */
    handleMovement(cursors) {
        this.body.setVelocity(0);
        const speed = this.currentStats.speed;
        let targetAngle = 0;

        // Movimiento Horizontal
        if (cursors.left.isDown) {
            this.body.setVelocityX(-speed);
            targetAngle = -5;
        } else if (cursors.right.isDown) {
            this.body.setVelocityX(speed);
            targetAngle = 5;
        }

        // Movimiento Vertical
        if (cursors.up.isDown) {
            this.body.setVelocityY(-speed);
            targetAngle -= 10;
        } else if (cursors.down.isDown) {
            this.body.setVelocityY(speed);
            targetAngle += 10;
        }

        // Suavizado de la inclinación (Lerp manual)
        this.angle = Phaser.Math.Linear(this.angle, targetAngle, 0.15);
    }

    /**
     * Ejecuta el disparo del arma actual.
     */
    shoot(time) {
        if (!this.scene.playerBullets) return;

        const bullet = this.scene.playerBullets.get();
        if (bullet) {
            bullet.fire(this.x + 30, this.y, this.currentWeapon, true);
            this.lastFired = time + (this.currentStats.fire_rate || 150);
            
            // Efecto local de disparo (opcional, si el arma lo requiere)
            if (this.fx) {
                // Podríamos añadir un pequeño flash de hocico aquí
            }

            if (this.scene.audioManager) {
                this.scene.audioManager.playSFX('sfx_shot', { volume: 0.2 });
            }
        }
    }

    // --- Métodos de Interfaz (Bridge) ---

    /**
     * Delega el daño al módulo de salud.
     */
    takeDamage(stats) {
        if (this.isInvulnerable || this.isDead) return;
        this.health.takeDamage(stats);
    }

    /**
     * Llamado por PlayerHealth para aplicar el daño real tras procesar escudos.
     */
    applyBaseDamage(stats) {
        super.takeDamage(stats);
        
        // Feedback visual global al recibir daño
        if (this.fx) {
            this.fx.sparks(this.x, this.y);
            this.scene.cameras.main.shake(100, 0.01);
        }
    }

    /**
     * Proceso de re-entrada de la nave tras morir.
     */
    respawn() {
        this.hp = this.maxHp;
        this.isDead = false;
        this.setActive(true);
        this.setVisible(true);
        this.setAlpha(1);
        if (this.body) this.body.enable = true;

        const playerData = this.scene.cache.json.get('player');
        const spawn = playerData?.player?.spawn_position || { x: 100, y: 300 };
        this.setPosition(spawn.x, spawn.y);

        // Reiniciar sistemas visuales
        this.vfx.startEngine();
        this.setInvulnerable(3000);
        
        // Feedback de resurrección
        if (this.fx) this.fx.orbitalRing(this.x, this.y);
        
        this.emitStatus();
        this.scene.events.emit(EVENTS.PLAYER_HEAL, { current: this.hp, max: this.maxHp });
    }

    /**
     * Activa estado de invulnerabilidad temporal.
     */
    setInvulnerable(duration) {
        this.isInvulnerable = true;
        this.vfx.playFlash(duration);
        
        this.scene.time.delayedCall(duration, () => {
            if (this.active) this.isInvulnerable = false;
        });
    }

    /**
     * Incrementa o recupera escudos.
     */
    recoverShield(amount) {
        this.shield = Math.min(this.shield + amount, this.maxShield);
        this.scene.events.emit(EVENTS.PLAYER_SHIELD, this.shield, this.maxShield);
        
        if (this.fx) this.fx.plasma(this.x, this.y); // Efecto de recarga
    }

    /**
     * Cambia el arma actual del jugador.
     */
    equipWeapon(weaponId) {
        this.currentWeapon = weaponId;
        this.scene.events.emit(EVENTS.WEAPON_CHANGE, weaponId);
        
        if (this.fx) this.fx.weaponUpgrade(this.x, this.y);
    }

    /**
     * Modifica estadísticas (velocidad, cadencia, etc) temporal o permanentemente.
     */
    applyStatMod(statKey, value, duration) {
        if (this.currentStats[statKey] !== undefined) {
            this.currentStats[statKey] += value;
            
            if (duration) {
                this.scene.time.delayedCall(duration, () => {
                    if (this.active) this.currentStats[statKey] -= value;
                });
            }
        }
    }

    /**
     * Sincroniza el estado del jugador con la UI.
     */
    emitStatus() {
        if (!this.scene?.events) return;
        
        this.scene.events.emit(EVENTS.PLAYER_HIT, { 
            current: this.hp, 
            max: this.maxHp 
        });
        this.scene.events.emit(EVENTS.PLAYER_SHIELD, this.shield, this.maxShield);
    }

    /**
     * Inicia la secuencia de destrucción.
     */
    die() {
        if (this.isDead) return;
        
        // Delegar muerte al módulo de salud
        this.health.handleDeath();
        
        // Efectos de muerte cinematográficos
        if (this.fx) {
            this.fx.mechanicalFailure(this.x, this.y);
            this.fx.applyDistortion(1000, 1.0);
        }
    }
}
