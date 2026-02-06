import { EVENTS } from '../core/Constants.js';

/**
 * @class DebugManager
 * @description Gestor centralizado de herramientas de debugging en tiempo real.
 * Proporciona: barras de vida, hitboxes, monitor de FPS, comandos de god mode.
 * Solo activo cuando DEBUG_MODE = true.
 */
export default class DebugManager {
    /**
     * @param {Phaser.Scene} scene - La escena GameScene
     */
    constructor(scene) {
        if (!window.DEBUG_MODE) {
            console.warn('DebugManager: DEBUG_MODE (global) está desactivado');
            return;
        }

        this.scene = scene;
        this.enabled = window.DEBUG_MODE || false; // Auto-enable based on global flag

        // Estructuras de datos
        this.healthBars = new Map(); // entity -> { container, bar, maxHp, barWidth }

        // UI Elements
        this.fpsText = null;
        this.entityCountText = null;
        this.debugGraphics = null;

        // Setup
        this.setupKeyboardShortcuts();
        this.setupEventListeners();

        // Si ya está habilitado al inicio, mostrar UI inmediatamente
        if (this.enabled) {
            this.showDebugUI();
            this.renderHitboxes();
            // Esperar un frame para que las entidades se creen antes de registrarlas
            this.scene.time.delayedCall(100, () => {
                this.registerAllActiveEntities();
            });
        }

        console.log('[DebugManager] Inicializado. Presiona H para toggle, K para instakill');
    }

    /**
     * Configura los atajos de teclado para debug
     */
    setupKeyboardShortcuts() {
        if (!window.DEBUG_KEYS) return;

        // Toggle debug overlay (H)
        const keyToggle = window.DEBUG_KEYS.TOGGLE_DEBUG || 'H';
        this.scene.input.keyboard.on(`keydown-${keyToggle}`, () => {
            this.toggle();
        });

        // Instakill command (K)
        const keyKill = window.DEBUG_KEYS.INSTAKILL || 'K';
        this.scene.input.keyboard.on(`keydown-${keyKill}`, () => {
            if (this.enabled) {
                this.executeInstakill();
            }
        });
    }

    /**
     * Configura listeners del Event Bus para auto-registro de entidades
     */
    setupEventListeners() {
        this.scene.events.on(EVENTS.ENTITY_SPAWNED, (entity) => {
            if (this.enabled) {
                this.registerEntity(entity);
            }
        });

        this.scene.events.on(EVENTS.ENTITY_DESTROYED, (entity) => {
            this.unregisterEntity(entity);
        });
    }

    /**
     * Alterna el modo debug on/off
     */
    toggle() {
        if (!window.DEBUG_MODE) {
            console.warn('[DebugManager] DEBUG_MODE desactivado');
            return;
        }

        this.enabled = !this.enabled;

        if (this.enabled) {
            console.log('[DebugManager] DEBUG ACTIVADO');
            this.showDebugUI();
            this.registerAllActiveEntities();
        } else {
            console.log('[DebugManager] DEBUG DESACTIVADO');
            this.hideDebugUI();
        }
    }

    /**
     * Muestra la UI de debug (FPS counter, entity count)
     */
    showDebugUI() {
        // FPS Counter
        this.fpsText = this.scene.add.text(10, 10, 'FPS: 60', {
            fontSize: '16px',
            fontFamily: 'Arial',
            color: '#00FF00',
            backgroundColor: '#000000',
            padding: { x: 8, y: 4 }
        }).setDepth(1000).setScrollFactor(0);

        // Entity Counter
        this.entityCountText = this.scene.add.text(10, 40, 'Entities: 0', {
            fontSize: '14px',
            fontFamily: 'Arial',
            color: '#FFFF00',
            backgroundColor: '#000000',
            padding: { x: 8, y: 4 }
        }).setDepth(1000).setScrollFactor(0);

        // Graphics para hitboxes
        this.debugGraphics = this.scene.add.graphics();
        this.debugGraphics.setDepth(999);
    }

