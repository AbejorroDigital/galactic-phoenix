/**
 * @class PowerUp
 * @extends Phaser.Physics.Arcade.Sprite
 * @description Objetos coleccionables que modifican el estado, el escudo o el arma del jugador.
 * Se gestionan en un pool y aparecen aleatoriamente cuando los enemigos son destruidos.
 */
export default class PowerUp extends Phaser.Physics.Arcade.Sprite {
    /**
     * @param {Phaser.Scene} scene - La escena a la que pertenece este powerup.
     */
    constructor(scene) {
        super(scene, 0, 0, 'powerup_orb');
    }

    /**
     * Inicializa el power-up en el mundo del juego.
     * @param {number} x - Posición horizontal.
     * @param {number} y - Posición vertical.
     * @param {string} key - Clave de configuración del power-up desde JSON.
     */
    spawn(x, y, key) {
        const data = this.scene.cache.json.get('powerups')[key] ||
            (this.scene.cache.json.get('powerups').types ? this.scene.cache.json.get('powerups').types[key] : null);

        /** @type {Object} */
        this.config = data ? { ...data, key } : { type: 'unknown', key };
        if (!data) return;
        this.setPosition(x, y);
        this.setTexture(data.sprite || 'powerup_orb');
        this.setTint(parseInt(data.tint) || 0xffffff);

        this.setActive(true);
        this.setVisible(true);

        this.scene.physics.add.existing(this);
        this.body.setVelocityX(-80); // Flota hacia la izquierda
        this.body.setVelocityY(Phaser.Math.Between(-30, 30));
    }

    /**
     * Manejador lógico para cuando un jugador recoge el power-up.
     * Realiza mejoras de estadísticas, recuperación de escudo o cambio de armas.
     * @param {Player} player - La entidad del jugador que recogió el objeto.
     */
    collect(player) {
        this.applyEffect(player);
    }

    /**
     * Aplica el efecto del power-up al jugador.
     * @param {Player} player - La entidad del jugador.
     */
    applyEffect(player) {
        const val = this.config.value || this.config.amount || 0;
        const displayName = this.config.display_name || this.config.displayName || this.config.name || this.config.key || 'PowerUp';

        switch (this.config.type) {
            case 'heal':
            case 'shield':
                player.recoverShield(val);
                break;
            case 'stat_mod':
            case 'stat_boost':
                player.applyStatMod(this.config.stat, val, this.config.duration);
                break;
            case 'weapon':
                player.equipWeapon(this.config.weapon_id, displayName);
                break;
            case 'life':
                player.addLife(val || 1);
                break;
        }

        this.scene.events.emit('powerup-collected', displayName);

        // NUEVO: Emitir evento para aura visual
        this.scene.events.emit('powerup-activated', {
            type: this.config.type,
            duration: this.config.duration || 5000,
            key: this.config.key
        });

        // Feedback sonoro (seguro)
        if (this.scene.sound && this.scene.sound.get('sfx_pickup')) {
            this.scene.sound.play('sfx_pickup');
        }

        this.kill();
    }

    /**
     * Desactiva el power-up para devolverlo al pool.
     */
    kill() {
        this.setActive(false);
        this.setVisible(false);
        if (this.body) this.body.stop();
    }
}
