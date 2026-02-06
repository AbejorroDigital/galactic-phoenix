import { EVENTS } from '../core/Constants.js';
import Entity from './Entity.js';
import PlayerHealth from './PlayerHealth.js';
import PlayerVFX from './PlayerVFX.js';

export default class Player extends Entity {
    constructor(scene, x, y) {
        super(scene, x, y, 'ship');

        const playerData = scene.cache.json.get('player');
        const data = (playerData && playerData.player) ? playerData.player : (playerData || {});

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

        // --- Sistema de Aura de PowerUp ---
        this.powerupAura = null;
        this.powerupAuraTween = null;

        // --- Módulos Auxiliares ---
        this.vfx = new PlayerVFX(this);
        this.health = new PlayerHealth(this);

        this.setScale(this.statsBase.visual_scale);
        this.setCollideWorldBounds(true);

        // --- Eventos de Configuración y UI ---
        scene.game.events.on('settings-changed', (s) => this.vfx.updateQuality(s.graphicsQuality));
        if (scene.events) scene.events.once('update', () => this.emitStatus());
    }

    update(cursors, time) {
        if (this.isDead || !this.active) return;

        this.body.setVelocity(0);
        const speed = this.currentStats.speed;
        let targetAngle = 0;

        if (cursors.left.isDown) { this.body.setVelocityX(-speed); targetAngle = -5; }
        else if (cursors.right.isDown) { this.body.setVelocityX(speed); targetAngle = 5; }

        if (cursors.up.isDown) { this.body.setVelocityY(-speed); targetAngle -= 10; }
        else if (cursors.down.isDown) { this.body.setVelocityY(speed); targetAngle += 10; }

        this.angle = Phaser.Math.Linear(this.angle, targetAngle, 0.1);

        if (cursors.space.isDown && this.canShoot && time > this.lastFired) {
            this.shoot(time);
        }

        // Sincronizar posición del aura si existe
        if (this.powerupAura && this.powerupAura.active) {
            this.powerupAura.setPosition(this.x, this.y);
        }
    }

    shoot(time) {
        if (!this.scene.playerBullets) return;
        const bullet = this.scene.playerBullets.get();
        if (bullet) {
            bullet.fire(this.x + 30, this.y, this.currentWeapon, true);
            this.lastFired = time + (this.currentStats.fire_rate || 150);
            if (this.scene.audioManager) this.scene.audioManager.playSFX('sfx_shot', { volume: 0.3 });
        }
    }

    // --- Métodos de Interfaz (Bridge para evitar crasheos) ---

    takeDamage(stats) { this.health.takeDamage(stats); }

    addLife(amount = 1) { this.health.addLife(amount); }

    // Necesario para que PlayerHealth pueda llamar al daño base de Entity
    applyBaseDamage(stats) { super.takeDamage(stats); }

    respawn() {
        this.hp = this.maxHp;
        this.isDead = false;
        this.canShoot = true; // <--- AÑADE ESTA LÍNEA AQUÍ
        this.setActive(true);
        this.setVisible(true);
        if (this.body) this.body.enable = true;

        const playerData = this.scene.cache.json.get('player');
        const spawn = playerData?.player?.spawn_position || { x: 100, y: 300 };
        this.setPosition(spawn.x, spawn.y);

        this.vfx.startEngine();
        this.setInvulnerable(3000);
        this.emitStatus();
        this.scene.events.emit(EVENTS.PLAYER_HEAL, { current: this.hp, max: this.maxHp });
    }

    setInvulnerable(duration) {
        this.isInvulnerable = true;
        this.vfx.playFlash(duration);
        this.scene.time.delayedCall(duration, () => {
            if (this.active) this.isInvulnerable = false;
        });
    }

    recoverShield(amount) {
        this.shield = Math.min(this.shield + amount, this.maxShield);
        this.scene.events.emit(EVENTS.PLAYER_SHIELD, this.shield, this.maxShield);
    }

    equipWeapon(weaponId) {
        this.currentWeapon = weaponId;
        this.scene.events.emit(EVENTS.WEAPON_CHANGE, weaponId);
    }

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

    emitStatus() {
        if (this.scene?.events) {
            this.scene.events.emit(EVENTS.PLAYER_HIT, { current: this.hp, max: this.maxHp });
            this.scene.events.emit(EVENTS.PLAYER_SHIELD, this.shield, this.maxShield);
        }
    }

    die() { if (!this.isDead) this.health.handleDeath(); }

    /**
     * Muestra un aura visual alrededor del jugador cuando recoge un powerup
     * @param {string} type - Tipo de powerup (heal, shield, weapon, stat_boost)
     * @param {number} duration - Duración del efecto en ms
     */
    showPowerupAura(type, duration = 5000) {
        // Limpiar aura anterior si existe
        this.clearPowerupAura();

        // Mapeo de colores por tipo
        const auraColors = {
            'heal': 0x00FF00,       // Verde
            'shield': 0x00BFFF,     // Azul cielo
            'weapon': 0xFFD700,     // Dorado
            'stat_boost': 0xFF00FF, // Magenta
            'stat_mod': 0xFF00FF,   // Magenta
            'life': 0xFFFFFF        // Blanco
        };

        const color = auraColors[type] || 0xFFFFFF;

        // Crear círculo de aura
        this.powerupAura = this.scene.add.circle(0, 0, 35, color, 0.2)
            .setDepth(29); // DEPTH.PLAYER_AURA

        // Animación de pulso
        this.powerupAuraTween = this.scene.tweens.add({
            targets: this.powerupAura,
            alpha: 0.4,
            scale: 1.1,
            duration: 600,
            yoyo: true,
            repeat: Math.floor(duration / 1200)
        });

        // Auto-destrucción después de la duración
        this.scene.time.delayedCall(duration, () => {
            this.clearPowerupAura();
            this.scene.events.emit('powerup-expired', { type });
        });
    }

    /**
     * Limpia el aura de powerup actual
     */
    clearPowerupAura() {
        if (this.powerupAura) {
            this.powerupAura.destroy();
            this.powerupAura = null;
        }
        if (this.powerupAuraTween) {
            this.powerupAuraTween.stop();
            this.powerupAuraTween = null;
        }
    }
}
