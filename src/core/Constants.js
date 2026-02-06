/**
 * @description Nombres de eventos globales utilizados para la comunicación entre escenas y entidades.
 * @enum {string}
 */
export const EVENTS = {
    /** Emitido cuando el jugador recibe daño. Parámetros: (hp, maxHp) */
    PLAYER_HIT: 'player-hit',
    /** Emitido cuando el jugador se cura. Parámetro: {current, max} */
    PLAYER_HEAL: 'player-heal',
    /** Emitido cuando cambia el escudo del jugador. Parámetros: (shield, maxShield) */
    PLAYER_SHIELD: 'player-shield',
    /** Emitido cuando cambia la puntuación. Parámetro: (puntos) */
    SCORE_CHANGE: 'score-change',
    /** Emitido cuando el jugador cambia de arma. Parámetro: (weaponId) */
    WEAPON_CHANGE: 'weapon-change',
    /** Emitido cuando cambian las vidas del jugador. Parámetro: (lives) */
    LIFE_CHANGE: 'life-change',
    /** Emitido cuando un enemigo es destruido. Parámetros: (x, y, isBoss) */
    ENEMY_DESTROYED: 'enemy-destroyed',
    /** Emitido cuando un jefe es derrotado. Parámetro: (bossName) */
    BOSS_DEFEATED: 'boss-defeated',
    /** Emitido cuando el juego termina. */
    GAME_OVER: 'game-over',
    /** Emitido cuando se completa una secuencia de nivel. */
    LEVEL_FINISHED: 'level-finished',
    /** Emitido cuando se inflige daño a una entidad. Parámetros: { x, y, amount, isCritical, targetType, damageType } */
    DAMAGE_DEALT: 'damage-dealt',
    /** Emitido en el punto de impacto. Parámetros: { x, y, damageType } */
    HIT_IMPACT: 'hit-impact',
    /** Emitido cuando se activa un powerup. Parámetros: { type, duration } */
    POWERUP_ACTIVATED: 'powerup-activated',
    /** Emitido cuando expira un powerup. Parámetros: { type } */
    POWERUP_EXPIRED: 'powerup-expired',

    // Debug System Events
    ENTITY_SPAWNED: 'entity-spawned',
    ENTITY_DESTROYED: 'entity-destroyed'
};

/**
 * @description Nombres internos para las escenas de Phaser.
 * @enum {string}
 */
// ==================== DEBUG CONFIGURATION ====================
// (Deprecado: Usar window.DEBUG_MODE y window.DEBUG_KEYS definidos en main.js)
// ============================================================

export const SCENES = {
    BOOT: 'BootScene',
    MENU: 'MenuScene',
    CONTROLS: 'ControlsScene',
    OPTIONS: 'OptionsScene',
    GAME: 'GameScene',
    UI: 'UIScene',
    PAUSE: 'PauseScene'
};

/**
 * @description Niveles de profundidad visual (Z-index) para los objetos del juego.
 * @enum {number}
 */
export const DEPTH = {
    BACKGROUND: 0,
    EFFECTS: 5,          // Trails, explosiones de fondo
    PROJECTILES: 10,
    ENEMIES: 20,
    PLAYER_AURA: 29,     // Aura de powerup
    PLAYER: 30,
    HIT_EFFECTS: 35,     // Flares, partículas de impacto
    UI_EFFECTS: 40,      // Números de daño
    UI: 100
};