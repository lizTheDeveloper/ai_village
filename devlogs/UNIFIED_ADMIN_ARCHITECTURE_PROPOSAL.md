# Unified Admin Architecture Proposal

## Executive Summary

Merge the **metrics server** (port 8766) and **orchestration dashboard** (port 3030) into a single intelligent service that:
- Serves HTML to browsers, text/JSON to LLMs (based on User-Agent)
- Auto-generates menus from registered system capabilities
- Provides identical functionality to humans and AI admins
- Reduces configuration to a single registration point per feature

---

## Current State Analysis

### What We Have Now

| Service | Port | Lines | Purpose | Problem |
|---------|------|-------|---------|---------|
| Metrics Server | 8766 | ~6500 | Central hub - WebSocket, dashboards, LLM queue, dev actions, sprite queue, save/load | No HTML UI, text-only |
| Orchestration Dashboard | 3030 | 75 | Proxy to 8766 + static HTML | Redundant, limited tabs |
| PixelLab Daemon | N/A | ~800 | Background sprite generation | No direct admin UI |

### Current Endpoint Sprawl

The metrics server already has **70+ endpoints** organized chaotically:
- `/dashboard/*` - Text dashboards (LLM-optimized)
- `/api/live/*` - Live game queries
- `/api/actions/*` - Dev tools
- `/api/headless/*` - Headless game management
- `/api/llm/*` - LLM queue
- `/api/sprites/*` - Sprite generation
- `/api/canon/*` - Canon events
- `/api/saves`, `/api/load`, `/api/fork` - Time travel
- `/*.html` - Hand-coded HTML pages

---

## Proposed Architecture

### Core Principle: Single Registration, Dual Rendering

```
┌─────────────────────────────────────────────────────────────────────┐
│                    UNIFIED ADMIN SERVER (Port 8766)                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐        │
│   │  CAPABILITY  │───▶│   REGISTRY   │◀───│  CAPABILITY  │        │
│   │   (System)   │    │              │    │   (System)   │        │
│   └──────────────┘    │  - Actions   │    └──────────────┘        │
│                       │  - Queries   │                             │
│   ┌──────────────┐    │  - Views     │    ┌──────────────┐        │
│   │  CAPABILITY  │───▶│  - Tabs      │◀───│  CAPABILITY  │        │
│   │   (System)   │    │              │    │   (System)   │        │
│   └──────────────┘    └──────┬───────┘    └──────────────┘        │
│                              │                                     │
│                              ▼                                     │
│   ┌─────────────────────────────────────────────────────────────┐ │
│   │                    REQUEST ROUTER                            │ │
│   │                                                              │ │
│   │   User-Agent Detection:                                      │ │
│   │     - Chrome/Firefox/Safari → HTML Renderer                  │ │
│   │     - curl/Claude/OpenAI/API → Text/JSON Renderer           │ │
│   └─────────────────────────────────────────────────────────────┘ │
│                              │                                     │
│              ┌───────────────┴───────────────┐                    │
│              ▼                               ▼                    │
│   ┌─────────────────────┐       ┌─────────────────────┐          │
│   │   HTML RENDERER     │       │   TEXT RENDERER     │          │
│   │                     │       │                     │          │
│   │ - Tabbed dashboard  │       │ - Plain text menus  │          │
│   │ - Buttons/forms     │       │ - curl examples     │          │
│   │ - Real-time updates │       │ - JSON responses    │          │
│   │ - Visual charts     │       │ - Structured output │          │
│   └─────────────────────┘       └─────────────────────┘          │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

### User-Agent Detection Logic

```typescript
function getClientType(req: IncomingMessage): 'browser' | 'llm' | 'api' {
  const ua = req.headers['user-agent'] || '';
  const accept = req.headers['accept'] || '';

  // Explicit format override via query param
  const url = new URL(req.url || '/', `http://localhost`);
  const format = url.searchParams.get('format');
  if (format === 'html') return 'browser';
  if (format === 'text' || format === 'json') return 'api';

  // LLM clients (Claude Code, OpenAI, custom agents)
  if (ua.includes('Claude') || ua.includes('OpenAI') || ua.includes('Anthropic')) {
    return 'llm';
  }

  // curl, wget, httpie, etc.
  if (ua.includes('curl') || ua.includes('wget') || ua.includes('httpie')) {
    return 'api';
  }

  // Browsers want HTML
  if (accept.includes('text/html') && (
    ua.includes('Chrome') || ua.includes('Firefox') ||
    ua.includes('Safari') || ua.includes('Edge')
  )) {
    return 'browser';
  }

  // Default to API for unknown clients
  return 'api';
}
```

---

## Capability Registry Design

### Registration Interface

```typescript
interface AdminCapability {
  // Identity
  id: string;                    // 'sprites', 'universes', 'agents', etc.
  name: string;                  // Human-readable name
  description: string;           // One-line description
  category: CapabilityCategory;  // 'world', 'entities', 'systems', 'meta'

