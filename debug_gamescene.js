
import './test/setup.js';
try {
    const GameScene = (await import('./src/scenes/GameScene.js')).default;
    console.log('GameScene loaded successfully');
    new GameScene();
    console.log('GameScene instantiated');
} catch (e) {
    console.error('Error loading GameScene:', e);
}
