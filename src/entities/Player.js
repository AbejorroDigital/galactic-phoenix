import { EVENTS } from '../core/Constants.js';
import Entity from './Entity.js';

/**
 * @typedef {Object} PlayerStats
 * @property {number} speed - La velocidad de movimiento de la nave.
 * @property {number} fire_rate - El retraso entre disparos en milisegundos.
 * @property {number} luck - Probabilidad de encontrar powerups.
 * @property {number} visual_scale - Factor de escala para el sprite de la nave.
 */

/**
 * @class Player
 * @extends Entity
 * @description El personaje principal controlado por el jugador. Maneja movimiento, combate y gestión de recursos.
 * 
 * @fires EVENTS.PLAYER_HIT
 * @fires EVENTS.PLAYER_SHIELD
 * @fires EVENTS.LIFE_CHANGE
 * @fires EVENTS.WEAPON_CHANGE
 * @fires EVENTS.GAME_OVER
 * 
 * @example
 * const player = new Player(scene, 100, 300);
 * scene.add.existing(player);
 */
export default class Player extends Entity {
    /**
     * @param {Phaser.Scene} scene - La escena a la que pertenece este jugador.
     * @param {number} x - Posición horizontal de aparición.
     * @param {number} y - Posición vertical de aparición.
     */
    constructor(scene, x, y) {
        // Pasamos 'ship' como textura base al constructor de Entity
        super(scene, x, y, 'ship');

        // Acceso seguro a los datos del JSON
        const playerData = scene.cache.json.get('player');
        // El JSON puede venir anidado bajo 'player' o directamente
        const data = (playerData && playerData.player) ? playerData.player : (playerData || {});

        /** 
         * Estadísticas base cargadas desde JSON.
         * @type {PlayerStats} 
         */
        this.statsBase = {
            speed: data.speed || 300,
            fire_rate: data.fire_rate || 250,
            luck: data.luck || 15,
            visual_scale: data.visual_scale || 0.8
        };

        /** 
         * Estadísticas modificadas actuales.
         * @type {PlayerStats} 
         */
        this.currentStats = { ...this.statsBase };

        /** 
         * Resistencia a diferentes tipos de daño.
         * @type {Object.<string, number>} 
         */
        this.resistances = data.resistances || {
            fisico: 1.0,
            laser: 1.0,
            ionico: 1.0,
            plasma: 1.0,
            espiritual: 1.0
        };

        /** @type {string} */
        this.currentWeapon = data.starting_weapon || 'basic_cannon';

        /** @type {number} */
        this.hp = data.hp || data.max_hp || 100;
        /** @type {number} */
        this.maxHp = data.max_hp || 100;
        /** @type {number} */
        this.shield = data.base_shields || 0;
        /** @type {number} */
        this.maxShield = data.base_shields || 0;

        this.setScale(this.statsBase.visual_scale);
        this.setCollideWorldBounds(true);

        /** @type {number} */
        this.lastFired = 0;
        /** @type {boolean} */
        this.canShoot = true;
        /** @type {boolean} */
        this.isInvulnerable = false;
        /** @type {number} */
        this.invulnerabilityTime = data.invulnerability_time || 1500;

        /** @type {Phaser.GameObjects.Particles.ParticleEmitter|null} */
        this.engineEmitter = null;
        if (scene.add.particles) {
            const quality = scene.registry.get('graphicsQuality') || 1;
            // 0: BAJA (frecuencia 100ms), 1: MEDIA (20ms), 2: ALTA (8ms o frame)
            const frequency = quality === 0 ? 100 : (quality === 1 ? 20 : 8);

            this.engineEmitter = scene.add.particles(0, 0, 'flare', {
                speed: { min: 40, max: 80 },
                scale: { start: 0.2, end: 0 },
                alpha: { start: 0.6, end: 0 },
                lifespan: 400,
                blendMode: 'ADD',
                follow: this,
                followOffset: { x: -25, y: 0 },
                frequency: frequency
            });
        }

        // Listen for settings changes to update particles mid-game
        scene.game.events.on('settings-changed', (settings) => {
            if (this.engineEmitter && this.active) {
                const q = settings.graphicsQuality;
                const freq = q === 0 ? 100 : (q === 1 ? 20 : 8);
                this.engineEmitter.setConfig({ frequency: freq });
            }
        });

        // Esperamos un tick para asegurar que UIScene esté lista para escuchar
        if (scene.events && typeof scene.events.once === 'function') {
            scene.events.once('update', () => this.emitStatus());
        }
    }