    /**
     * Oculta la UI de debug
     */
    hideDebugUI() {
        if (this.fpsText) {
            this.fpsText.destroy();
            this.fpsText = null;
        }

        if (this.entityCountText) {
            this.entityCountText.destroy();
            this.entityCountText = null;
        }

        if (this.debugGraphics) {
            this.debugGraphics.destroy();
            this.debugGraphics = null;
        }

        // Destruir todas las barras de vida
        this.healthBars.forEach((barData) => {
            barData.container.destroy();
        });
        this.healthBars.clear();
    }

    /**
     * Registra todas las entidades activas en la escena
     */
    registerAllActiveEntities() {
        // Registrar enemigos
        if (this.scene.enemies) {
            this.scene.enemies.getChildren().forEach(enemy => {
                if (enemy.active) {
                    this.registerEntity(enemy);
                }
            });
        }

        // Registrar jefes
        if (this.scene.bossGroup) {
            this.scene.bossGroup.getChildren().forEach(boss => {
                if (boss.active && !boss.isDead) {
                    this.registerEntity(boss);
                }
            });
        }
    }

    /**
     * Registra una entidad para visualización de barra de vida
     * @param {Entity} entity - Enemigo o jefe
     */
    registerEntity(entity) {
        if (!this.enabled || this.healthBars.has(entity)) return;

        const barWidth = 60;
        const barHeight = 6;

        // Crear contenedor para la barra
        const barContainer = this.scene.add.container(entity.x, entity.y - 40);

        // Fondo de la barra (rojo oscuro)
        const bgBar = this.scene.add.rectangle(0, 0, barWidth, barHeight, 0x660000);

        // Barra de vida (verde)
        const healthBar = this.scene.add.rectangle(
            -(barWidth / 2),
            0,
            barWidth,
            barHeight,
            0x00FF00
        ).setOrigin(0, 0.5);

        barContainer.add([bgBar, healthBar]);
        barContainer.setDepth(100);

        this.healthBars.set(entity, {
            container: barContainer,
            bar: healthBar,
            maxHp: entity.maxHp || entity.hp,
            barWidth: barWidth
        });
    }

    /**
     * Actualiza la barra de vida de una entidad
     * @param {Entity} entity - Entidad a actualizar
     */
    updateHealthBar(entity) {
        const barData = this.healthBars.get(entity);
        if (!barData) return;

        // Actualizar posición
        barData.container.setPosition(entity.x, entity.y - 40);

        // Calcular porcentaje de vida
        const hpPercent = Math.max(0, entity.hp / barData.maxHp);

        // Actualizar ancho de la barra
        barData.bar.width = barData.barWidth * hpPercent;

        // Color gradient: verde -> amarillo -> rojo
        let color = 0x00FF00; // Verde
        if (hpPercent < 0.5) color = 0xFFFF00; // Amarillo
        if (hpPercent < 0.25) color = 0xFF0000; // Rojo

        barData.bar.setFillStyle(color);
    }

    /**
     * Desregistra una entidad y destruye su barra de vida
     * @param {Entity} entity - Entidad a desregistrar
     */
    unregisterEntity(entity) {
        const barData = this.healthBars.get(entity);
        if (barData) {
            barData.container.destroy();
            this.healthBars.delete(entity);
        }
    }

    /**
     * Renderiza hitboxes de todas las entidades activas
     */
    renderHitboxes() {
        if (!this.debugGraphics) return;

        this.debugGraphics.clear();

        // Player hitbox (Cyan)
        if (this.scene.player && this.scene.player.active) {
            const p = this.scene.player;
            this.debugGraphics.lineStyle(2, 0x00FFFF, 1);
            this.debugGraphics.strokeRect(
                p.x - p.displayWidth / 2,
                p.y - p.displayHeight / 2,
                p.displayWidth,
                p.displayHeight
            );
        }

        // Enemies hitbox (Magenta)
        this.debugGraphics.lineStyle(2, 0xFF00FF, 1);
        if (this.scene.enemies) {
            this.scene.enemies.getChildren().forEach(enemy => {
                if (enemy.active) {
                    this.debugGraphics.strokeRect(
                        enemy.x - enemy.displayWidth / 2,
                        enemy.y - enemy.displayHeight / 2,
                        enemy.displayWidth,
                        enemy.displayHeight
                    );
                }
            });
        }

        // Boss hitbox (Magenta)
        if (this.scene.bossGroup) {
            this.scene.bossGroup.getChildren().forEach(boss => {
                if (boss.active && !boss.isDead) {
                    this.debugGraphics.strokeRect(
                        boss.x - boss.displayWidth / 2,
                        boss.y - boss.displayHeight / 2,
                        boss.displayWidth,
                        boss.displayHeight
                    );
                }
            });
        }
    }

