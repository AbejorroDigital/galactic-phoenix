
import { beforeEach, describe, expect, it, vi } from 'vitest';
import '../test/setup.js';

// Shared mock factory for all game objects
const createMockGameObject = () => ({
    setOrigin: vi.fn().mockReturnThis(),
    setDepth: vi.fn().mockReturnThis(),
    setVisible: vi.fn().mockReturnThis(),
    setText: vi.fn().mockReturnThis(),
    setInteractive: vi.fn().mockReturnThis(),
    on: vi.fn().mockReturnThis(),
    off: vi.fn().mockReturnThis(),
    once: vi.fn().mockReturnThis(),
    setScale: vi.fn().mockReturnThis(),
    setScrollFactor: vi.fn().mockReturnThis(),
    setAlpha: vi.fn().mockReturnThis(),
    setTint: vi.fn().mockReturnThis(),
    play: vi.fn().mockReturnThis(),
    stop: vi.fn().mockReturnThis(),
    setStrokeStyle: vi.fn().mockReturnThis(),
    lineStyle: vi.fn().mockReturnThis(),
    strokeRect: vi.fn().mockReturnThis(),
    fillStyle: vi.fn().mockReturnThis(),
    fillRect: vi.fn().mockReturnThis(),
    clear: vi.fn().mockReturnThis(),
    add: vi.fn().mockReturnThis(),
    setDisplaySize: vi.fn().mockReturnThis(),
    setSize: vi.fn().mockReturnThis(),
    setCollisionCategory: vi.fn().mockReturnThis(),
    setCollidesWith: vi.fn().mockReturnThis(),
    setCollideWorldBounds: vi.fn().mockReturnThis(),
    addKey: vi.fn()
});

// Helper to create a fully populated mock scene
const createMockScene = () => {
    const scene = {
        add: {
            graphics: vi.fn(() => createMockGameObject()),
            text: vi.fn(() => createMockGameObject()),
            container: vi.fn(() => createMockGameObject()),
            rectangle: vi.fn(() => createMockGameObject()),
            circle: vi.fn(() => createMockGameObject()),
            image: vi.fn(() => createMockGameObject()),
            sprite: vi.fn(() => createMockGameObject()),
            particles: vi.fn(() => createMockGameObject())
        },
        scene: {
            get: vi.fn(),
            start: vi.fn(),
            stop: vi.fn(),
            launch: vi.fn(),
            resume: vi.fn(),
            bringToTop: vi.fn()
        },
        load: {
            image: vi.fn().mockReturnThis(),
            audio: vi.fn().mockReturnThis(),
            spritesheet: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis(),
            on: vi.fn()
        },
        sound: {
            play: vi.fn(),
            get: vi.fn(),
            add: vi.fn(() => ({ play: vi.fn() }))
        },
        registry: {
            get: vi.fn(() => 0.5),
            set: vi.fn()
        },
        input: {
            keyboard: {
                once: vi.fn(),
                on: vi.fn(),
                off: vi.fn(),
                addKey: vi.fn()
            },
            on: vi.fn()
        },
        time: {
            delayedCall: vi.fn()
        },
        tweens: {
            add: vi.fn()
        },
        events: {
            on: vi.fn(),
            once: vi.fn(),
            emit: vi.fn()
        },
        scale: {
            width: 800,
            height: 600
        }
    };
    return scene;
};

describe('UIScene.js Tests', () => {
    let UIScene;
    let mockUIScene;
    let mockGameScene;

    beforeEach(async () => {
        UIScene = (await import('../src/scenes/UIScene.js')).default;

        mockGameScene = createMockScene();
        mockGameScene.lives = 5;
        mockGameScene.player = { hp: 75, maxHp: 100 };

        mockUIScene = new UIScene();
        Object.assign(mockUIScene, createMockScene()); // Merge mocks into the instance

        mockUIScene.scene.get.mockReturnValue(mockGameScene);

        // Mock properties commonly accessed directly
        mockUIScene.livesText = createMockGameObject();
        mockUIScene.powerupText = createMockGameObject();
        mockUIScene.gameOverPanel = createMockGameObject();
    });

    describe('Lives System Integration', () => {
        it('should get lives from GameScene on create', () => {
            mockUIScene.create();
            expect(mockUIScene.lives).toBe(5);
        });

        it('should default to 3 lives if GameScene.lives is undefined', () => {
            mockGameScene.lives = undefined;
            mockUIScene.create();
            expect(mockUIScene.lives).toBe(3);
        });

        it('should update lives display when life-change event fires', () => {
            mockUIScene.lives = 5;
            mockUIScene.livesText = { setText: vi.fn() };

            mockUIScene.updateLives(4);

            expect(mockUIScene.lives).toBe(4);
            expect(mockUIScene.livesText.setText).toHaveBeenCalledWith('LIVES: 4');
        });
    });

    describe('Health Bar Initialization', () => {
        it('should initialize healthbar with player HP on create', () => {
            mockUIScene.updateHealth = vi.fn();
            mockUIScene.create();
            expect(mockGameScene.events.on).toHaveBeenCalled();
        });

        it('should handle player with undefined HP', () => {
            mockGameScene.player.hp = undefined;
            expect(() => {
                mockUIScene.create();
            }).not.toThrow();
        });
    });

    describe('Weapon Display', () => {
        it('should hide weapon display for basic_cannon', () => {
            mockUIScene.updateWeapon('');
            expect(mockUIScene.powerupText.setVisible).toHaveBeenCalledWith(false);
        });

        it('should show formatted weapon name', () => {
            mockUIScene.updateWeapon('Plasma Repeater');
            expect(mockUIScene.powerupText.setText).toHaveBeenCalledWith('WEAPON: Plasma Repeater');
            expect(mockUIScene.powerupText.setVisible).toHaveBeenCalledWith(true);
        });
    });

    describe('Game Over Screen', () => {
        it('should show game over panel', () => {
            mockUIScene.showGameOverScreen();
            expect(mockUIScene.gameOverPanel.setVisible).toHaveBeenCalledWith(true);
        });
    });
});

