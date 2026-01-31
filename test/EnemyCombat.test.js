
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Enemy from '../src/entities/Enemy.js';
import '../test/setup.js';

describe('Enemy.js Combat and Movement', () => {
    let mockScene;
    let enemy;

    beforeEach(() => {
        mockScene = {
            scale: { width: 800, height: 600 },
            time: { now: 1000 },
            add: {
                existing: vi.fn(),
                text: vi.fn(() => ({
                    setOrigin: vi.fn().mockReturnThis(),
                    setDepth: vi.fn().mockReturnThis()
                })),
                particles: vi.fn(() => ({
                    stop: vi.fn(),
                    start: vi.fn()
                }))
            },
            physics: {
                add: {
                    existing: vi.fn((obj) => {
                        obj.body = {
                            enable: true,
                            setVelocityX: vi.fn(),
                            setVelocityY: vi.fn(),
                            stop: vi.fn()
                        };
                        return obj;
                    })
                }
            },
            enemiesBullets: {
                get: vi.fn(() => ({
                    fire: vi.fn()
                }))
            }
        };

        enemy = new Enemy(mockScene);
        // Rely on physics.add.existing mock from setup.js or scene
    });

    it('should initialize shooting stats on spawn', () => {
        const config = {
            sprite: 'enemy1',
            weapon: 'plasma_ball',
            fire_rate: 1500,
            pattern: 'sine'
        };

        enemy.spawn(300, config);

        expect(enemy.weaponId).toBe('plasma_ball');
        expect(enemy.fireRate).toBe(1500);
        expect(enemy.movementType).toBe('sine');
    });

    it('should fire projectile during update', () => {
        const config = {
            sprite: 'enemy1',
            weapon: 'enemy_laser',
            fire_rate: 1000
        };

        enemy.spawn(300, config);
        enemy.fireTimer = 0; // Force immediate shot

        enemy.update(2000);

        expect(mockScene.enemiesBullets.get).toHaveBeenCalled();
    });

    it('should respect movement patterns (sine)', () => {
        const config = {
            sprite: 'enemy1',
            pattern: 'sine_wave',
            speed: 100
        };

        enemy.spawn(300, config);
        enemy.birthTime = 1000;

        enemy.update(1500); // 500ms elapsed

        // Math.sin(500 * 0.005) * 150 -> Math.sin(2.5) * 150
        expect(enemy.body.setVelocityY).toHaveBeenCalled();
        expect(enemy.body.setVelocityX).toHaveBeenCalledWith(-100);
    });

    it('should respect movement patterns (zigzag)', () => {
        const config = {
            sprite: 'enemy1',
            pattern: 'zigzag'
        };

        enemy.spawn(300, config);
        enemy.birthTime = 1000;

        // At 1500ms (500ms elapsed), zigzag should be in first part (down)
        enemy.update(1500);
        expect(enemy.body.setVelocityY).toHaveBeenCalledWith(100);

        // At 2500ms (1500ms elapsed), zigzag should be in second part (up)
        enemy.update(2500);
        expect(enemy.body.setVelocityY).toHaveBeenCalledWith(-100);
    });

    it('should die and clean up off-screen', () => {
        const dieSilentlySpy = vi.spyOn(enemy, 'dieSilently');
        enemy.x = -150;

        enemy.update(2000);

        expect(dieSilentlySpy).toHaveBeenCalled();
    });
});
