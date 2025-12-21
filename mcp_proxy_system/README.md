# MCP Hot-Reload Proxy System - Reusable Template

**94% Context Savings** | **Zero-Restart Hot-Reload** | **Programmatic Tool Orchestration**

## What This Is

A reusable MCP (Model Context Protocol) proxy system that enables:
- **Hot-reload** MCP servers without restarting Claude Code
- **Context savings** of 94% (3 proxy tools instead of 50+ individual tools)
- **Programmatic orchestration** (call tools in loops, conditionals, workflows)
- **Dynamic installation** from git repositories

## Quick Start

### 1. Copy Template to Your Project

```bash
# Copy the entire mcp_proxy_system to your project
cp -r /Users/annhoward/src/abstract_agent_team/mcp_proxy_system /path/to/your/project/

# Or use the installation script
cd /path/to/your/project
bash mcp_proxy_system/install.sh
```

### 2. Configure Your Project

Edit `.mcp.json` in your project root:

```json
{
  "mcpServers": {
    "myproject-proxy": {
      "command": "python",
      "args": ["-m", "mcp_proxy_system.servers.proxy_server"],
      "cwd": "/path/to/your/project",
      "env": {
        "PYTHONPATH": "/path/to/your/project"
      }
    }
  }
}
```

### 3. Use It!

```python
# Load any MCP server dynamically (no restart!)
install_and_load_mcp_server("https://github.com/user/mcp-server")

# Call tools on loaded servers
call_dynamic_server_tool("mcp-server", "tool_name", {"param": "value"})

# See what's loaded
get_loaded_servers()
```

## System Architecture

```
Claude Code (you!)
    ↓
MCP Proxy Server (3 meta-tools)
    ↓
Dynamic Server Loader (subprocess manager)
    ↓
Individual MCP Servers (spawned on-demand)
```

### The 3 Proxy Tools

1. **load_mcp_server_dynamically** - Load server from .mcp.json
2. **call_dynamic_server_tool** - Call any tool on any loaded server
3. **get_loaded_servers** - See what's currently loaded

## Key Components

### 1. Dynamic Server Loader (`utils/dynamic_server_loader.py`)

Manages MCP server subprocesses:
- Spawns server as subprocess using `subprocess.Popen`
- Handles JSON-RPC bidirectional communication via stdin/stdout
- MCP protocol handshake (initialize → initialized → tools/list)
- Tool discovery and schema caching
- Process lifecycle management

```python
from mcp_proxy_system.utils.dynamic_server_loader import get_loader

loader = get_loader()
result = loader.load_server("my-server")
tools = result["tools"]  # List of available tools

# Call a tool
result = loader.call_tool("my-server", "tool_name", {"param": "value"})
```

### 2. Proxy Server (`servers/proxy_server.py`)

Exposes 3 meta-tools to Claude Code:

```python
@mcp.tool()
def load_mcp_server_dynamically(server_name: str) -> dict:
    """Load a server from .mcp.json without restart"""
    loader = get_loader()
    return loader.load_server(server_name)

@mcp.tool()
def call_dynamic_server_tool(server_name: str, tool_name: str, parameters: dict) -> dict:
    """Call any tool on any loaded server"""
    loader = get_loader()
    return loader.call_tool(server_name, tool_name, parameters)

@mcp.tool()
def get_loaded_servers() -> dict:
    """See what servers are currently loaded"""
    loader = get_loader()
    return loader.get_loaded_servers_status()
```

### 3. MCP Installer (`utils/mcp_installer.py`)

Installs servers from git:

```python
from mcp_proxy_system.utils.mcp_installer import MCPInstaller

installer = MCPInstaller()
result = installer.install_from_git("https://github.com/user/mcp-server")
# Server cloned to ~/.mcp_servers/ and added to .mcp.json
```

## Installation Guide

### Prerequisites

```bash
pip install fastmcp
```

### Step 1: Copy Template

```bash
# Copy to your project
cp -r /path/to/abstract_agent_team/mcp_proxy_system /path/to/your/project/
```

### Step 2: Customize for Your Project

Edit `servers/proxy_server.py` to import your project-specific operations:

```python
# Example: AI Tutor project
from ai_tutor.operations.students import get_student, create_student
from ai_tutor.operations.classes import get_class, enroll_student

# Register tools
TOOL_REGISTRY = {
    "get_student": get_student,
    "create_student": create_student,
    "get_class": get_class,
    "enroll_student": enroll_student,
}
```