  // Tab configuration (for HTML view)
  tab?: {
    icon: string;                // Emoji or icon name
    priority: number;            // Sort order (lower = first)
  };

  // Actions this capability provides
  actions: AdminAction[];

  // Queries this capability provides
  queries: AdminQuery[];

  // Optional: Custom view renderer
  renderView?: (context: ViewContext) => Promise<string>;
}

interface AdminAction {
  id: string;                    // 'spawn-agent', 'pause-game', etc.
  name: string;                  // Human-readable
  description: string;           // What it does

  // Parameter schema (used for form generation AND validation)
  params: AdminParam[];

  // The actual handler
  handler: (params: Record<string, any>, gameClient: WebSocket) => Promise<any>;

  // Optional: Requires confirmation?
  dangerous?: boolean;
  requiresConfirmation?: boolean;
}

interface AdminQuery {
  id: string;                    // 'list-agents', 'get-universe', etc.
  name: string;
  description: string;

  // Parameter schema
  params: AdminParam[];

  // The actual handler (returns data)
  handler: (params: Record<string, any>, gameClient: WebSocket | null) => Promise<any>;

  // How to render the result (for HTML)
  renderResult?: (data: any) => string;
}

interface AdminParam {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'entity-id';
  required: boolean;
  description: string;
  default?: any;
  options?: { value: string; label: string }[];  // For 'select' type
  validation?: (value: any) => boolean | string;
}
```

### Example Registration

```typescript
// In packages/core/src/admin/capabilities/agents.ts
export const agentsCapability: AdminCapability = {
  id: 'agents',
  name: 'Agent Management',
  description: 'Spawn, modify, and query AI agents',
  category: 'entities',

  tab: {
    icon: '🧑',
    priority: 10,
  },

  actions: [
    {
      id: 'spawn-agent',
      name: 'Spawn Agent',
      description: 'Create a new AI agent at a specific location',
      params: [
        { name: 'name', type: 'string', required: true, description: 'Agent name' },
        { name: 'x', type: 'number', required: true, description: 'X position' },
        { name: 'y', type: 'number', required: true, description: 'Y position' },
        { name: 'useLLM', type: 'boolean', required: false, default: true, description: 'Use LLM for decisions' },
      ],
      handler: async (params, gameClient) => {
        return sendGameAction(gameClient, 'spawn-agent', params);
      },
    },
    {
      id: 'teleport',
      name: 'Teleport Agent',
      description: 'Move an agent instantly to a new location',
      params: [
        { name: 'agentId', type: 'entity-id', required: true, description: 'Agent to teleport' },
        { name: 'x', type: 'number', required: true, description: 'Destination X' },
        { name: 'y', type: 'number', required: true, description: 'Destination Y' },
      ],
      handler: async (params, gameClient) => {
        return sendGameAction(gameClient, 'teleport', params);
      },
    },
    // ... more actions
  ],

  queries: [
    {
      id: 'list-agents',
      name: 'List Agents',
      description: 'Get all agents in the current game session',
      params: [
        { name: 'session', type: 'string', required: false, description: 'Session ID (default: active)' },
      ],
      handler: async (params, gameClient) => {
        return queryGame(gameClient, 'list-entities', { type: 'agent' });
      },
      renderResult: (agents) => {
        return agents.map(a => `${a.name} (${a.id}) at (${a.x}, ${a.y})`).join('\n');
      },
    },
  ],
};

