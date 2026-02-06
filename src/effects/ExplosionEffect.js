/**
 * ExplosionEffect - Sistema de efectos visuales para explosiones
 * Utiliza el sprite 'flare.png' con partículas y tweens
 */
export default class ExplosionEffect {
    /**
     * Crea una explosión pequeña (para enemigos normales)
     * @param {Phaser.Scene} scene - Escena actual
     * @param {number} x - Posición X
     * @param {number} y - Posición Y
     * @param {number} color - Tint de color (hex)
     */
    static createSmallExplosion(scene, x, y, color = 0xff6600) {
        // Verificar que el sprite existe
        if (!scene.textures.exists('flare')) {
            console.warn('ExplosionEffect: Sprite "flare" no encontrado');
            return;
        }

        // Crear múltiples partículas
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 / 8) * i;
            const speed = Phaser.Math.Between(50, 150);

            const particle = scene.add.sprite(x, y, 'flare')
                .setScale(0.5)
                .setTint(color)
                .setAlpha(1)
                .setBlendMode(Phaser.BlendModes.ADD);

            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;

            scene.tweens.add({
                targets: particle,
                x: particle.x + vx,
                y: particle.y + vy,
                scale: 0,
                alpha: 0,
                duration: 500,
                ease: 'Power2',
                onComplete: () => particle.destroy()
            });
        }

        // Flash central
        const flash = scene.add.sprite(x, y, 'flare')
            .setScale(1.5)
            .setTint(0xffffff)
            .setAlpha(1)
            .setBlendMode(Phaser.BlendModes.ADD);

        scene.tweens.add({
            targets: flash,
            scale: 0,
            alpha: 0,
            duration: 300,
            ease: 'Power2',
            onComplete: () => flash.destroy()
        });
    }

    /**
     * Crea una explosión grande (para jefes)
     * @param {Phaser.Scene} scene - Escena actual
     * @param {number} x - Posición X
     * @param {number} y - Posición Y
     */
    static createBossExplosion(scene, x, y) {
        if (!scene.textures.exists('flare')) {
            console.warn('ExplosionEffect: Sprite "flare" no encontrado');
            return;
        }

        // Múltiples ondas de explosión
        for (let wave = 0; wave < 3; wave++) {
            scene.time.delayedCall(wave * 200, () => {
                for (let i = 0; i < 16; i++) {
                    const angle = (Math.PI * 2 / 16) * i;
                    const speed = Phaser.Math.Between(100, 250);
                    const colors = [0xff0000, 0xff6600, 0xffff00, 0xffffff];
                    const color = Phaser.Utils.Array.GetRandom(colors);

                    const particle = scene.add.sprite(x, y, 'flare')
                        .setScale(Phaser.Math.FloatBetween(0.8, 1.5))
                        .setTint(color)
                        .setAlpha(1)
                        .setBlendMode(Phaser.BlendModes.ADD);

                    const vx = Math.cos(angle) * speed;
                    const vy = Math.sin(angle) * speed;

                    scene.tweens.add({
                        targets: particle,
                        x: particle.x + vx * 2,
                        y: particle.y + vy * 2,
                        scale: 0,
                        alpha: 0,
                        duration: 800 + wave * 200,
                        ease: 'Power2',
                        onComplete: () => particle.destroy()
                    });
                }
            });
        }

        // Flash gigante central
        const flash = scene.add.sprite(x, y, 'flare')
            .setScale(5)
            .setTint(0xffffff)
            .setAlpha(1)
            .setBlendMode(Phaser.BlendModes.ADD);

        scene.tweens.add({
            targets: flash,
            scale: 0,
            alpha: 0,
            duration: 1000,
            ease: 'Power2',
            onComplete: () => flash.destroy()
        });

        // Shake de cámara
        scene.cameras.main.shake(800, 0.02);
    }

    /**
     * Crea una explosión mediana (para enemigos grandes)
     * @param {Phaser.Scene} scene - Escena actual
     * @param {number} x - Posición X
     * @param {number} y - Posición Y
     */
    static createMediumExplosion(scene, x, y) {
        if (!scene.textures.exists('flare')) {
            console.warn('ExplosionEffect: Sprite "flare" no encontrado');
            return;
        }

        for (let i = 0; i < 12; i++) {
            const angle = (Math.PI * 2 / 12) * i;
            const speed = Phaser.Math.Between(80, 180);

            const particle = scene.add.sprite(x, y, 'flare')
                .setScale(0.8)
                .setTint(0xff3300)
                .setAlpha(1)
                .setBlendMode(Phaser.BlendModes.ADD);

            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;

            scene.tweens.add({
                targets: particle,
                x: particle.x + vx * 1.5,
                y: particle.y + vy * 1.5,
                scale: 0,
                alpha: 0,
                duration: 600,
                ease: 'Power2',
                onComplete: () => particle.destroy()
            });
        }
    }

    /**
     * Crea un destello de impacto en el punto de colisión
     * @param {Phaser.Scene} scene - Escena actual
     * @param {number} x - Posición X
     * @param {number} y - Posición Y
     * @param {string} damageType - Tipo de daño ('laser', 'plasma', 'fisico', 'ionico')
     */
    static createHitFlare(scene, x, y, damageType = 'fisico') {
        if (!scene.textures.exists('flare')) {
            console.warn('ExplosionEffect: Sprite "flare" no encontrado');
            return;
        }

        // Mapeo de colores por tipo de daño
        const damageColors = {
            'laser': 0x00FFFF,     // Cyan
            'plasma': 0xFF00FF,    // Magenta
            'fisico': 0xFFFFFF,    // Blanco
            'ionico': 0x00FF00     // Verde
        };

        const color = damageColors[damageType] || 0xFFFFFF;

        // Destello principal
        const flare = scene.add.sprite(x, y, 'flare')
            .setScale(0.6)
            .setAlpha(0.9)
            .setTint(color)
            .setBlendMode(Phaser.BlendModes.ADD)
            .setDepth(35); // DEPTH.HIT_EFFECTS

        scene.tweens.add({
            targets: flare,
            scale: 0.1,
            alpha: 0,
            duration: 300,
            ease: 'Power2',
            onComplete: () => flare.destroy()
        });

        // Partículas pequeñas alrededor
        for (let i = 0; i < 4; i++) {
            const angle = (Math.PI * 2 / 4) * i + Math.random() * 0.5;
            const distance = 15;

            const particle = scene.add.sprite(x, y, 'flare')
                .setScale(0.2)
                .setAlpha(0.7)
                .setTint(color)
                .setBlendMode(Phaser.BlendModes.ADD)
                .setDepth(35);

            const targetX = x + Math.cos(angle) * distance;
            const targetY = y + Math.sin(angle) * distance;

            scene.tweens.add({
                targets: particle,
                x: targetX,
                y: targetY,
                scale: 0,
                alpha: 0,
                duration: 250,
                ease: 'Power2',
                onComplete: () => particle.destroy()
            });
        }
    }
}
