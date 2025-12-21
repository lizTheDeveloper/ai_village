"""
Dynamic MCP Server Installer

Install MCP servers from git repositories and automatically configure them in .mcp.json.
Supports public and private repositories, dependency installation, and environment configuration.
"""

import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Optional, Dict, List
from urllib.parse import urlparse


class MCPInstaller:
    """Install and configure MCP servers from git repositories."""

    def __init__(self, mcp_dir: Optional[Path] = None, config_file: Optional[Path] = None):
        """
        Initialize the MCP installer.

        Args:
            mcp_dir: Directory to install MCP servers (default: ~/.mcp_servers)
            config_file: Path to .mcp.json config file (default: ./.mcp.json)
        """
        self.mcp_dir = mcp_dir or Path.home() / ".mcp_servers"
        self.mcp_dir.mkdir(parents=True, exist_ok=True)

        self.config_file = config_file or Path.cwd() / ".mcp.json"
        self.venv_python = self._find_venv_python()

    def _find_venv_python(self) -> str:
        """Find the Python executable in the current virtual environment."""
        # Check if we're in a venv
        if hasattr(sys, 'real_prefix') or (hasattr(sys, 'base_prefix') and sys.base_prefix != sys.prefix):
            return sys.executable

        # Try to find venv in common locations
        for venv_path in [Path("env"), Path("venv"), Path(".venv")]:
            if venv_path.exists():
                python_path = venv_path / "bin" / "python"
                if python_path.exists():
                    return str(python_path.resolve())

        # Fall back to system python
        return sys.executable

    def _load_config(self) -> Dict:
        """Load existing .mcp.json configuration."""
        if self.config_file.exists():
            with open(self.config_file, 'r') as f:
                return json.load(f)
        return {"mcpServers": {}}

    def _save_config(self, config: Dict):
        """Save .mcp.json configuration."""
        with open(self.config_file, 'w') as f:
            json.dump(config, f, indent=2)
        print(f"✓ Updated {self.config_file}")

    def _parse_git_url(self, url: str) -> tuple[str, Optional[str]]:
        """
        Parse git URL and extract repository name.

        Args:
            url: Git repository URL

        Returns:
            Tuple of (repo_name, branch/tag)
        """
        # Handle branch/tag syntax: url@branch
        if '@' in url and not url.startswith('git@'):
            url, ref = url.rsplit('@', 1)
        else:
            ref = None

        # Extract repository name
        parsed = urlparse(url)
        path = parsed.path.rstrip('/')
        repo_name = Path(path).stem.replace('.git', '')

        return repo_name, ref

    def install_from_git(
        self,
        git_url: str,
        server_name: Optional[str] = None,
        server_file: Optional[str] = None,
        env_vars: Optional[Dict[str, str]] = None,
        requirements_file: Optional[str] = None,
        auto_detect: bool = True
    ) -> bool:
        """
        Install an MCP server from a git repository.

        Args:
            git_url: Git repository URL (can include @branch)
            server_name: Name for the server in .mcp.json (default: repo name)
            server_file: Python file to run (default: auto-detect)
            env_vars: Environment variables to pass to the server
            requirements_file: Path to requirements file (default: requirements.txt)
            auto_detect: Auto-detect server file if not specified

        Returns:
            True if installation succeeded, False otherwise
        """
        print(f"Installing MCP server from {git_url}...")

        # Parse git URL
        repo_name, ref = self._parse_git_url(git_url)
        server_name = server_name or repo_name

        # Clone repository
        install_path = self.mcp_dir / repo_name
        if install_path.exists():
            print(f"⚠ Directory {install_path} already exists. Updating...")
            result = subprocess.run(
                ["git", "-C", str(install_path), "pull"],
                capture_output=True,
                text=True
            )
            if result.returncode != 0:
                print(f"✗ Failed to update repository: {result.stderr}")
                return False
        else:
            clone_cmd = ["git", "clone", git_url, str(install_path)]
            if ref:
                clone_cmd.extend(["--branch", ref])

            result = subprocess.run(clone_cmd, capture_output=True, text=True)
            if result.returncode != 0:
                print(f"✗ Failed to clone repository: {result.stderr}")
                return False
            print(f"✓ Cloned {repo_name} to {install_path}")

        # Install dependencies
        if not self._install_dependencies(install_path, requirements_file):
            return False

        # Auto-detect server file
        if not server_file and auto_detect:
            server_file = self._detect_server_file(install_path)
            if not server_file:
                print("✗ Could not auto-detect server file. Please specify with --server-file")
                return False
            print(f"✓ Detected server file: {server_file}")

        if not server_file:
            print("✗ No server file specified. Use --server-file or enable --auto-detect")
            return False

        # Add to .mcp.json
        server_path = install_path / server_file
        if not server_path.exists():
            print(f"✗ Server file not found: {server_path}")
            return False

        self._add_to_config(server_name, server_path, env_vars)

        print(f"\n✓ Successfully installed MCP server '{server_name}'")
        print(f"  Location: {install_path}")
        print(f"  Server file: {server_file}")
        print(f"\nRestart Claude Code to load the new server.")

        return True

    def _install_dependencies(self, repo_path: Path, requirements_file: Optional[str]) -> bool:
        """Install Python dependencies for the MCP server."""
        requirements_file = requirements_file or "requirements.txt"
        req_path = repo_path / requirements_file

        if req_path.exists():
            print(f"Installing dependencies from {requirements_file}...")
            result = subprocess.run(
                [self.venv_python, "-m", "pip", "install", "-r", str(req_path)],
                capture_output=True,
                text=True
            )
            if result.returncode != 0:
                print(f"✗ Failed to install dependencies: {result.stderr}")
                return False
            print("✓ Dependencies installed")
        else:
            print(f"ℹ No {requirements_file} found, skipping dependency installation")

        return True

    def _detect_server_file(self, repo_path: Path) -> Optional[str]:
        """
        Auto-detect the MCP server file in the repository.

        Looks for:
        - server.py
        - main.py
        - *_server.py
        - Files with FastMCP imports
        """
        # Common server file names
        candidates = [
            "server.py",
            "main.py",
            "app.py",
        ]

        for candidate in candidates:
            if (repo_path / candidate).exists():
                return candidate

        # Look for *_server.py files
        server_files = list(repo_path.glob("*_server.py"))
        if server_files:
            return server_files[0].name

        # Look for files that import fastmcp
        for py_file in repo_path.glob("*.py"):
            try:
                content = py_file.read_text()
                if "fastmcp" in content.lower() or "from mcp" in content:
                    return py_file.name
            except:
                continue

        return None

    def _add_to_config(self, server_name: str, server_path: Path, env_vars: Optional[Dict[str, str]]):
        """Add the server to .mcp.json configuration."""
        config = self._load_config()

        server_config = {
            "command": self.venv_python,
            "args": [str(server_path.resolve())],
        }

        if env_vars:
            server_config["env"] = env_vars

        config["mcpServers"][server_name] = server_config
        self._save_config(config)

    def list_installed(self) -> List[Dict]:
        """List all installed MCP servers."""
        config = self._load_config()
        servers = []

        for name, server_config in config.get("mcpServers", {}).items():
            args = server_config.get("args", [])
            server_path = Path(args[0]) if args else None

            servers.append({
                "name": name,
                "path": str(server_path) if server_path else "unknown",
                "command": server_config.get("command"),
                "env_vars": list(server_config.get("env", {}).keys())
            })

        return servers

    def uninstall(self, server_name: str, delete_files: bool = False) -> bool:
        """
        Uninstall an MCP server.

        Args:
            server_name: Name of the server to uninstall
            delete_files: If True, delete the server files as well

        Returns:
            True if successful, False otherwise
        """
        config = self._load_config()

        if server_name not in config.get("mcpServers", {}):
            print(f"✗ Server '{server_name}' not found in configuration")
            return False

        # Get server path before removing from config
        server_config = config["mcpServers"][server_name]
        args = server_config.get("args", [])
        server_path = Path(args[0]) if args else None

        # Remove from config
        del config["mcpServers"][server_name]
        self._save_config(config)
        print(f"✓ Removed '{server_name}' from configuration")

        # Optionally delete files
        if delete_files and server_path:
            # Find the repository root (assuming it's in mcp_dir)
            repo_path = None
            for part in server_path.parts:
                if part == ".mcp_servers":
                    idx = server_path.parts.index(part)
                    if idx + 1 < len(server_path.parts):
                        repo_path = self.mcp_dir / server_path.parts[idx + 1]
                        break

            if repo_path and repo_path.exists():
                import shutil
                shutil.rmtree(repo_path)
                print(f"✓ Deleted files at {repo_path}")

        return True


