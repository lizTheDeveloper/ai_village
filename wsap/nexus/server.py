"""
NexusServer - HTTP server that coordinates multiple games.
"""

import json
import threading
from datetime import datetime
from http.server import HTTPServer, BaseHTTPRequestHandler
from typing import Any

from .core import (
    GameInfo,
    GameStatus,
    AgentIdentity,
    TransitPackage,
    EntryPackage,
    Achievement,
    SKILL_DOMAINS,
)


class NexusServer:
    """Manages the multiverse of games"""

    def __init__(self, host: str = "localhost", port: int = 9998):
        self.host = host
        self.port = port

        # Registered games
        self.games: dict[str, GameInfo] = {}

        # Agent identities (persistent)
        self.agents: dict[str, AgentIdentity] = {}

        # Active sessions: agent_id -> game_id
        self.active_sessions: dict[str, str] = {}

        # Session data: session_id -> session info
        self.sessions: dict[str, dict] = {}

        self._server: HTTPServer | None = None
        self._thread: threading.Thread | None = None

    def register_game(self, info: GameInfo):
        """Add a game to the nexus"""
        self.games[info.id] = info
        print(f"[Nexus] Registered game: {info.name} ({info.id})")

    def unregister_game(self, game_id: str):
        """Remove a game from the nexus"""
        if game_id in self.games:
            del self.games[game_id]
            print(f"[Nexus] Unregistered game: {game_id}")

    def list_games(self) -> list[GameInfo]:
        """Get all registered games"""
        return list(self.games.values())

    def get_game(self, game_id: str) -> GameInfo | None:
        """Get info about a specific game"""
        return self.games.get(game_id)

    def register_agent(self, agent_id: str, name: str) -> AgentIdentity:
        """Register a new agent or return existing"""
        if agent_id in self.agents:
            return self.agents[agent_id]

        identity = AgentIdentity(agent_id=agent_id, name=name)
        self.agents[agent_id] = identity
        print(f"[Nexus] Registered agent: {name} ({agent_id})")
        return identity

    def get_agent(self, agent_id: str) -> AgentIdentity | None:
        """Get agent identity"""
        return self.agents.get(agent_id)

    def transit_out(self, agent_id: str, game_id: str, reason: str = "voluntary") -> TransitPackage:
        """Handle agent leaving a game"""
        identity = self.agents.get(agent_id)
        if not identity:
            raise ValueError(f"Unknown agent: {agent_id}")

        # Update identity with game visit
        identity.add_game_visit(game_id)

        # Build transit package
        package = TransitPackage(
            agent_id=agent_id,
            agent_name=identity.name,
            total_steps=identity.total_steps,
            games_visited=identity.games_visited.copy(),
            achievements=identity.achievements.copy(),
            skills=identity.skills.copy(),
            carried_items=identity.carried_items.copy(),
            carried_currency=identity.carried_currency.copy(),
            core_memories=identity.core_memories.copy(),
            strategies=identity.strategies.copy(),
            origin_game=game_id,
            exit_reason=reason,
        )

        # Clear active session
        if agent_id in self.active_sessions:
            del self.active_sessions[agent_id]

        # Update game agent count
        if game_id in self.games:
            self.games[game_id].active_agents = max(0, self.games[game_id].active_agents - 1)

        print(f"[Nexus] Agent {identity.name} exited {game_id}: {reason}")
        return package

    def transit_in(self, entry: EntryPackage) -> dict:
        """Handle agent entering a game"""
        game = self.games.get(entry.game_id)
        if not game:
            return {"success": False, "error": f"Unknown game: {entry.game_id}"}

        if game.status != GameStatus.AVAILABLE:
            return {"success": False, "error": f"Game not available: {game.status.value}"}

        identity = self.agents.get(entry.agent_id)
        if not identity:
            return {"success": False, "error": f"Unknown agent: {entry.agent_id}"}

        # Calculate skill bonuses for this game
        bonuses = self._calculate_bonuses(identity.skills, entry.game_id)

        # Create session
        session_id = f"sess_{entry.agent_id}_{entry.game_id}_{datetime.now().strftime('%H%M%S')}"
        self.sessions[session_id] = {
            "agent_id": entry.agent_id,
            "game_id": entry.game_id,
            "started_at": datetime.now().isoformat(),
            "goals": entry.goals,
            "bonuses": bonuses,
        }

        # Track active session
        self.active_sessions[entry.agent_id] = entry.game_id

        # Update game agent count
        game.active_agents += 1

        print(f"[Nexus] Agent {identity.name} entered {entry.game_id}")

        return {
            "success": True,
            "session_id": session_id,
            "bridge_url": game.bridge_url,
            "bonuses": bonuses,
        }

    def _calculate_bonuses(self, skills: dict[str, float], game_id: str) -> dict[str, Any]:
        """Calculate starting bonuses based on agent skills"""
        bonuses = {}

        # Game-specific bonus mappings
        bonus_maps = {
            "crafter": {
                "resource_management": ("inventory_bonus", lambda s: int(s * 3)),
                "survival": ("health_bonus", lambda s: int(s * 2)),
                "crafting": ("recipe_hint", lambda s: s > 0.3),
            },
            "starbound": {
                "exploration": ("scanner_range", lambda s: 1 + int(s * 5)),
                "combat": ("weapon_tier", lambda s: 1 + int(s * 2)),
                "social": ("price_modifier", lambda s: 1.0 - (s * 0.2)),
            },
        }

        if game_id in bonus_maps:
            for skill, (bonus_name, calc) in bonus_maps[game_id].items():
                if skill in skills and skills[skill] > 0.1:
                    bonuses[bonus_name] = calc(skills[skill])

        return bonuses

    def update_agent_stats(self, agent_id: str, steps: int = 0, reward: float = 0,
                           achievements: list[str] | None = None,
                           skill_updates: dict[str, float] | None = None):
        """Update agent stats during gameplay"""
        identity = self.agents.get(agent_id)
        if not identity:
            return

        identity.total_steps += steps

        if skill_updates:
            for skill, delta in skill_updates.items():
                identity.update_skill(skill, delta)

        if achievements:
            game_id = self.active_sessions.get(agent_id, "unknown")
            for name in achievements:
                identity.achievements.append(Achievement(
                    id=f"{game_id}:{name}",
                    name=name,
                    description=name,
                    game_origin=game_id,
                    timestamp=datetime.now().isoformat(),
                ))

    def get_nexus_observation(self, agent_id: str) -> dict:
        """Get what an agent sees when in the Nexus"""
        identity = self.agents.get(agent_id)
        if not identity:
            return {"error": "Unknown agent"}

        return {
            "agent": identity.to_dict(),
            "available_games": [g.to_dict() for g in self.games.values()],
            "suggested_games": self._suggest_games(identity),
            "meta_goals": identity.meta_goals,
        }

    def _suggest_games(self, identity: AgentIdentity) -> list[dict]:
        """Suggest games based on agent skills and history"""
        suggestions = []

        for game in self.games.values():
            if game.status != GameStatus.AVAILABLE:
                continue

            # Score based on skill match
            score = 0.0
            reasons = []

            for skill_domain in game.skill_domains:
                if skill_domain in identity.skills:
                    skill_level = identity.skills[skill_domain]
                    if skill_level > 0.3:
                        score += skill_level
                        reasons.append(f"Your {skill_domain} skill ({skill_level:.0%}) would help")

            # Bonus for unvisited games
            if game.id not in identity.games_visited:
                score += 0.5
                reasons.append("You haven't tried this game yet")

            if score > 0:
                suggestions.append({
                    "game_id": game.id,
                    "game_name": game.name,
                    "score": score,
                    "reasons": reasons,
                })

        # Sort by score
        suggestions.sort(key=lambda x: x["score"], reverse=True)
        return suggestions[:3]

    def start(self):
        """Start the Nexus HTTP server"""
        server = self

        class NexusHandler(BaseHTTPRequestHandler):
            def log_message(self, format, *args):
                pass  # Quiet logging

            def _send_json(self, data: dict, status: int = 200):
                self.send_response(status)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps(data).encode())

            def _read_json(self) -> dict:
                length = int(self.headers.get("Content-Length", 0))
                if length:
                    return json.loads(self.rfile.read(length))
                return {}

            def do_GET(self):
                if self.path == "/games":
                    games = [g.to_dict() for g in server.list_games()]
                    self._send_json({"games": games})

                elif self.path.startswith("/games/"):
                    game_id = self.path.split("/")[-1]
                    game = server.get_game(game_id)
                    if game:
                        self._send_json(game.to_dict())
                    else:
                        self._send_json({"error": "Game not found"}, 404)

                elif self.path.startswith("/agents/"):
                    agent_id = self.path.split("/")[-1]
                    agent = server.get_agent(agent_id)
                    if agent:
                        self._send_json(agent.to_dict())
                    else:
                        self._send_json({"error": "Agent not found"}, 404)

                elif self.path.startswith("/nexus/"):
                    agent_id = self.path.split("/")[-1]
                    obs = server.get_nexus_observation(agent_id)
                    self._send_json(obs)

                else:
                    self._send_json({"error": "Not found"}, 404)

            def do_POST(self):
                data = self._read_json()

                if self.path == "/agents":
                    agent_id = data.get("agent_id", "")
                    name = data.get("name", "Agent")
                    identity = server.register_agent(agent_id, name)
                    self._send_json(identity.to_dict())

                elif self.path == "/games":
                    info = GameInfo(
                        id=data.get("id", ""),
                        name=data.get("name", ""),
                        description=data.get("description", ""),
                        status=GameStatus(data.get("status", "available")),
                        genre=data.get("genre", []),
                        skill_domains=data.get("skill_domains", []),
                        bridge_url=data.get("bridge_url"),
                    )
                    server.register_game(info)
                    self._send_json({"success": True})

                elif self.path == "/transit/enter":
                    entry = EntryPackage(
                        agent_id=data.get("agent_id", ""),
                        game_id=data.get("game_id", ""),
                        spawn_preference=data.get("preferences", {}).get("spawn", "safe"),
                        difficulty=data.get("preferences", {}).get("difficulty", "normal"),
                        goals=data.get("preferences", {}).get("goals", []),
                    )
                    result = server.transit_in(entry)
                    self._send_json(result)

                elif self.path == "/transit/exit":
                    agent_id = data.get("agent_id", "")
                    game_id = data.get("game_id", "")
                    reason = data.get("reason", "voluntary")

                    # Update stats if provided
                    if "stats" in data:
                        server.update_agent_stats(
                            agent_id,
                            steps=data["stats"].get("steps", 0),
                            reward=data["stats"].get("reward", 0),
                            achievements=data["stats"].get("achievements"),
                            skill_updates=data["stats"].get("skills"),
                        )

                    package = server.transit_out(agent_id, game_id, reason)
                    obs = server.get_nexus_observation(agent_id)
                    self._send_json({
                        "success": True,
                        "transit_package": {
                            "skills": package.skills,
                            "achievements": [a.name for a in package.achievements],
                            "total_steps": package.total_steps,
                        },
                        "nexus_observation": obs,
                    })

                else:
                    self._send_json({"error": "Not found"}, 404)

        self._server = HTTPServer((self.host, self.port), NexusHandler)
        self._thread = threading.Thread(target=self._server.serve_forever)
        self._thread.daemon = True
        self._thread.start()
        print(f"[Nexus] Server started on http://{self.host}:{self.port}")

    def stop(self):
        """Stop the server"""
        if self._server:
            self._server.shutdown()
            print("[Nexus] Server stopped")


def main():
    """Run standalone Nexus server"""
    import signal
    import sys

    nexus = NexusServer()

    # Register example games
    nexus.register_game(GameInfo(
        id="crafter",
        name="Crafter",
        description="2D survival game - gather, craft, survive",
        status=GameStatus.AVAILABLE,
        genre=["survival", "sandbox"],
        skill_domains=["resource_management", "survival", "crafting", "combat"],
        bridge_url="http://localhost:9997",
    ))

    nexus.register_game(GameInfo(
        id="starbound",
        name="OpenStarbound",
        description="Space exploration and survival across planets",
        status=GameStatus.AVAILABLE,
        genre=["exploration", "survival", "rpg"],
        skill_domains=["exploration", "combat", "crafting", "social"],
        bridge_url="http://localhost:9999",
    ))

    nexus.start()

    def shutdown(sig, frame):
        print("\nShutting down...")
        nexus.stop()
        sys.exit(0)

    signal.signal(signal.SIGINT, shutdown)

    print("Nexus running. Press Ctrl+C to stop.")
    signal.pause()


if __name__ == "__main__":
    main()
