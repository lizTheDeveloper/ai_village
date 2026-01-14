# Controls and Interface Reference

Master the controls to navigate and interact with the simulation effectively.

---

## Camera Controls

### Movement (Panning)
- **WASD keys** - Move camera (W=up, A=left, S=down, D=right)
- **Arrow keys** - Alternative camera movement
- **Middle mouse button + drag** - Smooth panning in any direction
- **Click and drag near screen edges** - Auto-pan when cursor approaches borders

> **Tip:** WASD is fastest for precise positioning. Middle-mouse drag is best for sweeping movements.

### Zoom
- **Mouse wheel up** - Zoom in
- **Mouse wheel down** - Zoom out
- **Zoom range:** 0.1x (way out) to 4.0x (very close)

> **Tip:** Zoom all the way in to see agent facial expressions and detailed animations. Zoom out to see the full village layout.

### Camera Shortcuts
- `C` - Center camera on selected agent
- `Space` - Pause/unpause the simulation
- `Tab` - Cycle through nearby agents

---

## Selection and Interaction

### Selecting Agents
- **Left-click on an agent** - Select and open Agent Info Panel
- **Left-click on ground** - Deselect current selection
- **Tab** - Cycle to next nearby agent
- **Click on Agent Roster** - Select from list of all agents

When an agent is selected:
- They'll have a highlight/indicator
- Agent Info Panel shows their details
- Camera can follow them with `C` key

### Selecting Objects
- **Left-click on trees, plants, buildings** - Open appropriate info panel
- **Right-click on any entity** - Context menu with available actions

### Context Menus
**Right-click** on agents or objects to see context-sensitive actions:

**On Agents:**
- View Details
- Follow Agent
- Grant Skill XP (dev mode)
- Inspect Memory
- View Relationships

**On Buildings:**
- Enter Building
- View Inventory
- Assign Workers
- Deconstruct

**On Resources:**
- Gather
- Chop Down (trees)
- Harvest (plants)
- Mark for Collection

---

## UI Panel Management

### Opening Panels
- **Top menu bar (☰)** - Click to see panel categories
  - Agents (Roster, Info, Skills)
  - Resources (Stockpile, Crafting, Production)
  - Magic (Spellbook, Skill Tree, Paradigms)
  - Divine (Prayers, Temples, Gods)
  - World (Time, Weather, Universe Manager)
  - Admin (Settings, Debug, Performance)

### Managing Open Panels
- **Drag title bar** - Move panel anywhere on screen
- **Click X button** - Close panel
- **Resize** (some panels) - Drag bottom-right corner
- **Pin icon** (some panels) - Keep panel on top

### Panel Shortcuts
- `Esc` - Close top-most panel
- `F1` - Help panel (documentation)
- `F2` - Dev Panel (spawn agents, debug tools)
- `F3` - Performance stats
- `I` - Agent Info (for selected agent)
- `R` - Agent Roster
- `M` - Magic Skill Tree (for selected agent)

> **Note:** The game automatically closes old panels when too many are open (LRU = least recently used). Pinned panels won't auto-close.

---

## Time Controls

Access via **Time Controls Panel** or keyboard shortcuts:

- **Space** - Pause/unpause simulation
- **1** - Normal speed (20 ticks/second)
- **2** - Fast speed (2x)
- **3** - Very fast speed (4x)
- **0** - Pause

Current time displayed in corner: `Day 3, 14:23` (Day, Hour:Minute)

---

## Dev Panel (F2)

Located on the left side. Essential for getting started:

### Spawning
- **Spawn Wandering Agent** - Create new autonomous agent at specified X,Y
- **Spawn Animal** - Add wildlife
- **Spawn Tree/Plant** - Add vegetation
- **Coordinate fields** - Set spawn location (default: camera center)

### Cheats & Testing
- **Grant Resources** - Add items to stockpile
- **Grant All Skills** - Max out selected agent's skills
- **Grant Skill XP** - Add XP to random skill
- **Trigger Event** - Force specific game events

### Quick Actions
- **Save Game** - Manual save (auto-saves every 60 seconds)
- **Load Game** - Restore from save
- **Clear World** - Reset simulation
- **Toggle Debug Overlays** - Show/hide technical info

---

## Admin Dashboard

**URL:** `http://localhost:8766/admin`

Open in a separate browser tab for advanced controls:

### Tabs
- **Overview** - Simulation status, performance metrics
- **Roadmap & Pipelines** - Development progress
- **Universes** - Manage parallel universes (advanced)
- **Agents** - Detailed agent list with filters
- **Sprites** - Sprite generation and management
- **Media & Souls** - Asset management
- **LLM Queue** - AI decision-making statistics
- **Time Travel** - Load previous simulation snapshots

### When to Use Admin Dashboard
- Monitoring performance issues
- Detailed agent inspection
- Advanced debugging
- Time travel to earlier states
- Universe management

> **Tip:** Keep admin dashboard open in a second monitor if you have one. It provides real-time stats without cluttering your game view.

---

## List of UI Panels (40+)

Quick reference of available panels. Open from top menu (☰):

### Agent Panels
- **Agent Info** - Selected agent's details, needs, thoughts, inventory
- **Agent Roster** - List of all agents with quick stats
- **Agent Skills** - Skill levels and XP progress
- **Memory Inspector** - Agent's episodic and semantic memories
- **Relationships** - Friendship/rivalry graph

