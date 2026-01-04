# Server Registration API

## Overview

Added two new API endpoints to the orchestrator dashboard server for registering and listing servers.

## Endpoints

### POST /api/servers/register

Register a new server with the dashboard.

**Request Body:**
```json
{
  "name": "game-dev-server",      // Required: Server name
  "port": 3000,                   // Required: Port number
  "type": "vite",                 // Required: Server type
  "status": "ready",              // Optional: Server status (default: "unknown")
  "timestamp": 1234567890,        // Optional: Timestamp (default: Date.now())
  "pid": 12345,                   // Optional: Process ID (default: null)
  "url": "http://localhost:3000"  // Optional: Server URL (default: http://localhost:{port})
}
```

**Success Response (200):**
```json
{
  "success": true,
  "serverId": "server-1735934567890-abc123",
  "message": "Server registered successfully"
}
```

**Error Response (400):**
```json
{
  "error": "name is required"
}
```

**Validation:**
- `name` is required
- `port` is required
- `type` is required

### GET /api/servers

List all registered servers.

**Success Response (200):**
```json
[
  {
    "serverId": "server-1735934567890-abc123",
    "name": "game-dev-server",
    "port": 3000,
    "type": "vite",
    "status": "ready",
    "timestamp": 1234567890,
    "pid": 12345,
    "url": "http://localhost:3000",
    "registeredAt": "2026-01-03T10:30:45.123Z"
  }
]
```

## Implementation Details

- **Storage:** In-memory Map (data does not persist across server restarts)
- **Server ID Generation:** `server-{timestamp}-{random}` format using timestamp + random string
- **Auto-fields:**
  - `registeredAt` is automatically set to current ISO timestamp
  - `status` defaults to "unknown" if not provided
  - `timestamp` defaults to `Date.now()` if not provided
  - `url` defaults to `http://localhost:{port}` if not provided
  - `pid` defaults to `null` if not provided

## Testing

Run the test script to verify the API:

```bash
cd /Users/annhoward/src/ai_village/agents/autonomous-dev/dashboard
./test-server-registration.sh
```

Or manually test with curl:

```bash
# Register a server
curl -X POST http://localhost:3030/api/servers/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "test-server",
    "port": 5000,
    "type": "express",
    "status": "running"
  }'

# List all servers
curl http://localhost:3030/api/servers
```

## Location

File: `/Users/annhoward/src/ai_village/agents/autonomous-dev/dashboard/server.js`

Lines: 2028-2094