    /**
     * Bucle principal de actualización para el jugador. Maneja las entradas de movimiento y disparo.
     * @param {Phaser.Types.Input.Keyboard.CursorKeys} cursors - Mapeo de teclas de entrada.
     * @param {number} time - Tiempo actual del juego.
     */
    update(cursors, time) {
        if (this.isDead || !this.active) return;
        // ... (resto del método update igual)

        this.body.setVelocity(0);

        const speed = this.currentStats.speed;
        let targetAngle = 0;

        if (cursors.left.isDown) {
            this.body.setVelocityX(-speed);
            targetAngle = -5;
        } else if (cursors.right.isDown) {
            this.body.setVelocityX(speed);
            targetAngle = 5;
        }

        if (cursors.up.isDown) {
            this.body.setVelocityY(-speed);
            targetAngle -= 10;
        } else if (cursors.down.isDown) {
            this.body.setVelocityY(speed);
            targetAngle += 10;
        }

        // Suavizar la rotación (lerp)
        const lerpFactor = 0.1;
        this.angle = Phaser.Math.Linear(this.angle, targetAngle, lerpFactor);

        if (cursors.space.isDown && this.canShoot && time > this.lastFired) {
            this.shoot(time);
        }
    }

    /**
     * Ejecuta la lógica de disparo de la nave.
     * @param {number} time - Tiempo actual del juego para el control de la cadencia de fuego.
     */
    shoot(time) {
        // Verificamos que exista el grupo de balas en la escena
        if (!this.scene.playerBullets) return;

        const bullet = this.scene.playerBullets.get();
        if (bullet) {
            // El fuego del jugador siempre va hacia la derecha
            bullet.fire(this.x + 30, this.y, this.currentWeapon, true);
            this.lastFired = time + (this.currentStats.fire_rate || 150);

            // Reproducir sonido de disparo
            if (this.scene.audioManager) {
                this.scene.audioManager.playSFX('sfx_shot', { volume: 0.3 });
            }
        }
    }

    /**
     * Modifica temporal o permanentemente una estadística del jugador.
     * @param {keyof PlayerStats} statKey - La estadística a modificar.
     * @param {number} value - La cantidad a sumar (puede ser negativa).
     * @param {number} [duration] - Duración opcional en ms para mejoras temporales.
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
     * Restaura puntos de escudo.
     * @param {number} amount - Cantidad de escudo a recuperar.
     * @fires EVENTS.PLAYER_SHIELD
     */
    recoverShield(amount) {
        this.shield = Math.min(this.shield + amount, this.maxShield);
        this.scene.events.emit(EVENTS.PLAYER_SHIELD, this.shield, this.maxShield);
    }

    /**
     * Equipa una nueva arma.
     * @param {string} weaponId - El ID del arma a equipar.
     * @fires EVENTS.WEAPON_CHANGE
     */
    equipWeapon(weaponId) {
        this.currentWeapon = weaponId;
        // El evento WEAPON_CHANGE debe estar definido en Constants.js
        this.scene.events.emit(EVENTS.WEAPON_CHANGE, weaponId);
    }

    /**
     * Procesa el daño recibido por el jugador, aplicando primero la reducción de escudo.
     * @param {Object} projectileStats - Estadísticas del proyectil o impacto.
     * @param {number} projectileStats.damage - Cantidad de daño base.
     * @param {string} [projectileStats.type] - Tipo de daño para la comprobación de resistencia.
     * @fires EVENTS.PLAYER_HIT
     * @fires EVENTS.PLAYER_SHIELD
     */
    takeDamage(projectileStats) {
        if (!projectileStats || this.isDead || this.isInvulnerable) return;

        let incomingDamage = projectileStats.damage || 0;

        // Lógica de Escudos
        if (this.shield > 0) {
            const damageToShield = Math.min(this.shield, incomingDamage);
            this.shield -= damageToShield;
            incomingDamage -= damageToShield;
            this.scene.events.emit(EVENTS.PLAYER_SHIELD, this.shield, this.maxShield);
        }

        // Daño restante a la salud a través de la clase Entity
        if (incomingDamage > 0) {
            super.takeDamage({ ...projectileStats, damage: incomingDamage });
            this.scene.events.emit(EVENTS.PLAYER_HIT, { current: this.hp, max: this.maxHp });
        }

        if (this.hp <= 0 && !this.isDead) {
            this.handleDeath();
        }
    }