### Resource & Economy
- **Resources Panel** - Stockpile inventory
- **Crafting Station** - Recipe browser and crafting queue
- **Farm Management** - Crop planning and field management
- **Shop Panel** - Trading and market prices
- **Economy Dashboard** - Resource production/consumption graphs

### Building & Construction
- **Building Designer** - Voxel building creation tool
- **Building Placement** - Place blueprints in world
- **Building List** - All constructed buildings
- **Zone Painter** - Define zones (farms, stockpiles, housing)

### Magic & Divine
- **Magic Skill Tree** - Visual skill tree for magic progression
- **Spellbook** - Known spells and effects
- **Magic Systems Panel** - Configure universe magic rules
- **Divine Powers** - God-mode abilities (if playing as deity)
- **Prayer Panel** - Agent prayers and divine requests
- **Temple Management** - Sacred sites and worship

### Combat & Security
- **Combat HUD** - Active combat status
- **Combat Log** - Combat event history
- **Unit Panel** - Combat unit selection and orders
- **Village Defense** - Guard assignments and threats

### Research & Technology
- **Research Library** - Available research projects
- **Tech Tree** - Technology dependencies
- **Discoveries** - Unlocked recipes and knowledge

### World & Time
- **Time Controls** - Pause, speed, date display
- **Weather Panel** - Current weather and forecasts
- **Universe Manager** - Multiverse controls
- **Notifications** - Event feed and alerts

### Communication
- **Chat Panel** - Agent conversations
- **Divine Communication** - God-to-agent messages

### Debug & Development
- **Dev Panel** (F2) - Spawn tools and cheats
- **Settings Panel** - Graphics, performance, controls
- **Performance Stats** (F3) - TPS, FPS, entity counts
- **Metrics Dashboard** - Detailed performance graphs
- **Controls Panel** - Keyboard shortcuts reference
- **Text Adventure Mode** - Alternative text-based interface

### Animals & Wildlife
- **Animal Info** - Selected animal details
- **Animal Roster** - All animals in world

### Special Panels
- **Soul Ceremony Modal** - Death and afterlife events
- **Vision Composer** - Divine visions and messages
- **Unified Hover Info** - Quick info on mouse hover
- **Tile Inspector** - Ground tile properties

---

## Mouse Interactions

### Left Click
- Select agents/objects
- Click UI buttons
- Place buildings (when in placement mode)
- Navigate menus

### Right Click
- Context menu on agents/objects
- Cancel current action
- Close menus

### Middle Click (Mouse Wheel Button)
- Drag to pan camera

### Scroll Wheel
- Zoom in/out
- Scroll panel contents (when hovering over panel)

### Drag and Drop
- Move UI panels
- Rearrange inventory items
- Assign items to agents

---

## Keyboard Shortcuts Summary

| Key | Action |
|-----|--------|
| `WASD` / Arrows | Pan camera |
| `Space` | Pause/unpause |
| `1`, `2`, `3` | Time speed |
| `0` | Pause |
| `C` | Center on selected agent |
| `Tab` | Next agent |
| `Esc` | Close panel |
| `F1` | Help |
| `F2` | Dev Panel |
| `F3` | Performance stats |
| `I` | Agent Info |
| `R` | Agent Roster |
| `M` | Magic Skill Tree |

> **Note:** Some shortcuts only work when no text input is focused. Click outside text fields to use shortcuts.

---

## Window Management

### Auto-Close (LRU System)
The game automatically closes older panels when you have too many open:
- **Maximum panels:** Usually 8-10
- **LRU:** Least Recently Used panels close first
- **Pinned panels:** Never auto-close
- **Current priority:** Most recently clicked panel stays

### Pinning Panels
Click the **pin icon** on a panel to prevent auto-close. Useful for:
- Time Controls (always visible)
- Agent Info (track specific agent)
- Resources (monitor stockpiles)

### Panel Persistence
Panel positions and states save automatically:
- Reopening a panel restores its last position
- Size and scroll position remembered
- Open/closed state persists across sessions

---

## Accessibility

### Text Renderer
For screen readers or low-vision players:
- **Text Adventure Panel** - Pure text representation of game state
- Describes entities, actions, and events in prose
- Keyboard navigable
- Updates in real-time

### Performance Mode
If game runs slowly:
- **Settings Panel** → Graphics → Performance Mode
- Reduces particle effects
- Lowers rendering detail
- Disables some animations

### Colorblind Support
- Settings Panel → Accessibility → Colorblind Mode
- Adjusts UI colors for better visibility
- Multiple colorblind presets available

---

## Tips for Efficient Navigation

1. **Use keyboard for camera** - WASD is faster than mouse dragging
2. **Right-click often** - Context menus reveal available actions
3. **Pin essential panels** - Keep important panels from auto-closing
4. **Learn panel shortcuts** - F2, F3, I, R, M save time
5. **Use Admin Dashboard** - Better for detailed inspection than in-game panels
6. **Center on agents** - Press `C` to follow interesting agents
7. **Zoom in for detail** - Mouse wheel zoom is powerful - use it!

---

## Next Steps

Now that you know the controls:

**[Learn Gameplay Basics →](./gameplay-basics.md)** to understand what you're controlling!

Or jump to **[UI Panels Guide](./ui-panels-guide.md)** for detailed panel documentation.
