# Controls Reference

**Keyboard and mouse controls for Multiverse: The End of Eternity.**

---

## 🎮 Current Status

**Note:** Most controls are planned for the upcoming pawn system. Currently the game is primarily mouse-driven observation.

---

## 🖱️ Mouse Controls (Active Now)

### Navigation
- **Left Click** - Select agent or object
- **Right Click** - Context menu (coming soon)
- **Mouse Wheel** - Zoom in/out (coming soon)
- **Middle Click + Drag** - Pan camera (coming soon)

### Selection
- **Click Agent** - Select and view agent details in right panel
- **Click Empty Space** - Deselect

### Admin Controls (Dev Panel)
- **Click Dev Panel Buttons** - Trigger admin actions
- **Click Spawn Buttons** - Create agents or items

---

## ⌨️ Keyboard Controls (Planned)

### Movement (Pawn System)
| Key | Action |
|-----|--------|
| `W` | Move forward/up |
| `A` | Move left |
| `S` | Move backward/down |
| `D` | Move right |
| `Shift` | Run (faster movement) |
| `Space` | Jump (if implemented) |

### Interaction
| Key | Action |
|-----|--------|
| `E` | Interact with selected object/agent |
| `F` | Pick up item |
| `Q` | Drop held item |
| `R` | Use/activate held item |

### Interface
| Key | Action |
|-----|--------|
| `I` | Toggle inventory |
| `M` | Toggle magic menu |
| `C` | Toggle character sheet |
| `J` | Toggle journal/memories |
| `B` | Toggle building mode |
| `Esc` | Cancel action / Open menu |
| `Tab` | Cycle selected agent/object |
| `~` or `` ` `` | Toggle console (debug) |

### Combat (Planned)
| Key | Action |
|-----|--------|
| `Left Click` | Attack/use weapon |
| `Right Click` | Block/defend |
| `1-9` | Quick-slot items/spells |
| `Ctrl` | Sneak/crouch |

### Camera
| Key | Action |
|-----|--------|
| Arrow Keys | Pan camera |
| `Home` | Center on pawn |
| `+` / `=` | Zoom in |
| `-` / `_` | Zoom out |
| `[` | Rotate camera left |
| `]` | Rotate camera right |

### Quick Actions
| Key | Action |
|-----|--------|
| `H` | Toggle UI visibility |
| `P` | Pause game |
| `F1` | Help menu |
| `F2` | Quick save |
| `F3` | Quick load |
| `F11` | Fullscreen toggle |
| `F12` | Screenshot |

---

## 🖱️ Advanced Mouse Controls (Planned)

### Building Mode
- **Left Click** - Place block
- **Right Click** - Remove block
- **Shift + Left Click** - Place multiple blocks
- **Ctrl + Left Click** - Copy block type
- **Mouse Wheel** - Cycle block type

### Magic Casting
- **Hold Right Click** - Aim spell
- **Release Right Click** - Cast spell
- **Mouse Wheel** - Cycle prepared spells

### Context Menus
- **Right Click Agent** - Show interaction menu
  - Talk
  - Trade
  - Follow
  - Attack
- **Right Click Object** - Show action menu
  - Pick up
  - Examine
  - Use
  - Destroy
- **Right Click Ground** - Show world menu
  - Build here
  - Plant seed
  - Dig
  - Mark area

---

## 🎯 Special Combinations

### Building
| Combo | Action |
|-------|--------|
| `B` then `1-9` | Quick-select building type |
| `B` + `Shift` + Click | Build multiple |
| `B` + `Ctrl` + Click | Demolish |
| `B` + `Alt` + Drag | Select area to build |

### Magic
| Combo | Action |
|-------|--------|
| `M` then `1-9` | Quick-cast spell slot |
| `M` + `Shift` | Open spell creation |
| `M` + `Ctrl` + Click | Target area spell |
| `M` + `Alt` + Click | Multi-target spell |

### Social
| Combo | Action |
|-------|--------|
| `E` + `Click Agent` | Initiate conversation |
| `E` + `Shift` + Click | Trade with agent |
| `E` + `Ctrl` + Click | Gift item to agent |
| `E` + `Alt` + Click | Command agent (if follower) |

---

## 📱 Gamepad Support (Planned)

### Xbox/PlayStation Controller

**Movement:**
- Left Stick - Move character
- Right Stick - Camera/aim

**Actions:**
- A/X - Interact/confirm
- B/O - Cancel/back
- X/□ - Use item
- Y/△ - Jump/special

**Bumpers/Triggers:**
- LB/L1 - Cycle spells/items left
- RB/R1 - Cycle spells/items right
- LT/L2 - Block/defend
- RT/R2 - Attack/cast spell

**D-Pad:**
- Up - Magic menu
- Down - Inventory
- Left - Character sheet
- Right - Journal

**Special:**
- Start - Pause menu
- Select/Share - Map
- Left Stick Click - Sprint
- Right Stick Click - Lock target

---

## 🔧 Customization (Planned)

### Keybinding
- All keys will be rebindable in settings
- Multiple keys can be bound to same action
- Gamepad buttons customizable
- Save/load control schemes

### Accessibility
- One-handed mode
- Auto-run toggle
- Sticky keys support
- Simplified controls option
- Mouse-only mode

---

## 🎮 Control Schemes (Planned)

### Standard
Default controls as listed above.

### ESDF (Alternative)
Movement on ESDF instead of WASD for more accessible key positions.

### Southpaw
Mirrored controls for left-handed players.

### Laptop
Optimized for keyboards without numpad or function keys.

### Minimal
Essential controls only, fewer keybinds needed.

---

## 🖥️ Admin/Debug Controls

### Current (Dev Panel)
These work now in the dev panel:

- **Spawn Agent** button - Create new agent
- **Spawn Item** button - Create new item
- **Speed Controls** - Fast forward time
- **Tick Controls** - Step through ticks

### Debug Console (Browser)
Press F12 to open browser console:

```javascript
// Select agent
game.setSelectedAgent('agent-id');

