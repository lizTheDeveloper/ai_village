# Server-Side Sprite Generation API

The server needs to implement these endpoints to handle on-demand sprite generation via PixelLab.

## Environment Setup

Add to `.env`:
```bash
PIXELLAB_API_KEY=your_pixellab_api_key_here
```

## Required Endpoints

### POST `/api/sprites/generate`

Request sprite generation for missing sprites.

**Request Body:**
```typescript
{
  folderId: string;        // e.g., "human_male_blonde_dark"
  traits: {
    species: string;       // e.g., "human"
    gender?: string;       // e.g., "male" | "female" | "nonbinary"
    hairColor?: string;    // e.g., "blonde"
    skinTone?: string;     // e.g., "dark"
  };
  description: string;     // Full description for PixelLab
}
```

**Response:**
```typescript
{
  status: "queued" | "generating" | "complete" | "failed";
  folderId: string;
  characterId?: string;    // PixelLab character ID if queued
  error?: string;
}
```

**Implementation:**

```typescript
import { createCharacter } from '@pixellab/mcp-client'; // Or your MCP client

app.post('/api/sprites/generate', async (req, res) => {
  const { folderId, traits, description } = req.body;

  try {
    // Check if sprite already exists
    const spritePath = path.join(__dirname, `assets/sprites/pixellab/${folderId}`);
    if (fs.existsSync(spritePath)) {
      return res.json({ status: 'complete', folderId });
    }

    // Call PixelLab MCP API to create character
    const result = await createCharacter({
      description,
      n_directions: 8,
      size: 48,
      view: 'low top-down',
      // Add other parameters based on traits
    });

    // Store generation job
    generationJobs.set(folderId, {
      characterId: result.characterId,
      status: 'generating',
      startedAt: Date.now(),
    });

    res.json({
      status: 'queued',
      folderId,
      characterId: result.characterId,
    });

    // Start background download process
    pollAndDownloadSprite(folderId, result.characterId);
  } catch (error) {
    res.status(500).json({
      status: 'failed',
      folderId,
      error: error.message,
    });
  }
});
```

### GET `/api/sprites/generate/status/:folderId`

Check generation status for a sprite.

**Response:**
```typescript
{
  status: "generating" | "complete" | "failed";
  folderId: string;
  progress?: number;       // 0-100
  error?: string;
}
```

**Implementation:**

```typescript
app.get('/api/sprites/generate/status/:folderId', async (req, res) => {
  const { folderId } = req.params;

  // Check if sprite exists on disk
  const spritePath = path.join(__dirname, `assets/sprites/pixellab/${folderId}`);
  if (fs.existsSync(spritePath)) {
    return res.json({ status: 'complete', folderId });
  }

  // Check generation job status
  const job = generationJobs.get(folderId);
  if (!job) {
    return res.json({ status: 'failed', folderId, error: 'Job not found' });
  }

  res.json({
    status: job.status,
    folderId,
    progress: job.progress,
  });
});
```

## Background Download Process

When PixelLab completes generation, download and save the sprite:

```typescript
async function pollAndDownloadSprite(folderId: string, characterId: string) {
  const maxPolls = 60; // Poll for up to 5 minutes
  let polls = 0;

  const poll = async () => {
    if (polls >= maxPolls) {
      generationJobs.get(folderId).status = 'failed';
      return;
    }

    polls++;

    try {
      // Check if character is ready
      const character = await getCharacter(characterId);

      if (character.status === 'complete') {
        // Download sprite as ZIP
        const zipUrl = character.downloadUrl;
        const response = await fetch(zipUrl);
        const buffer = await response.arrayBuffer();

        // Extract ZIP to sprite folder
        const spritePath = path.join(__dirname, `assets/sprites/pixellab/${folderId}`);
        await extractZip(buffer, spritePath);

        // Mark as complete
        generationJobs.get(folderId).status = 'complete';
      } else {
        // Still generating, poll again in 5 seconds
        setTimeout(poll, 5000);
      }
    } catch (error) {
      generationJobs.get(folderId).status = 'failed';
    }
  };

  // Start polling after 5 seconds
  setTimeout(poll, 5000);
}
```

## Testing the Endpoints

```bash
# Request generation
curl -X POST http://localhost:3000/api/sprites/generate \
  -H "Content-Type: application/json" \
  -d '{
    "folderId": "human_male_red_dark",
    "traits": {
      "species": "human",
      "gender": "male",
      "hairColor": "red",
      "skinTone": "dark"
    },
    "description": "Human male with red hair, dark skin tone, wearing simple medieval peasant clothing"
  }'

# Check status
curl http://localhost:3000/api/sprites/generate/status/human_male_red_dark
```

## Flow Diagram

```
Browser                    Server                      PixelLab API
   |                          |                              |
   |-- POST /generate -------->|                              |
   |                          |-- create_character() -------->|
   |<-- 202 {queued} ----------|                              |
   |                          |                              |
   |                          |<-- character_id -------------|
   |                          |                              |
   |-- GET /status ----------->|                              |
   |<-- {generating} ----------|                              |
   |                          |                              |
   |                          |-- poll status -------------->|
   |                          |<-- complete -----------------|
   |                          |                              |
   |                          |-- download ZIP ------------->|
   |                          |<-- sprite.zip ---------------|
   |                          |                              |
   |-- GET /status ----------->|                              |
   |<-- {complete} ------------|                              |
   |                          |                              |
   |-- load sprite asset ----->|                              |
   |<-- sprite.png ------------|                              |
```

## Integration with Existing PixelLab MCP

If you're using the PixelLab MCP server, you can call it directly:

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';

const mcpClient = new Client({
  name: 'sprite-generator',
  version: '1.0.0'
});

// Connect to PixelLab MCP server
await mcpClient.connect(transport);

// Call create_character tool
const result = await mcpClient.callTool({
  name: 'mcp__pixellab__create_character',
  arguments: {
    description: '...',
    n_directions: 8,
    size: 48,
    // ...
  }
});
```