// Register it
capabilityRegistry.register(agentsCapability);
```

---

## Tab Structure for Browser UI

### Proposed Tabs

| Tab | Icon | Capabilities | Description |
|-----|------|--------------|-------------|
| **Overview** | 🏠 | Dashboard summary | Running sessions, system health, quick actions |
| **Universes** | 🌌 | universes, headless | List running games, spawn/stop, fork/merge |
| **Agents** | 🧑 | agents, needs, skills | Agent CRUD, behavior triggers, stats |
| **World** | 🗺️ | terrain, buildings, entities | Map manipulation, entity spawning |
| **Magic & Divine** | ✨ | magic, divinity, spells | Magic systems, gods, belief |
| **Research** | 🔬 | research, discoveries | Research tree, papers, unlocks |
| **Sprites** | 🎨 | sprites, pixellab | Generation queue, status, regenerate |
| **LLM** | 🤖 | llm-queue, llm-costs | Provider status, queue, costs |
| **Time Travel** | ⏱️ | saves, load, fork | Checkpoints, rewind, branch |
| **Canon** | 📜 | canon-events | Multiverse bridging, exports |

### Auto-Generated Tab Content

Each tab auto-generates from its registered capabilities:

```html
<!-- Auto-generated from capability registry -->
<div class="tab-content" id="agents-tab">
  <h2>🧑 Agent Management</h2>
  <p>Spawn, modify, and query AI agents</p>

  <section class="queries">
    <h3>Queries</h3>
    <!-- Auto-generated from queries[] -->
    <div class="query-card">
      <h4>List Agents</h4>
      <p>Get all agents in the current game session</p>
      <form data-query="agents.list-agents">
        <label>Session: <input name="session" placeholder="(active)"></label>
        <button type="submit">Run Query</button>
      </form>
      <pre class="result"></pre>
    </div>
  </section>

  <section class="actions">
    <h3>Actions</h3>
    <!-- Auto-generated from actions[] -->
    <div class="action-card">
      <h4>Spawn Agent</h4>
      <p>Create a new AI agent at a specific location</p>
      <form data-action="agents.spawn-agent">
        <label>Name: <input name="name" required></label>
        <label>X: <input name="x" type="number" required></label>
        <label>Y: <input name="y" type="number" required></label>
        <label>Use LLM: <input name="useLLM" type="checkbox" checked></label>
        <button type="submit">Execute</button>
      </form>
    </div>
  </section>
</div>
```

---

## Text/LLM View Auto-Generation

The same registry generates text output for LLMs:

```
================================================================================
ADMIN CONSOLE - AI Village
================================================================================

Game Status: 🟢 CONNECTED (session: abc123)
Active Agents: 15 | Day: 47 | TPS: 20.1

================================================================================
AVAILABLE TABS
================================================================================

1. overview      - Dashboard summary and quick actions
2. universes     - Running games: spawn/stop, fork/merge
3. agents        - Agent CRUD, behavior triggers, stats
4. world         - Map manipulation, entity spawning
5. magic         - Magic systems, gods, belief
6. research      - Research tree, papers, unlocks
7. sprites       - Generation queue, status
8. llm           - Provider status, queue, costs
9. time-travel   - Checkpoints, rewind, branch
10. canon        - Multiverse bridging, exports