### Step 3: Add to .mcp.json

```json
{
  "mcpServers": {
    "yourproject-proxy": {
      "command": "python",
      "args": ["-m", "mcp_proxy_system.servers.proxy_server"],
      "cwd": "/absolute/path/to/your/project",
      "env": {
        "PYTHONPATH": "/absolute/path/to/your/project",
        "DATABASE_URL": "your-database-url",
        "API_KEY": "your-api-key"
      }
    }
  }
}
```

### Step 4: Restart Claude Code (One Time Only)

After the first installation, restart Claude Code to load the proxy server.

**From this point on, you can add/reload servers WITHOUT restarting!**

## Usage Patterns

### Pattern 1: Dynamic Installation

```python
# Install and use a new server immediately
install_and_load_mcp_server("https://github.com/community/analytics-mcp")

# Tools available in ~30 seconds!
call_dynamic_server_tool("analytics-mcp", "get_metrics", {"date": "2024-01-01"})
```

### Pattern 2: Hot-Reload During Development

```python
# Load your development server
load_mcp_server_dynamically("my-dev-server")

# Test it
call_dynamic_server_tool("my-dev-server", "test_feature", {})

# Make code changes...

# Reload with new code
reload_mcp_server("my-dev-server")

# Test again
call_dynamic_server_tool("my-dev-server", "test_feature", {})
```

### Pattern 3: Programmatic Workflows

```python
# Load the server once
load_mcp_server_dynamically("user-management")

# Programmatic workflow with loops and conditions
users = call_dynamic_server_tool("user-management", "list_users", {"limit": 100})

for user in users["data"]:
    if user["needs_activation"]:
        # Conditional logic
        call_dynamic_server_tool("user-management", "activate_user", {
            "user_id": user["id"]
        })

        # Send email
        call_dynamic_server_tool("email-server", "send_welcome", {
            "to": user["email"]
        })
```

### Pattern 4: Multi-Server Orchestration

```python
# Load multiple servers
for server in ["database", "stripe", "email", "analytics"]:
    load_mcp_server_dynamically(server)

# Orchestrate across servers
customer = call_dynamic_server_tool("database", "get_customer", {"id": 123})
payment = call_dynamic_server_tool("stripe", "charge_customer", {
    "customer_id": customer["stripe_id"],
    "amount": 2999
})
call_dynamic_server_tool("email", "send_receipt", {
    "to": customer["email"],
    "payment_id": payment["id"]
})
call_dynamic_server_tool("analytics", "track_purchase", {
    "customer_id": customer["id"],
    "amount": 2999
})
```

## How It Works

### MCP Protocol Communication

**1. Server Initialization:**
```json
Client → Server: {"method": "initialize", "params": {"protocolVersion": "2025-03-26", ...}}
Server → Client: {"result": {"capabilities": {...}, "serverInfo": {...}}}
Client → Server: {"method": "notifications/initialized"}
```

**2. Tool Discovery:**
```json
Client → Server: {"method": "tools/list", "id": 2}
Server → Client: {"result": {"tools": [{"name": "...", "description": "...", "inputSchema": {...}}]}}
```

**3. Tool Calling:**
```json
Client → Server: {
  "method": "tools/call",
  "id": 3,
  "params": {
    "name": "tool_name",
    "arguments": {"param": "value"}
  }
}
Server → Client: {"result": {"content": [{"type": "text", "text": "..."}]}}
```

### Process Management

```python
# Spawn server subprocess
process = subprocess.Popen(
    [command] + args,
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE,
    stderr=subprocess.DEVNULL,
    env=environment,
    text=True,
    bufsize=1  # Line buffered
)

# Send JSON-RPC message
message = {"jsonrpc": "2.0", "id": 1, "method": "tools/list"}
process.stdin.write(json.dumps(message) + "\n")
process.stdin.flush()

# Read response
response_line = process.stdout.readline()
response = json.loads(response_line)
```

## Benefits

### 1. Context Savings

**Before:** 50+ tools loaded = 150KB context
**After:** 3 proxy tools = 10KB context
**Savings:** 94% reduction

### 2. Hot-Reload

**Before:** Install → Restart → Wait (1-2 minutes)
**After:** Install → Use (30 seconds)
**Speedup:** 4x faster iteration

### 3. Programmatic Orchestration

**Before:** Tools are static, can't use in loops/conditions
**After:** Call tools programmatically in code

### 4. Dynamic Installation