    /**
     * Trigger de muerte del jugador. Sobrescribe Entity.die para manejar el sistema de vidas.
     */
    die() {
        // En el Jugador, die() es el trigger para handleDeath
        // Pero debemos ser cuidadosos para no entrar en bucle
        if (this.isDead) return;
        this.handleDeath();
    }

    /**
     * Manejador interno de muerte. Gestiona visibilidad, vidas y temporizador de reaparición.
     * @fires EVENTS.LIFE_CHANGE
     * @fires EVENTS.GAME_OVER
     */
    handleDeath() {
        try {
            if (typeof window !== 'undefined' && window.DEBUG_LOGGER) {
                window.DEBUG_LOGGER.log('death', '=== handleDeath() CALLED ===');
                window.DEBUG_LOGGER.logPlayerState(this, 'BEFORE handleDeath');
            }

            if (this.isDead) {
                if (typeof window !== 'undefined' && window.DEBUG_LOGGER) {
                    window.DEBUG_LOGGER.log('death', 'Already dead, returning early');
                }
                return;
            }

            if (typeof window !== 'undefined' && window.DEBUG_LOGGER) {
                window.DEBUG_LOGGER.log('death', 'Setting isDead = true');
            }
            this.isDead = true;

            if (this.body) {
                if (typeof window !== 'undefined' && window.DEBUG_LOGGER) {
                    window.DEBUG_LOGGER.log('death', 'Stopping player movement');
                }
                this.body.enable = false;
                this.body.setVelocity(0, 0);
            } else {
                if (typeof window !== 'undefined' && window.DEBUG_LOGGER) {
                    window.DEBUG_LOGGER.logCriticalError('handleDeath - body check', new Error('NO BODY FOUND'));
                }
            }

            try {
                if (typeof window !== 'undefined' && window.DEBUG_LOGGER) {
                    window.DEBUG_LOGGER.log('particle', 'Stopping engine particles');
                }
                if (this.engineEmitter) {
                    this.engineEmitter.stop();
                } else {
                    if (typeof window !== 'undefined' && window.DEBUG_LOGGER) {
                        window.DEBUG_LOGGER.log('death', 'NO ENGINE EMITTER FOUND');
                    }
                }
            } catch (e) {
                if (typeof window !== 'undefined' && window.DEBUG_LOGGER) {
                    window.DEBUG_LOGGER.logCriticalError('engineEmitter.stop()', e);
                }
            }

            try {
                if (typeof window !== 'undefined' && window.DEBUG_LOGGER) {
                    window.DEBUG_LOGGER.log('death', 'Hiding player sprite');
                }
                this.setVisible(false);
                this.setActive(false);
                if (typeof window !== 'undefined' && window.DEBUG_LOGGER) {
                    window.DEBUG_LOGGER.logSpriteState(this, 'AFTER setVisible(false)');
                }
            } catch (e) {
                if (typeof window !== 'undefined' && window.DEBUG_LOGGER) {
                    window.DEBUG_LOGGER.logCriticalError('setVisible(false)', e);
                }
            }

            if (typeof window !== 'undefined' && window.DEBUG_LOGGER) {
                window.DEBUG_LOGGER.log('death', 'Body disabled', { bodyEnabled: false });
            }

            // Asegurar que la UI sepa que tenemos 0 HP
            this.scene.events.emit(EVENTS.PLAYER_HIT, { current: 0, max: this.maxHp });

            if (this.scene.lives > 0) {
                const livesBefore = this.scene.lives;
                if (typeof window !== 'undefined' && window.DEBUG_LOGGER) {
                    window.DEBUG_LOGGER.log('death', 'Decrementing lives', { before: livesBefore, after: livesBefore - 1 });
                }
                this.scene.lives--;
                this.scene.events.emit(EVENTS.LIFE_CHANGE, this.scene.lives);

                if (this.scene.lives <= 0) {
                    if (typeof window !== 'undefined' && window.DEBUG_LOGGER) {
                        window.DEBUG_LOGGER.log('death', '=== GAME OVER - NO LIVES REMAINING ===');
                    }
                    this.scene.events.emit(EVENTS.GAME_OVER);
                } else {
                    if (typeof window !== 'undefined' && window.DEBUG_LOGGER) {
                        window.DEBUG_LOGGER.log('death', `Will respawn in 1500ms. ${this.scene.lives} lives remaining`);
                    }
                    // Reaparición automática tras un retraso si quedan vidas
                    this.scene.time.delayedCall(1500, () => {
                        try {
                            if (this.active === false || this.isDead) this.respawn();
                        } catch (e) {
                            if (typeof window !== 'undefined' && window.DEBUG_LOGGER) {
                                window.DEBUG_LOGGER.logCriticalError('delayedCall - respawn', e);
                            }
                        }
                    });
                }
            } else {
                if (typeof window !== 'undefined' && window.DEBUG_LOGGER) {
                    window.DEBUG_LOGGER.log('death', '=== GAME OVER - NO LIVES REMAINING ===');
                }
                this.scene.events.emit(EVENTS.GAME_OVER);
            }
        } catch (error) {
            if (typeof window !== 'undefined' && window.DEBUG_LOGGER) {
                window.DEBUG_LOGGER.logCriticalError('handleDeath - TOP LEVEL', error);
            }
            this.scene.events.emit(EVENTS.GAME_OVER);
        }
    }

