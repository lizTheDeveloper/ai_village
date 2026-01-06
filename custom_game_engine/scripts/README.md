# Multiverse: The End of Eternity - Startup Scripts

Quick-start scripts for running Multiverse: The End of Eternity in different modes.

## Quick Start

```bash
# From custom_game_engine directory:
./start.sh
```

This runs first-time setup (if needed) and launches Game Host mode.

## Modes

### Game Host Mode (Default)

Starts everything needed to host and play the game:

```bash
./start.sh gamehost
```

**Starts:**
- Metrics Server (port 8766)
- Orchestration Dashboard (port 3030)
- Game Dev Server (port 5173)
- Opens browser to http://localhost:5173

**Use when:** You want to play the game or host a game for others.

### Server Mode

Backend only for AI/autonomous operation:

```bash
./start.sh server
```

**Starts:**
- Metrics Server (port 8766)
- Orchestration Dashboard (port 3030)

**Does NOT start:**
- Game frontend
- Browser

**Use when:**
- Running headless/autonomous AI agents
- Collecting metrics without the game UI
- Running on a server without a display

**Query metrics:**
```bash
curl http://localhost:8766/dashboard?session=latest
```

### Player Mode

Opens browser to existing game server:

```bash
./start.sh player
```

**Use when:**
- Game server is already running
- You want to open another browser window
- Connecting to a remote game server (edit script to change URL)

## Individual Scripts

You can also run the mode scripts directly:

```bash
bash scripts/start-game-host.sh
bash scripts/start-server.sh
bash scripts/start-player.sh
```

## First-Time Setup

The main launcher (`start.sh`) automatically runs setup on first launch.

To manually run setup:

```bash
bash scripts/setup.sh
```

**Setup checks:**
- Node.js installation
- npm dependencies
- TypeScript build
- LLM server (optional)

## Stopping Servers

Press `Ctrl+C` to stop all servers started by a mode script.

## Troubleshooting

### Port Already in Use

If you get "port already in use" errors:

```bash
# Find process using port 5173
lsof -ti:5173 | xargs kill

# Or for other ports
lsof -ti:8766 | xargs kill
lsof -ti:3030 | xargs kill
```

### LLM Server Not Found

The game works without an LLM server, but AI agents won't make decisions.

**macOS (recommended):**
```bash
pip install mlx-lm
mlx_lm.server --model mlx-community/Qwen3-4B-Instruct-4bit
```

**All platforms:**
```bash
# Install Ollama from https://ollama.ai
ollama serve
ollama pull qwen3:1.7b
```

See [MLX_SETUP.md](../MLX_SETUP.md) for details.

## Architecture

```
┌─────────────────────────────────────────────┐
│             Game Host Mode                  │
├─────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐        │
│  │   Metrics    │  │ Orchestration│        │
│  │   :8766      │  │    :3030     │        │
│  └──────────────┘  └──────────────┘        │
│           ▲               ▲                 │
│           │               │                 │
│           │               │                 │
│  ┌────────┴───────────────┴─────┐          │
│  │      Game Dev Server          │          │
│  │         :5173                 │          │
│  └───────────────────────────────┘          │
│           │                                 │
│           ▼                                 │
│      Browser (localhost:5173)              │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│             Server Mode                     │
├─────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐        │
│  │   Metrics    │  │ Orchestration│        │
│  │   :8766      │  │    :3030     │        │
│  └──────────────┘  └──────────────┘        │
│                                             │
│  For AI agents / headless operation        │
│  Query: curl http://localhost:8766/...     │
└─────────────────────────────────────────────┘
```

## Files

- `start.sh` - Main launcher (checks setup, routes to mode)
- `scripts/setup.sh` - First-time setup
- `scripts/start-game-host.sh` - Game Host mode
- `scripts/start-server.sh` - Server mode
- `scripts/start-player.sh` - Player mode