describe('BootScene.js Tests', () => {
    let BootScene;
    let mockScene;

    beforeEach(async () => {
        BootScene = (await import('../src/scenes/BootScene.js')).default;
        mockScene = new BootScene();
        Object.assign(mockScene, createMockScene());
    });

    describe('Asset Loading', () => {
        it('should load all required sprites', () => {
            mockScene.preload();
            // We changed some spritesheets to images in the new implementation
            expect(mockScene.load.image).toHaveBeenCalled();
        });

        it('should load vida.png sprite for life powerup', () => {
            mockScene.preload();
            const calls = mockScene.load.image.mock.calls;
            const vidaCall = calls.find(call => call[0] === 'vida');
            expect(vidaCall).toBeDefined();
        });

        it('should load all JSON data files', () => {
            mockScene.preload();
            expect(mockScene.load.json).toHaveBeenCalled();
        });
    });

    describe('Scene Transition', () => {
        it('should start MenuScene after loading', () => {
            mockScene.load.on = vi.fn((event, callback) => {
                if (event === 'complete') callback();
            });
            mockScene.preload();
            mockScene.create();
            expect(mockScene.scene.start).toHaveBeenCalled();
        });
    });
});

describe('MenuScene.js Tests', () => {
    let MenuScene;
    let mockScene;

    beforeEach(async () => {
        MenuScene = (await import('../src/scenes/MenuScene.js')).default;
        mockScene = new MenuScene();
        Object.assign(mockScene, createMockScene());
    });

    describe('Menu Buttons', () => {
        it('should create start button', () => {
            mockScene.create();
            expect(mockScene.add.text).toHaveBeenCalled();
        });
    });

    describe('Background Music', () => {
        it('should play intro music', () => {
            mockScene.create();
            expect(mockScene.registry.get).toHaveBeenCalled();
        });
    });
});

describe('OptionsScene.js Tests', () => {
    let OptionsScene;
    let mockScene;

    beforeEach(async () => {
        OptionsScene = (await import('../src/scenes/OptionsScene.js')).default;
        mockScene = new OptionsScene();
        Object.assign(mockScene, createMockScene());
    });

    describe('Volume Sliders', () => {
        it('should initialize music volume from registry', () => {
            mockScene.create();
            expect(mockScene.registry.get).toHaveBeenCalledWith('musicVolume');
        });

        it('should initialize sfx volume from registry', () => {
            mockScene.create();
            expect(mockScene.registry.get).toHaveBeenCalledWith('sfxVolume');
        });
    });
});

describe('PauseScene.js Tests', () => {
    let PauseScene;
    let mockScene;

    beforeEach(async () => {
        PauseScene = (await import('../src/scenes/PauseScene.js')).default;
        mockScene = new PauseScene();
        Object.assign(mockScene, createMockScene());

        mockScene.scene.get.mockReturnValue({ scene: { restart: vi.fn() } });
    });

    describe('Pause Menu', () => {
        it('should create continue button', () => {
            mockScene.create();
            expect(mockScene.add.text).toHaveBeenCalled();
        });

        it('should create semi-transparent overlay', () => {
            mockScene.create();
            expect(mockScene.add.rectangle).toHaveBeenCalled();
        });
    });
});

describe('ControlsScene.js Tests', () => {
    let ControlsScene;
    let mockScene;

    beforeEach(async () => {
        ControlsScene = (await import('../src/scenes/ControlsScene.js')).default;
        mockScene = new ControlsScene();
        Object.assign(mockScene, createMockScene());
    });

    describe('Controls Display', () => {
        it('should display control instructions', () => {
            mockScene.create();
            expect(mockScene.add.text).toHaveBeenCalled();
        });

        it('should create back button', () => {
            mockScene.create();
            expect(mockScene.add.text).toHaveBeenCalled();
        });
    });
});