Type: GET /admin/agents (or curl http://localhost:8766/admin/agents)

================================================================================
QUICK ACTIONS
================================================================================

Pause Game:     POST /admin/actions/pause {"paused": true}
Spawn Agent:    POST /admin/actions/spawn-agent {"name": "Bob", "x": 10, "y": 10}
List Agents:    GET /admin/queries/list-agents?session=abc123

================================================================================
```

When you request `/admin/agents`:

```
================================================================================
AGENT MANAGEMENT
================================================================================

🧑 Spawn, modify, and query AI agents

--------------------------------------------------------------------------------
QUERIES (read-only)
--------------------------------------------------------------------------------

• list-agents
  Get all agents in the current game session
  curl "http://localhost:8766/admin/queries/list-agents?session=<id>"

• get-agent
  Get detailed info for a specific agent
  curl "http://localhost:8766/admin/queries/get-agent?id=<agentId>"

--------------------------------------------------------------------------------
ACTIONS (modify game state)
--------------------------------------------------------------------------------

• spawn-agent
  Create a new AI agent at a specific location
  curl -X POST http://localhost:8766/admin/actions/spawn-agent \
    -H "Content-Type: application/json" \
    -d '{"name": "Bob", "x": 10, "y": 10, "useLLM": true}'

  Parameters:
    - name (string, required): Agent name
    - x (number, required): X position
    - y (number, required): Y position
    - useLLM (boolean, optional, default: true): Use LLM for decisions

• teleport
  Move an agent instantly to a new location
  curl -X POST http://localhost:8766/admin/actions/teleport \
    -H "Content-Type: application/json" \
    -d '{"agentId": "agent_123", "x": 50, "y": 50}'

• set-need
  Modify an agent's need level
  ...

================================================================================
```

---

## Implementation Plan

### Phase 1: Core Infrastructure (Week 1)

1. **Create Capability Registry** (`packages/core/src/admin/CapabilityRegistry.ts`)
   - Interface definitions
   - Registration mechanism
   - Lookup by ID, category, tab

2. **Create Request Router** (`packages/core/src/admin/RequestRouter.ts`)
   - User-Agent detection
   - Format selection (HTML/text/JSON)
   - Route to appropriate renderer

3. **Create Base Renderers**
   - `HtmlRenderer.ts` - Generates HTML from capabilities
   - `TextRenderer.ts` - Generates text from capabilities
   - `JsonRenderer.ts` - Returns raw data

### Phase 2: Migrate Existing Endpoints (Week 2)

1. **Extract capabilities from metrics-server.ts**
   - agents capability (spawn, teleport, needs, skills)
   - world capability (entities, terrain)
   - magic capability (spells, paradigms)
   - divinity capability (gods, belief)
   - etc.

2. **Register each capability**
   - Define actions and queries
   - Provide handlers

3. **Replace hardcoded endpoints**
   - `/api/actions/*` → registered actions
   - `/api/live/*` → registered queries
   - `/dashboard/*` → auto-generated views

### Phase 3: HTML Dashboard (Week 3)

1. **Create unified HTML template**
   - Tab navigation
   - Dynamic tab content loading
   - Real-time WebSocket updates
   - Form handling

2. **Add interactive features**
   - Entity selectors (dropdowns of agents, buildings, etc.)
   - Result visualization (tables, cards)
   - Action confirmation dialogs

3. **Style with existing theme**
   - Dark mode (matches orchestration dashboard)
   - Responsive layout

### Phase 4: PixelLab Integration (Week 4)

1. **Create sprites capability**
   - Queue status query
   - Regenerate action
   - Priority adjustment

2. **Add sprite preview panel**
   - Grid of generated sprites
   - Status indicators
   - Quick regenerate button

3. **Daemon status monitoring**
   - Is daemon running?
   - Current job
   - Queue depth

### Phase 5: Remove Redundancy (Final)

1. **Delete orchestration dashboard**
   - Remove `agents/autonomous-dev/dashboard/`
   - Update `start.sh` to not start port 3030

2. **Update documentation**
   - Single server endpoint
   - How to add new capabilities

---

## API Design

### New Unified Routes

```
GET  /admin                      # Dashboard (HTML or text based on UA)
GET  /admin/{capability}         # Capability detail view
GET  /admin/queries/{id}         # Execute query
POST /admin/actions/{id}         # Execute action
GET  /admin/registry             # List all registered capabilities (for tooling)
GET  /admin/registry/{id}        # Get capability schema (for form generation)
```

### Format Override

Any endpoint accepts `?format=` query param:
- `?format=html` - Force HTML
- `?format=text` - Force plain text
- `?format=json` - Force JSON

### Backward Compatibility

Keep existing routes as aliases for 6 months:
- `/api/actions/*` → `/admin/actions/*`
- `/api/live/*` → `/admin/queries/*`
- `/dashboard/*` → `/admin/*`

---

## Benefits

### For Humans
- Single URL to bookmark (`:8766/admin`)
- Tabbed interface with all capabilities
- Forms auto-generated from capability schemas
- No need to remember curl commands

### For LLMs
- Self-documenting API
- Consistent format across all capabilities
- Same actions available as humans
- No capability hidden behind UI-only interfaces

### For Developers
- Add new feature = register one capability
- Tests can verify both HTML and text output
- Schema validation for all parameters
- No more maintaining parallel interfaces

---

## Migration Checklist

- [ ] Create `CapabilityRegistry` class
- [ ] Create `AdminCapability` interface
- [ ] Implement User-Agent detection
- [ ] Create `HtmlRenderer`
- [ ] Create `TextRenderer`
- [ ] Extract `agentsCapability` from existing endpoints
- [ ] Extract `worldCapability`
- [ ] Extract `magicCapability`
- [ ] Extract `divinityCapability`
- [ ] Extract `spritesCapability`
- [ ] Extract `llmCapability`
- [ ] Extract `savesCapability`
- [ ] Extract `canonCapability`
- [ ] Extract `headlessCapability`
- [ ] Create unified HTML dashboard template
- [ ] Add WebSocket real-time updates
- [ ] Remove orchestration dashboard (port 3030)
- [ ] Update `start.sh`
- [ ] Update CLAUDE.md documentation

---

## Open Questions

1. **Should we keep port 3030 as an alias?**
   - Redirect to 8766?
   - Or fully remove?

2. **How to handle long-running actions?**
   - Return job ID and poll?
   - WebSocket progress updates?

3. **Authentication/Authorization?**
   - Currently none (local dev only)
   - Add API keys for production?
   - Different permission levels?

4. **Should sprites tab show generated images?**
   - Inline base64?
   - Thumbnail grid?
   - Link to files?

---

## Next Steps

1. Review this proposal
2. Decide on open questions
3. Begin Phase 1 implementation
4. Iterate based on usage
