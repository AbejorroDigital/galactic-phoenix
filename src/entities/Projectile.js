/**
 * @typedef {Object} WeaponStats
 * @property {number} damage - Cantidad de daño infligido.
 * @property {string} type - Tipo de daño (fisico, laser, ionico, etc).
 * @property {number} speed - Velocidad del proyectil.
 * @property {string} sprite - Clave del sprite.
 * @property {number} [scale] - Factor de escala visual.
 */


/**
 * @class Projectile
 * @extends Phaser.Physics.Arcade.Sprite
 * @description Entidad de proyectil genérica utilizada tanto para los ataques del jugador como para los de los enemigos.
 * Se agrupa en un pool y se reutiliza para optimizar la memoria y el rendimiento.
 * 
 * @example
 * const bullet = bulletGroup.get();
 * bullet.fire(player.x, player.y, 'plasma_blaster', true);
 */
export default class Projectile extends Phaser.Physics.Arcade.Sprite {
    /**
     * @param {Phaser.Scene} scene - La escena a la que pertenece este proyectil.
     */
    constructor(scene) {
        super(scene, 0, 0, 'shot-hero');
        /** 
         * Estadísticas heredadas del arma que lo disparó. 
         * @type {WeaponStats|Object} 
         */
        this.stats = {};
    }

    /**
     * Inicializa el proyectil desde el pool y establece su velocidad.
     * @param {number} x - Posición horizontal inicial.
     * @param {number} y - Posición vertical inicial.
     * @param {string} weaponKey - Clave de las estadísticas del arma en el caché JSON.
     * @param {boolean} [toRight=true] - Dirección (true para balas del jugador, false para balas de enemigos).
     */
    fire(x, y, weaponKey, toRight = true) {
        const weaponData = this.scene.cache.json.get('weapons').projectiles[weaponKey];

        if (!weaponData) return;

        this.stats = { ...weaponData };
        this.setTexture(weaponData.sprite);
        this.setPosition(x, y);
        this.setActive(true);
        this.setVisible(true);
        this.setScale(weaponData.scale || 1);

        this.scene.physics.add.existing(this);
        this.active = true;
        if (this.body) {
            this.body.enable = true;
            const speed = weaponData.speed || 400;

            // Lógica de apuntado (Aimed / Homing-lite)
            if (weaponData.aimed && this.scene.player && this.scene.player.active) {
                // Calcular ángulo hacia el jugador
                const angle = Phaser.Math.Angle.Between(x, y, this.scene.player.x, this.scene.player.y);

                // Establecer velocidad basada en el ángulo
                this.scene.physics.velocityFromRotation(angle, speed, this.body.velocity);

                // Rotar el sprite del proyectil para que mire hacia su dirección de vuelo
                // Nota: Phaser usa radianes para rotation y grados para angle (normalmente se suma 90 o 180 según el sprite base)
                // Si el sprite mira a la derecha (0 rad), rotation = angle es correcto.
                this.rotation = angle;
            } else {
                // Comportamiento lineal estándar
                this.body.setVelocityX(toRight ? speed : -speed);
                this.body.setVelocityY(0);
                this.rotation = toRight ? 0 : Math.PI; // Invertir si va a la izquierda
            }
        } else {
            // Fallback para mocks que no integran el body automáticamente
            this.body = { enable: true };
        }
    }

    /**
     * Actualiza el proyectil y comprueba si está fuera de la pantalla para su limpieza automática.
     */
    update() {
        if (!this.active) return;

        // Auto-destrucción si sale de pantalla
        const margin = 50;
        const width = (this.scene.scale && this.scene.scale.width) ? this.scene.scale.width : 800;
        if (this.x > width + margin || this.x < -margin) {
            this.kill();
        }
    }

    /**
     * Desactiva el proyectil y detiene su movimiento para devolverlo al pool.
     */
    kill() {
        this.setActive(false);
        this.setVisible(false);
        this.active = false;
        if (this.body && this.body.stop) this.body.stop();
    }
}
