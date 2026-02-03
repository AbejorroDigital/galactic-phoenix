import { EVENTS } from '../core/Constants.js';
import Entity from './Entity.js';
import PlayerVFX from './PlayerVFX.js';
import PlayerHealth from './PlayerHealth.js';

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
}