// Grant XP
game.grantSkillXP('agent-id', 100);

// Check skills
game.getAgentSkills('agent-id');
```

### Admin Dashboard
Access at http://localhost:8766/admin

- No keyboard shortcuts yet (mouse-driven interface)
- Coming: keyboard shortcuts for common admin tasks

---

## 💡 Tips for Efficient Play

### Keyboard Efficiency
1. Learn the number keys for quick-slots
2. Use Tab to quickly cycle selections
3. Hold Shift for continuous actions
4. Use Home to quickly return to your pawn

### Mouse Efficiency
1. Right-click for context menus (fastest access)
2. Middle-click drag for fast camera movement
3. Use mouse wheel for quick zoom adjustments

### Hybrid Play
- Keep one hand on WASD, one on mouse
- Use thumb for Space/Shift
- Quick-slots accessible with left hand
- Mouse for precision targeting

---

## 🆘 Help & Issues

### Controls Not Working?

**Check:**
1. Game window has focus (click it)
2. Not typing in a text field
3. No sticky keys enabled (Windows)
4. Keyboard layout is correct

**Try:**
1. Click the game window
2. Press Escape to close any menus
3. Refresh browser (Ctrl+R)
4. Check browser console (F12) for errors

### Conflicts with Browser

Some browser shortcuts may conflict:
- `Ctrl+W` - Closes tab (disable in browser settings)
- `Ctrl+T` - New tab
- `F11` - Fullscreen (may work for browser, not game)

**Solution:** Game-specific shortcuts will be designed to avoid conflicts where possible.

---

## 📋 Quick Reference Card

**Essential Controls (When Pawn System Releases):**

```
Movement:      WASD
Interact:      E
Inventory:     I
Magic:         M
Building:      B
Cancel/Menu:   Esc

Quick-slots:   1-9
Sprint:        Shift
Pause:         P
Help:          F1
```

Print or save this for quick reference!

---

## 🔮 Future Control Features

**Planned:**
- Voice commands (experimental)
- Eye tracking support
- VR controller support
- Mobile touch controls
- Gesture controls (trackpad)
- Macro system
- Controller haptic feedback

---

## 📚 Related Documentation

- **[PLAYER_GUIDE.md](./PLAYER_GUIDE.md)** - Complete gameplay guide
- **[FAQ.md](./FAQ.md)** - Common questions
- **[QUICK_REFERENCE.md](./custom_game_engine/QUICK_REFERENCE.md)** - Developer quick reference

---

## 📝 Control Scheme Changelog

**2026-01-16:**
- Initial control scheme documented
- Most controls planned for pawn system release

**Updates will be listed here as controls are implemented.**

---

**Note:** This document describes planned controls. Most keyboard controls will be implemented with the pawn system. Current version is primarily mouse-driven for observation.

**Last Updated:** 2026-01-16
