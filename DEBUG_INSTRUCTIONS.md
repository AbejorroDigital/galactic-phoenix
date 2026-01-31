# Debug Instructions - Player Death Crash

## How to Use the Debug System

### 1. Enable Debug Logging

The debug logger is automatically initialized when you load the game. Open the browser console (F12) to see the logs.

### 2. Reading the Logs

Look for color-coded logs:
- 🟢 **GREEN** (player): Player state changes
- 🔴 **RED** (death): Death handling
- 🔵 **CYAN** (respawn): Respawn system
- 🟡 **YELLOW** (sprite): Sprite visibility/state
- 🟣 **MAGENTA** (collision): Collision events
- 🟠 **ORANGE** (state): State machine
- 🔷 **BLUE** (scene): Scene state changes
- 🟢 **LIME** (particle): Particle system

### 3. Log Format

```
[TIMESTAMP ms] CATEGORY: Message { data }
```

Example:
```
[1523ms] DEATH: === handleDeath() CALLED ===
[1524ms] PLAYER: PLAYER STATE: BEFORE handleDeath { isDead: false, hp: 0, visible: true }
[1525ms] DEATH: Setting isDead = true
```

### 4. Critical Logs to Watch

When player dies, you should see this sequence:

```
1. [XXms] DEATH: === handleDeath() CALLED ===
2. [XXms] DEATH: Stopping player movement
3. [XXms] PARTICLE: Stopping engine particles
4. [XXms] SPRITE: Hiding player sprite
5. [XXms] DEATH: Decrementing lives { before: 5, after: 4 }
6. [XXms] DEATH: Emitting life-change event { lives: 4 }
7. [XXms] RESPAWN: Will respawn in 1500ms (4 lives remaining)
8. [XX+1500ms] RESPAWN: === RESPAWN CALLBACK TRIGGERED ===
9. [XX+1500ms] SPRITE: Making player visible
10. [XX+1500ms] PARTICLE: Restarting engine particles
```

### 5. Signs of Crash/Freeze

If you see **ANY** of these, the game is likely stuck:

❌ **CRITICAL ERROR** logs (red, with stack traces)
❌ Logs stop abruptly after "Hiding player sprite"
❌ No "RESPAWN CALLBACK TRIGGERED" after 1500ms
❌ "NO BODY FOUND" errors
❌ "NO ENGINE EMITTER FOUND" warnings followed by freeze

### 6. Export Logs

To save logs for analysis:

```javascript
// In browser console
console.log(window.DEBUG_LOGGER.exportLogs());
```

Copy the JSON output and save to a file.

### 7. Disable Logging (Production)

Edit `DebugLogger.js`:
```javascript
this.enabled = false; // Line 5
```

## Common Crash Patterns

### Pattern 1: Sprite Disappears, No Respawn
```
[XXms] SPRITE: Hiding player sprite
[XXms] DEATH: Emitting life-change event
// NO FURTHER LOGS = CRASH HERE
```

**Likely Cause**: `scene.time.delayedCall` is broken or scene is destroyed

### Pattern 2: Particle Error
```
[XXms] PARTICLE: Stopping engine particles
[XXms] ERROR: engineEmitter.stop() { error: "particle emitter already stopped" }
// CRASH
```

**Likely Cause**: Particle emitter in invalid state

### Pattern 3: No Body
```
[XXms] ERROR: NO BODY FOUND
[XXms] DEATH: Decrementing lives
// FREEZE - Player visible but non-interactive
```

**Likely Cause**: Physics body destroyed prematurely

### Pattern 4: Double Death
```
[XXms] DEATH: === handleDeath() CALLED ===
[XXms] DEATH: === handleDeath() CALLED === // AGAIN!
```

**Likely Cause**: Collision still active after death, triggering twice

## Testing Commands

### Run Death Tests
```bash
npm test -- DeathCrashDebug.test.js
```

### Run All Tests
```bash
npm test
```

### Watch Mode
```bash
npm run test:watch -- DeathCrashDebug
```

## Emergency Fixes

If game crashes despite logging:

1. **Check Console for Uncaught Errors**
   - Look for red error messages OUTSIDE the debug logging system
   - Note the file + line number

2. **Check Lives Value**
   ```javascript
   // In console during crash
   this.scene.lives
   ```
   Should be a number, not undefined

3. **Check Player State**
   ```javascript
   // In console
   this.player.isDead
   this.player.visible
   this.player.body.enable
   ```

4. **Force Game Over**
   ```javascript
   // Emergency reset
   this.scene.scene.start('menu');
   ```

## Report Format

When reporting a crash, include:

1. **Full debug log output** (from console)
2. **Screenshot** of console at freeze moment
3. **Steps to reproduce** (e.g., "Died to boss laser in level 1")
4. **Browser** + version (Chrome 120, Firefox 121, etc.)
5. **Last successful log line** before crash

Example Report:
```
CRASH REPORT
============
Last Log: [2341ms] DEATH: Emitting life-change event { lives: 2 }
Expected Next: RESPAWN callback after 1500ms
Actual: Game froze, no further logs
Browser: Chrome 120.0.6099
Steps: Collided with interceptor_alpha in level 1 during boss fight
```