    /**
     * Resucita al jugador en la posición de aparición.
     * @fires EVENTS.PLAYER_HEAL
     */
    respawn() {
        if (typeof window !== 'undefined' && window.DEBUG_LOGGER) {
            window.DEBUG_LOGGER.log('death', '=== respawn() CALLED ===');
        }

        try {
            if (typeof window !== 'undefined' && window.DEBUG_LOGGER) {
                window.DEBUG_LOGGER.log('death', 'Resetting HP to max');
            }
            this.hp = this.maxHp;
            this.isDead = false;
            this.setActive(true);
            this.active = true;
            this.setVisible(true);

            if (typeof window !== 'undefined' && window.DEBUG_LOGGER) {
                window.DEBUG_LOGGER.log('death', 'Making player visible');
            }

            if (this.body) {
                if (typeof window !== 'undefined' && window.DEBUG_LOGGER) {
                    window.DEBUG_LOGGER.log('death', 'Re-enabling physics body');
                }
                this.body.enable = true;
            }

            // Posición de aparición desde JSON o fallback
            if (typeof window !== 'undefined' && window.DEBUG_LOGGER) {
                window.DEBUG_LOGGER.log('death', 'Resetting position');
            }
            const playerData = this.scene.cache.json.get('player');
            const data = (playerData && playerData.player) ? playerData.player : (playerData || {});
            const spawn = data.spawn_position || { x: 100, y: 300 };
            this.setPosition(spawn.x, spawn.y);

            if (typeof window !== 'undefined' && window.DEBUG_LOGGER) {
                window.DEBUG_LOGGER.log('death', 'Restarting engine particles');
            }
            if (this.engineEmitter) this.engineEmitter.start();

            if (typeof window !== 'undefined' && window.DEBUG_LOGGER) {
                window.DEBUG_LOGGER.log('death', 'Starting invulnerability flash effect');
            }
            this.setInvulnerable(3000);
            this.emitStatus();

            // Emitir evento de curación para la UI
            this.scene.events.emit(EVENTS.PLAYER_HEAL, {
                current: this.hp,
                max: this.maxHp
            });
        } catch (error) {
            if (typeof window !== 'undefined' && window.DEBUG_LOGGER) {
                window.DEBUG_LOGGER.logCriticalError('respawn() - TOP LEVEL', error);
            }
        }
    }

    /**
     * Establece al jugador como invulnerable durante una duración específica con un parpadeo visual.
     * @param {number} duration - Tiempo en milisegundos.
     */
    setInvulnerable(duration) {
        this.isInvulnerable = true;

        // Efecto visual de parpadeo
        this.scene.tweens.add({
            targets: this,
            alpha: 0.5,
            duration: 100,
            yoyo: true,
            repeat: duration / 200
        });

        this.scene.time.delayedCall(duration, () => {
            if (this.active) {
                this.isInvulnerable = false;
                this.setAlpha(1);
            }
        });
    }

    /**
     * Añade vidas extra al jugador.
     * @param {number} [amount=1] - Número de vidas a añadir.
     * @fires EVENTS.LIFE_CHANGE
     */
    addLife(amount = 1) {
        if (this.scene && this.scene.lives === undefined) {
            this.scene.lives = 3;
        }
        this.scene.lives += amount;
        this.scene.events.emit(EVENTS.LIFE_CHANGE, this.scene.lives);
    }

    /**
     * Emite eventos de estado actual de salud y escudo.
     * @fires EVENTS.PLAYER_HIT
     * @fires EVENTS.PLAYER_SHIELD
     */
    emitStatus() {
        if (this.scene && this.scene.events) {
            this.scene.events.emit(EVENTS.PLAYER_HIT, { current: this.hp, max: this.maxHp });
            this.scene.events.emit(EVENTS.PLAYER_SHIELD, this.shield, this.maxShield);
        }
    }
}