def main():
    """CLI interface for MCP installer."""
    import argparse

    parser = argparse.ArgumentParser(description="Install MCP servers from git repositories")
    subparsers = parser.add_subparsers(dest="command", help="Command to run")

    # Install command
    install_parser = subparsers.add_parser("install", help="Install an MCP server from git")
    install_parser.add_argument("git_url", help="Git repository URL (can include @branch)")
    install_parser.add_argument("--name", help="Server name (default: repo name)")
    install_parser.add_argument("--server-file", help="Python server file to run")
    install_parser.add_argument("--requirements", help="Requirements file (default: requirements.txt)")
    install_parser.add_argument("--env", action="append", help="Environment variable (KEY=VALUE)")
    install_parser.add_argument("--no-auto-detect", action="store_true", help="Disable auto-detection of server file")

    # List command
    list_parser = subparsers.add_parser("list", help="List installed MCP servers")

    # Uninstall command
    uninstall_parser = subparsers.add_parser("uninstall", help="Uninstall an MCP server")
    uninstall_parser.add_argument("name", help="Server name to uninstall")
    uninstall_parser.add_argument("--delete-files", action="store_true", help="Delete server files")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        return

    installer = MCPInstaller()

    if args.command == "install":
        # Parse environment variables
        env_vars = {}
        if args.env:
            for env_str in args.env:
                key, value = env_str.split("=", 1)
                env_vars[key] = value

        success = installer.install_from_git(
            git_url=args.git_url,
            server_name=args.name,
            server_file=args.server_file,
            env_vars=env_vars if env_vars else None,
            requirements_file=args.requirements,
            auto_detect=not args.no_auto_detect
        )
        sys.exit(0 if success else 1)

    elif args.command == "list":
        servers = installer.list_installed()
        if not servers:
            print("No MCP servers installed")
        else:
            print(f"\nInstalled MCP servers ({len(servers)}):\n")
            for server in servers:
                print(f"  {server['name']}")
                print(f"    Path: {server['path']}")
                if server['env_vars']:
                    print(f"    Env vars: {', '.join(server['env_vars'])}")
                print()

    elif args.command == "uninstall":
        installer.uninstall(args.name, delete_files=args.delete_files)


if __name__ == "__main__":
    main()
