# MLX Server Setup for macOS

MLX is Apple's machine learning framework optimized for Apple Silicon (M1/M2/M3). It provides **2-5x faster** inference than Ollama for local LLM models.

## Prerequisites

- **macOS** with Apple Silicon (M1/M2/M3/M4)
- **Python 3.8+** (usually pre-installed on macOS)

## Installation

### 1. Install MLX-LM

```bash
pip install mlx-lm
```

### 2. Verify Installation

```bash
python3 -m mlx_lm.server --help
```

## Running the Server

### Quick Start (Recommended)

Start the server with QWEN 3 4B model (best balance of speed and quality):

```bash
mlx_lm.server --model mlx-community/Qwen3-4B-Instruct-4bit
```

The server will:
1. Download the model automatically (first time only, ~2.5GB for 4B model)
2. Start on `http://localhost:8080`
3. Provide OpenAI-compatible API at `/v1/chat/completions`

### Alternative Models

**Faster (smaller models):**
```bash
# Extremely fast - 0.6B parameters
mlx_lm.server --model mlx-community/Qwen3-0.6B-Instruct-4bit

# Very fast - 1.7B parameters
mlx_lm.server --model mlx-community/Qwen3-1.7B-Instruct-4bit
```

**Balanced (default):**
```bash
# Recommended - 4B parameters (default)
mlx_lm.server --model mlx-community/Qwen3-4B-Instruct-4bit
```

**Higher quality (larger models):**
```bash
# High quality - 8B parameters (slower but better decisions)
mlx_lm.server --model mlx-community/Qwen3-8B-Instruct-4bit
```

### Custom Configuration

```bash
# Custom port
mlx_lm.server --model mlx-community/Qwen3-1.7B-Instruct-4bit --port 9000

# Custom host (for network access)
mlx_lm.server --model mlx-community/Qwen3-1.7B-Instruct-4bit --host 0.0.0.0
```

## Starting the Game

### Terminal 1: Start MLX Server
```bash
mlx_lm.server --model mlx-community/Qwen3-4B-Instruct-4bit
```

Wait for: `INFO: Uvicorn running on http://localhost:8080`

### Terminal 2: Start Metrics Dashboard
```bash
cd custom_game_engine
npm run metrics-server
```

### Terminal 3: Start Game Dev Server
```bash
cd custom_game_engine
npm run dev
```

### Browser
Open `http://localhost:5173`

The game will automatically use MLX server on macOS!

## Configuration in Game

If you want to change the model or switch providers:

1. Open the game settings (press ESC or click gear icon)
2. Change the **Provider Preset** to:
   - `mlx-server` - MLX server (default on macOS)
   - `ollama-local` - Ollama (fallback)
3. Modify the **Model** field if needed
4. Save and reload

## Troubleshooting

### "Connection refused" error

**Check if server is running:**
```bash
curl http://localhost:8080/v1/models
```

Should return: `{"object":"list","data":[...]}`

**Start the server:**
```bash
mlx_lm.server --model mlx-community/Qwen3-1.7B-Instruct-4bit
```

### Slow first start

The first time you run a model, MLX downloads it from HuggingFace. This can take 1-5 minutes depending on model size. Subsequent starts are instant.

### Model not found

Try pulling the model explicitly:
```bash
# Download model to cache
python3 -c "from huggingface_hub import snapshot_download; snapshot_download('mlx-community/Qwen3-1.7B-Instruct-4bit')"
```

### Switch back to Ollama

In game settings, change preset to `ollama-local` or edit `SettingsPanel.ts`:

```typescript
const isMacOS = false; // Force Ollama as default
```

## Performance Comparison

**MLX Server (recommended for macOS):**
- ✅ 2-5x faster inference on Apple Silicon
- ✅ Lower memory usage with quantized models
- ✅ Instant model loading (after first download)
- ✅ Native Metal acceleration

**Ollama (cross-platform):**
- ✅ Easier installation (single binary)
- ✅ Better model management UI
- ✅ Works on Linux/Windows/macOS
- ⚠️ Slower on Apple Silicon (no native MLX)

## Available QWEN 3 Models on MLX

All models from [mlx-community](https://huggingface.co/mlx-community):

| Model | Size | Speed | Quality | Use Case |
|-------|------|-------|---------|----------|
| Qwen3-0.6B-Instruct-4bit | ~400MB | ⚡⚡⚡ | ⭐⭐ | Testing/Prototyping |
| Qwen3-1.7B-Instruct-4bit | ~1GB | ⚡⚡⚡ | ⭐⭐⭐ | Fast gameplay |
| Qwen3-4B-Instruct-4bit | ~2.5GB | ⚡⚡ | ⭐⭐⭐⭐ | **Recommended** - Best balance |
| Qwen3-8B-Instruct-4bit | ~5GB | ⚡ | ⭐⭐⭐⭐⭐ | High quality decisions |

## References

- [MLX-LM GitHub](https://github.com/ml-explore/mlx-lm)
- [MLX-LM Server Docs](https://github.com/ml-explore/mlx-lm/blob/main/mlx_lm/SERVER.md)
- [MLX Community Models](https://huggingface.co/mlx-community)
- [QWEN 3 Models](https://huggingface.co/collections/Qwen/qwen3-6753c01351d09e98ca01bad3)
