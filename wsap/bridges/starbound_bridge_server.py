"""
Starbound Bridge Server

Since OpenStarbound's Lua can only make outbound HTTP requests (not receive),
we run a small HTTP server that:
1. Queues commands from the Python adapter
2. Serves them to the Lua mod when it polls
3. Receives results from the Lua mod
4. Returns results to the waiting adapter

Architecture:
    Python Adapter -> Bridge Server <- Lua Mod (polling)
"""

import json
import threading
import time
import uuid
from http.server import HTTPServer, BaseHTTPRequestHandler
from queue import Queue, Empty
from typing import Any


class CommandQueue:
    """Thread-safe command queue with result handling."""

    def __init__(self):
        self.pending_commands: Queue = Queue()
        self.results: dict[str, Any] = {}
        self.result_events: dict[str, threading.Event] = {}
        self.lock = threading.Lock()

    def submit(self, command: dict, timeout: float = 30.0) -> dict:
        """Submit command and wait for result."""
        cmd_id = str(uuid.uuid4())
        command["id"] = cmd_id

        # Create event to wait on
        event = threading.Event()
        with self.lock:
            self.result_events[cmd_id] = event

        # Queue command
        self.pending_commands.put(command)

        # Wait for result
        if event.wait(timeout):
            with self.lock:
                result = self.results.pop(cmd_id, {"error": "Result lost"})
                del self.result_events[cmd_id]
            return result
        else:
            with self.lock:
                if cmd_id in self.result_events:
                    del self.result_events[cmd_id]
            return {"error": "Timeout waiting for game response"}

    def get_next_command(self) -> dict | None:
        """Get next pending command (for Lua to poll)."""
        try:
            return self.pending_commands.get_nowait()
        except Empty:
            return None

    def submit_result(self, cmd_id: str, result: dict):
        """Submit result from Lua mod."""
        with self.lock:
            self.results[cmd_id] = result
            if cmd_id in self.result_events:
                self.result_events[cmd_id].set()


# Global queue instance
command_queue = CommandQueue()


class BridgeHandler(BaseHTTPRequestHandler):
    """HTTP handler for bridge server."""

    def log_message(self, format, *args):
        """Suppress default logging."""
        pass

    def send_json(self, data: dict, status: int = 200):
        """Send JSON response."""
        body = json.dumps(data).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", len(body))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        """Handle GET requests."""
        if self.path == "/poll":
            # Lua mod polling for commands
            cmd = command_queue.get_next_command()
            if cmd:
                self.send_json(cmd)
            else:
                self.send_json({})

        elif self.path == "/status":
            self.send_json({"status": "running", "connected": True})

        else:
            self.send_json({"error": "Not found"}, 404)

    def do_POST(self):
        """Handle POST requests."""
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length).decode()

        try:
            data = json.loads(body) if body else {}
        except json.JSONDecodeError:
            self.send_json({"error": "Invalid JSON"}, 400)
            return

        if self.path == "/result":
            # Lua mod sending result
            cmd_id = data.get("id")
            result = data.get("result", {})
            if cmd_id:
                command_queue.submit_result(cmd_id, result)
                self.send_json({"ok": True})
            else:
                self.send_json({"error": "Missing command id"}, 400)

        elif self.path == "/observe":
            # Python adapter requesting observation
            result = command_queue.submit({
                "type": "observe",
                "player_id": data.get("player_id"),
            })
            self.send_json(result)

        elif self.path == "/act":
            # Python adapter sending action
            result = command_queue.submit({
                "type": "act",
                "action": data.get("action"),
                "parameters": data.get("parameters", {}),
                "player_id": data.get("player_id"),
            })
            self.send_json(result)

        elif self.path == "/reset":
            # Python adapter requesting reset
            result = command_queue.submit({
                "type": "reset",
                "player_id": data.get("player_id"),
            })
            self.send_json(result)

        else:
            self.send_json({"error": "Not found"}, 404)

    def do_OPTIONS(self):
        """Handle CORS preflight."""
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()


class BridgeServer:
    """
    HTTP server that bridges Python adapter and Lua mod.

    Usage:
        server = BridgeServer(port=9999)
        server.start()
        # ... game runs ...
        server.stop()
    """

    def __init__(self, host: str = "localhost", port: int = 9999):
        self.host = host
        self.port = port
        self.server: HTTPServer | None = None
        self.thread: threading.Thread | None = None

    def start(self):
        """Start server in background thread."""
        self.server = HTTPServer((self.host, self.port), BridgeHandler)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        print(f"[WSAP Bridge] Server running on http://{self.host}:{self.port}")

    def stop(self):
        """Stop server."""
        if self.server:
            self.server.shutdown()
            self.server = None
        if self.thread:
            self.thread.join(timeout=1)
            self.thread = None
        print("[WSAP Bridge] Server stopped")

    def __enter__(self):
        self.start()
        return self

    def __exit__(self, *args):
        self.stop()


def run_standalone():
    """Run bridge server standalone for testing."""
    import argparse
    parser = argparse.ArgumentParser(description="WSAP Bridge Server for Starbound")
    parser.add_argument("--host", default="localhost")
    parser.add_argument("--port", type=int, default=9999)
    args = parser.parse_args()

    server = BridgeServer(args.host, args.port)
    server.start()

    print("Press Ctrl+C to stop...")
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        pass
    finally:
        server.stop()


if __name__ == "__main__":
    run_standalone()
