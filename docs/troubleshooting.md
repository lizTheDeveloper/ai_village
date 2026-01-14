# Troubleshooting Guide

Solutions for common issues and how to get help.

---

## Game Won't Start

### Symptoms
- Running `./start.sh` shows errors
- Browser doesn't open
- Black screen in browser

### Solutions

**1. Check Node.js installation**
```bash
node --version
# Should show v18 or higher
```
If not installed or wrong version: [Download Node.js](https://nodejs.org/)

**2. Install dependencies**
```bash
cd custom_game_engine
npm install
```
Wait for completion (may take 2-5 minutes first time)

**3. Kill existing servers**
```bash
./start.sh kill
./start.sh
```

**4. Check for port conflicts**
The game uses ports 3000-3002, 8766, 3030. If something else is using these:
```bash
# On macOS/Linux
lsof -i :3000
lsof -i :8766
lsof -i :3030
```
Kill conflicting processes or change ports in config

**5. Clear build artifacts**
```bash
# Remove stale JavaScript files
find custom_game_engine/packages -path "*/src/*.js" -type f -delete
find custom_game_engine/packages -path "*/src/*.d.ts" -type f -delete
npm run build
```

---

## Low Performance / FPS

### Symptoms
- TPS below 15 (should be 20)
- FPS below 30
- Laggy camera movement
- Delayed UI responses

### Immediate Fixes

**1. Enable Performance Mode**
- Settings Panel → Graphics → Performance Mode ON
- Reduces particle effects, lowers rendering quality
- Should immediately improve FPS

**2. Reduce Agent Count**
- Too many agents (>50) can overwhelm simulation
- Avoid spawning excessive agents
- Consider removing some agents via Dev Panel

**3. Close Unused Panels**
- Each UI panel consumes resources
- Close panels you're not actively using
- Use Admin Dashboard instead of many in-game panels

**4. Lower Graphics Settings**
Settings Panel → Graphics:
- Particles: OFF or LOW
- Sprite quality: LOW
- Shadow effects: OFF
- Weather effects: REDUCED

**5. Adjust Simulation Settings**
Settings Panel → Simulation:
- Entity culling: AGGRESSIVE
- Throttle non-critical systems: ON
- Reduce update frequencies

### Deeper Solutions

**6. Check Browser Performance**
- Open browser DevTools (F12)
- Performance tab → Record
- Look for slow functions
- Try different browser (Chrome usually fastest)

**7. Disable Browser Extensions**
- Ad blockers, privacy extensions can slow rendering
- Try game in incognito/private mode
- Re-enable extensions one by one to find culprit

**8. System Resource Check**
- Close other applications
- Check RAM usage (game can use 2-4GB)
- Ensure CPU isn't thermal throttling
- Consider upgrading hardware if consistently slow

### Performance Monitoring

**Use Performance Stats Panel (F3):**
- TPS < 15 = simulation bottleneck
- FPS < 30 = rendering bottleneck
- High entity count = too many objects
- Memory > 4GB = potential leak

**Use Admin Dashboard:**
- http://localhost:8766/admin → Overview
- See detailed performance metrics
- Identify which systems are slowest
- Check LLM queue backlog

---

## Agents Not Doing Anything

### Symptoms
- Agents standing idle
- No resource gathering
- No building construction
- Agents seem "stuck"

### Diagnostic Steps

**1. Select the agent** (left-click)
- Check Agent Info Panel
- Look at "Current Thought" and "Behavior"
- Check needs - are any critical (red)?

**2. Check critical needs**
If needs are red (< 30%):
- **Hunger:** No food available? Spawn food via Dev Panel or ensure farms
- **Energy:** No beds? Build tents or sleeping areas
- **Social:** Isolated? Spawn more agents nearby
- **Temperature:** Too hot/cold? Build shelters

**3. Check resources**
- Open Resources Panel
- Is there food available?
- Are there materials for building?
- Add resources via Dev Panel if scarce

**4. Check accessibility**
- Can agent reach resources?
- Are paths blocked by water, cliffs, buildings?
- Right-click on resources → "Mark for gathering"

**5. Check world generation**
- Is spawn location in viable biome?
- Too much water/ocean around agents?
- Try spawning agents in different location

### Solutions

**Spawn essential resources:**
```
Dev Panel → Spawn:
- Spawn 10-20 food items around agents
- Spawn 5-10 trees for wood
- Place tent blueprints for shelter
```

**Reset stuck agents:**
```
Dev Panel → Cheats:
- Select stuck agent
- Grant Skill XP (kickstarts decision-making)
- Or spawn new agents to replace
```

**Check logs:**
```
Browser console (F12):
- Look for error messages
- "Action failed" warnings
- Pathfinding errors
```

---

## Browser Console Errors

### Symptoms
- Red error messages in DevTools console (F12)
- Game crashes or freezes
- Features not working

### Common Errors and Fixes

**"Failed to fetch sprite"**
- PixelLab sprite service issue
- Check sprite daemon: `./start.sh status`
- Restart: `./start.sh kill && ./start.sh`

**"Cannot read property of undefined"**
- Game state corruption
- Try loading earlier save: Dev Panel → Load Game
- Check Time Travel in Admin Dashboard

**"WebSocket connection failed"**
- Metrics server not running
- Check: http://localhost:8766/admin
- Restart: `./start.sh kill && ./start.sh`

**"Maximum call stack size exceeded"**
- Infinite loop in simulation
- Pause game (Space)
- Save and reload
- Report as bug if reproducible

**"Out of memory"**
- Too many entities or memory leak
- Reduce agent count
- Clear old save data
- Restart browser

### Reporting Bugs

If errors persist:
1. Copy full error message from console
2. Note steps to reproduce
3. Check if error repeats on fresh world
4. Report on GitHub Issues with:
   - Error message
   - Reproduction steps
   - Browser/OS info
   - Save file (if applicable)

---

## Sprites Not Displaying

### Symptoms
- Agents appear as colored squares
- Missing textures
- Placeholder sprites

### Solutions

**1. Wait for sprite generation**
- PixelLab daemon generates sprites on-demand
- First time can take 5-10 seconds per sprite
- Check bottom-left corner for "Generating sprite..." message

**2. Check PixelLab daemon**
```bash
./start.sh status
# Should show pixellab daemon running

# If not running:
./start.sh kill
./start.sh
```

**3. Verify sprite cache**
```bash
ls custom_game_engine/packages/renderer/assets/sprites/pixellab/
# Should show .png files
```

**4. Clear sprite cache and regenerate**
```bash
rm -rf custom_game_engine/packages/renderer/assets/sprites/pixellab/*
# Sprites will regenerate on next game load
```

**5. Check network connection**
- PixelLab daemon needs internet to access API
- Verify connection active
- Check firewall not blocking requests

**6. Use fallback sprites**
Settings Panel → Graphics → Sprite Mode: FALLBACK
- Uses simple colored shapes instead of PixelLab
- Performance improvement
- Less aesthetic but reliable

---

## Save/Load Issues

### Cannot Save Game

**Symptoms:**
- "Save failed" error
- No save files appearing

**Solutions:**
1. Check browser storage quota
   - DevTools → Application → Storage
   - Clear old saves if quota exceeded
2. Permissions issue
   - Ensure browser allows IndexedDB
   - Try different browser
3. Corruption
   - Save to different slot
   - Export save to file (backup)

### Cannot Load Game

**Symptoms:**
- "Load failed" error
- Game crashes on load
- Save file corrupted

**Solutions:**
1. **Try Time Travel**
   - Admin Dashboard → Time Travel
   - Load earlier auto-save snapshot
   - Auto-saves every 60 seconds

2. **Check save file integrity**
   - Admin Dashboard → Overview → Saves
   - Look for corruption warnings
   - Try different save slot

3. **Data recovery**
   ```bash
   # Saves stored in: custom_game_engine/demo/multiverse-data/
   ls -la custom_game_engine/demo/multiverse-data/universes/
   # Check for .json.gz files
   ```

4. **Start fresh**
   - Dev Panel → Clear World
   - Rebuild from scratch (last resort)

---

## Performance Optimization Checklist

Follow this checklist for best performance:

- [ ] **Enable Performance Mode** (Settings → Graphics)
- [ ] **Limit agents to 30-40** (fewer if struggling)
- [ ] **Close unused UI panels**
- [ ] **Disable particles** (Settings → Graphics)
- [ ] **Use fallback sprites** (Settings → Graphics)
- [ ] **Enable entity culling** (Settings → Simulation)
- [ ] **Lower FPS cap** to 30 (Settings → Performance)
- [ ] **Close other browser tabs**
- [ ] **Restart browser** periodically (clears memory leaks)
- [ ] **Use Chrome** (usually fastest renderer)
- [ ] **Check Admin Dashboard** for slow systems
- [ ] **Reduce automation complexity** (fewer conveyors/machines)
- [ ] **Limit active magic effects**
- [ ] **Pause when not actively playing** (Space)

---

## Servers Not Responding

### Metrics Server (Port 8766)

**Test:**
```bash
curl http://localhost:8766/admin
```

**If fails:**
```bash
# Kill and restart
./start.sh kill
./start.sh server
```

### Game Server (Port 3000)

**Test:**
```
Visit: http://localhost:3000
```

**If fails:**
```bash
# Check Vite output for errors
# Look in terminal where ./start.sh ran
# Common: Port 3000 already in use
```

### PixelLab Daemon

**Check status:**
```bash
./start.sh status
```

**Check logs:**
```bash
# Logs location varies, check start.sh output
tail -f /path/to/pixellab-daemon.log
```

---

## Need to Restart Servers

### When Restart Required

**Required (rare):**
- After `npm install` (new dependencies)
- Config file changes (`vite.config.ts`, `tsconfig.json`, `.env`)
- Persistent crashes
- Stale `.js` files in `src/` (shouldn't happen but can)

**NOT required (Vite HMR auto-reloads):**
- TypeScript changes
- Component changes
- System changes
- UI panel changes
- 99% of code changes!

### How to Restart

**Full restart:**
```bash
./start.sh kill     # Stop all servers
./start.sh          # Start everything fresh
```

**Restart just game:**
```bash
# Ctrl+C in terminal running Vite
cd custom_game_engine/demo
npm run dev
```

**Restart just metrics:**
```bash
# Kill metrics server process
cd custom_game_engine
npm run metrics
```

> **Important:** Restarting destroys current simulation state! Save first if you want to preserve it.

---

## Getting Help

### Before Asking for Help

1. **Check this guide** for your issue
2. **Search existing GitHub Issues**
3. **Try in fresh world** (does bug reproduce?)
4. **Check browser console** (F12) for errors
5. **Try different browser**
6. **Update to latest code** (`git pull`)

### Where to Get Help

**GitHub Issues:**
- Bug reports: https://github.com/[your-org]/ai_village/issues
- Feature requests
- Documentation issues

**Discussions:**
- General questions
- Sharing experiences
- Strategy discussions

**Admin Dashboard:**
- Self-service diagnostics
- Performance insights
- LLM queue status

### What to Include in Bug Reports

**Essential information:**
- **Description:** What happened vs. what you expected
- **Steps to reproduce:** Exact actions to trigger bug
- **Environment:** Browser, OS, Node version
- **Console errors:** Full error messages from F12
- **Screenshots:** If visual bug
- **Save file:** If bug relates to specific game state

**Example good bug report:**
```
Title: Agents ignore food when hunger critical

Description:
Agents stand idle with 0% hunger instead of eating available food.

Steps to reproduce:
1. Spawn 5 agents
2. Spawn 20 bread items nearby
3. Wait until agent hunger drops to 0%
4. Agent doesn't eat despite food in sight

Environment:
- Browser: Chrome 120
- OS: macOS 14.2
- Node: v20.10.0

Console errors:
"Pathfinding failed: no route to food at (100, 150)"

Save file attached: broken-agents.json
```

---

## Advanced Troubleshooting

### Clearing All Data

**Nuclear option - resets everything:**
```bash
cd custom_game_engine
./start.sh kill
rm -rf demo/multiverse-data/*
rm -rf node_modules
npm install
./start.sh
```

Use only if:
- Persistent corruption
- Nothing else works
- Starting completely fresh

### Debug Mode

**Enable verbose logging:**
```javascript
// In browser console:
localStorage.setItem('debug', 'true');
// Reload page
// Check console for detailed logs
```

### Performance Profiling

**Browser profiler:**
1. F12 → Performance tab
2. Click Record
3. Let game run 10 seconds
4. Stop recording
5. Look for:
   - Long-running functions
   - Excessive garbage collection
   - Rendering bottlenecks

### Memory Leak Detection

**Check for leaks:**
1. F12 → Memory tab
2. Take heap snapshot
3. Play for 5 minutes
4. Take another snapshot
5. Compare - should be similar size
6. If growing constantly = leak

---

## Known Issues

### Current limitations:
- **Large agent counts (>50)** can cause performance issues
- **Sprite generation** requires internet connection
- **Auto-save** can cause brief lag spike
- **Magic system** some paradigms incomplete
- **3D renderer** experimental, may have bugs
- **Multiverse networking** not yet implemented

### Workarounds:
- Keep agent count reasonable
- Use fallback sprites if offline
- Increase auto-save interval in settings
- Disable incomplete magic paradigms
- Use 2D renderer for stability
- Single universe for now

---

## Still Having Issues?

If this guide didn't solve your problem:

1. **Open GitHub Issue** with detailed information
2. **Ask in Discussions** if it's a question
3. **Check Admin Dashboard** for system diagnostics
4. **Try earlier git commit** if recent update broke things
5. **Report performance data** from F3 panel

We're here to help make the simulation work smoothly for you!

---

**[← Back to Main Docs](./README.md)**