    /**
     * Actualiza las estadísticas de rendimiento (FPS y conteo de entidades)
     */
    updatePerformanceStats() {
        if (!this.fpsText || !this.entityCountText) return;

        // FPS
        const fps = Math.round(this.scene.game.loop.actualFps);
        this.fpsText.setText(`FPS: ${fps}`);

        // Color según rendimiento
        if (fps < 30) this.fpsText.setColor('#FF0000');
        else if (fps < 50) this.fpsText.setColor('#FFFF00');
        else this.fpsText.setColor('#00FF00');

        // Contar entidades activas
        let enemyCount = 0;
        let bossCount = 0;
        let bulletCount = 0;

        if (this.scene.enemies) {
            enemyCount = this.scene.enemies.getChildren().filter(e => e.active).length;
        }

        if (this.scene.bossGroup) {
            bossCount = this.scene.bossGroup.getChildren().filter(b => b.active && !b.isDead).length;
        }

        if (this.scene.playerBullets) {
            bulletCount = this.scene.playerBullets.getChildren().filter(b => b.active).length;
        }

        const total = enemyCount + bossCount + bulletCount;
        this.entityCountText.setText(
            `Entities: ${total} | E:${enemyCount} B:${bossCount} P:${bulletCount}`
        );
    }

    /**
     * Ejecuta el comando instakill (mata todos los enemigos y jefes)
     */
    executeInstakill() {
        console.log('[DebugManager] ⚡ INSTAKILL EJECUTADO');

        let killCount = 0;

        // Matar enemigos
        if (this.scene.enemies) {
            this.scene.enemies.getChildren().forEach(enemy => {
                if (enemy.active) {
                    enemy.die();
                    killCount++;
                }
            });
        }

        // Matar jefes
        if (this.scene.bossGroup) {
            this.scene.bossGroup.getChildren().forEach(boss => {
                if (boss.active && !boss.isDead) {
                    boss.die();
                    killCount++;
                }
            });
        }

        console.log(`[DebugManager] ${killCount} entidades eliminadas`);
    }

    /**
     * Actualización en cada frame (llamado desde GameScene.update)
     */
    update() {
        if (!this.enabled) return;

        // Renderizar hitboxes
        this.renderHitboxes();

        // Actualizar stats de rendimiento
        this.updatePerformanceStats();

        // Actualizar barras de vida
        this.healthBars.forEach((barData, entity) => {
            if (entity.active && !entity.isDead) {
                this.updateHealthBar(entity);
            }
        });
    }

    /**
     * Limpieza completa del DebugManager
     */
    destroy() {
        console.log('[DebugManager] Destruyendo...');

        // Destruir UI
        this.hideDebugUI();

        // Limpiar event listeners
        this.scene.events.off(EVENTS.ENTITY_SPAWNED);
        this.scene.events.off(EVENTS.ENTITY_DESTROYED);

        if (window.DEBUG_KEYS) {
            const keyToggle = window.DEBUG_KEYS.TOGGLE_DEBUG || 'H';
            const keyKill = window.DEBUG_KEYS.INSTAKILL || 'K';
            this.scene.input.keyboard.off(`keydown-${keyToggle}`);
            this.scene.input.keyboard.off(`keydown-${keyKill}`);
        }
    }
}
