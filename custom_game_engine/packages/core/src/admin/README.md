# Admin Dashboard Backend

HTTP API and UI for game administration. Unified interface serving both humans (HTML) and LLMs (text/JSON).

## Architecture

**CapabilityRegistry**: Single registration point for admin features. Each capability defines queries (read), actions (write), and optional links.

**AdminRouter**: Routes `/admin/*` requests. Detects client type (browser/LLM/API) via User-Agent and serves appropriate format (HTML/text/JSON).

**ClientDetector**: Analyzes headers to determine output format. Supports `?format=html|text|json` override.

**Renderers**: `HtmlRenderer` (browser), `TextRenderer` (LLM/curl), automatic JSON serialization.

## Capabilities System

**Registration**:
```typescript
import { capabilityRegistry, defineCapability, defineQuery, defineAction } from '../CapabilityRegistry';

const myCapability = defineCapability({
  id: 'my-feature',
  name: 'My Feature',
  category: 'systems',
  queries: [
    defineQuery({
      id: 'list',
      name: 'List Items',
      params: [{ name: 'limit', type: 'number', required: false, default: 10 }],
      handler: async (params, gameClient, context) => {
        // Query logic
      }
    })
  ],
  actions: [
    defineAction({
      id: 'create',
      name: 'Create Item',
      params: [{ name: 'name', type: 'string', required: true }],
      handler: async (params, gameClient, context) => {
        // Action logic
        return { success: true, message: 'Created' };
      }
    })
  ]
});

capabilityRegistry.register(myCapability);
```

**Built-in Capabilities** (`capabilities/`):
- `overview` - Dashboard summary
- `roadmap` - Development pipelines
- `universes` - Universe spawn/management
- `agents` - Agent inspection/control
- `sprites` - Sprite generation (PixelLab)
- `media` - Recordings, cable network
- `llm` - Provider stats, queue status
- `saves` - Time travel, snapshots

## API Routes

**Queries**: `GET /admin/queries/{id}?param=value`
**Actions**: `POST /admin/actions/{id}` (JSON body)
**Registry**: `GET /admin/registry` (all capabilities), `GET /admin/registry/{id}` (specific)
**Dashboard**: `GET /admin` (main UI)

## Adding Capabilities

1. Create file in `capabilities/`
2. Define capability with queries/actions
3. Register via `capabilityRegistry.register()`
4. Import in `capabilities/index.ts`

Auto-registers on import. See `capabilities/llm.ts` for reference implementation.