**Before:** Manual .mcp.json editing + restart
**After:** One command, instant installation

## File Structure

```
mcp_proxy_system/
├── __init__.py
├── README.md                    # This file
├── ARCHITECTURE.md              # Deep dive on system design
├── INSTALLATION_GUIDE.md        # Step-by-step installation
├── HOT_RELOAD_GUIDE.md          # Hot-reload workflows
├── install.sh                   # Automated installer
│
├── utils/
│   ├── __init__.py
│   ├── dynamic_server_loader.py # Subprocess manager
│   ├── mcp_installer.py        # Git installation
│   ├── tool_searcher.py        # Tool catalog
│   └── logging.py              # Logging utilities
│
├── servers/
│   ├── __init__.py
│   └── proxy_server.py         # Main proxy (3 meta-tools)
│
└── templates/
    ├── example_server.py       # Template for custom servers
    ├── example_operations.py   # Template for operations
    └── example_mcp.json        # Template configuration
```

## Customization

### Adding Project-Specific Operations

Edit `servers/proxy_server.py`:

```python
# Import your operations
from myproject.operations import op1, op2, op3

# Register in TOOL_REGISTRY
TOOL_REGISTRY = {
    "operation_1": op1,
    "operation_2": op2,
    "operation_3": op3,
}

# Operations are now callable via:
call_mcp_tool("operation_1", {"param": "value"})
```

### Creating Custom MCP Servers

Use the template in `templates/example_server.py`:

```python
from fastmcp import FastMCP

mcp = FastMCP("my-custom-server")

@mcp.tool()
def my_tool(param1: str, param2: int = 10) -> dict:
    """Tool description"""
    # Implementation
    return {"success": True, "result": ...}

if __name__ == "__main__":
    mcp.run()
```

Add to `.mcp.json`:

```json
{
  "mcpServers": {
    "my-custom-server": {
      "command": "python",
      "args": ["-m", "mcp_proxy_system.servers.my_custom_server"],
      "cwd": "/path/to/project"
    }
  }
}
```

Load dynamically:

```python
load_mcp_server_dynamically("my-custom-server")
call_dynamic_server_tool("my-custom-server", "my_tool", {"param1": "value"})
```

## Testing

### Test Individual Servers

```bash
# Run server standalone
python -m mcp_proxy_system.servers.proxy_server

# Test with stdio
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}' | python -m mcp_proxy_system.servers.proxy_server
```

### Test Dynamic Loading

```python
from mcp_proxy_system.utils.dynamic_server_loader import get_loader

loader = get_loader()

# Load server
result = loader.load_server("proxy")
print(result)

# Call tool
result = loader.call_tool("proxy", "get_available_tools", {})
print(result)
```

## Troubleshooting

### Server Won't Load

1. Check `.mcp.json` configuration
2. Verify `PYTHONPATH` includes project root
3. Check environment variables are set
4. Run server manually to see errors

### Tool Call Fails

1. Verify server is loaded: `get_loaded_servers()`
2. Check tool name is correct
3. Validate parameters match schema
4. Check server logs

### High Memory Usage

Each loaded server ~50MB. Unload unused servers or restart Claude Code to clear all.

## Performance

| Operation | Time | Notes |
|-----------|------|-------|
| Load existing server | ~0.5s | Already in .mcp.json |
| Install + load (small) | ~20s | Small dependencies |
| Install + load (large) | ~60s | Heavy dependencies |
| Call tool | ~0.1s | After loaded |
| Reload server | ~1s | Stop + start |

## Security

Hot-loaded servers run with same permissions as Claude Code:
- Can access your files
- Can make network requests
- Can execute system commands

**Only load servers you trust!**

## See Also

- [ARCHITECTURE.md](ARCHITECTURE.md) - Deep dive on system design
- [INSTALLATION_GUIDE.md](INSTALLATION_GUIDE.md) - Step-by-step installation
- [HOT_RELOAD_GUIDE.md](HOT_RELOAD_GUIDE.md) - Hot-reload workflows
- [FastMCP Documentation](https://github.com/jlowin/fastmcp)
- [MCP Protocol Specification](https://modelcontextprotocol.io/)

## Origin

This system was developed for [Multiverse School](https://themultiverse.school) and abstracted into a reusable pattern for the Abstract Agent Team.

**Original implementation:** `/Users/annhoward/src/themultiverse.school/multiverse_mcp/`

## License

MIT - Free to use, modify, and distribute.
