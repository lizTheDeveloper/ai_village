"""
NexusClient - Client for agents to connect to the Nexus.
"""

import json
import requests
from typing import Any

from .core import (
    GameInfo,
    GameStatus,
    AgentIdentity,
    TransitPackage,
    EntryPackage,
)


class NexusClient:
    """Client for connecting agents to the Nexus"""

    def __init__(self, nexus_url: str = "http://localhost:9998"):
        self.nexus_url = nexus_url.rstrip("/")

    def _get(self, endpoint: str) -> dict:
        """Make GET request to Nexus"""
        resp = requests.get(f"{self.nexus_url}{endpoint}", timeout=10)
        resp.raise_for_status()
        return resp.json()

    def _post(self, endpoint: str, data: dict) -> dict:
        """Make POST request to Nexus"""
        resp = requests.post(
            f"{self.nexus_url}{endpoint}",
            json=data,
            timeout=10
        )
        resp.raise_for_status()
        return resp.json()

    def list_games(self) -> list[GameInfo]:
        """Get all available games"""
        result = self._get("/games")
        games = []
        for g in result.get("games", []):
            games.append(GameInfo(
                id=g["id"],
                name=g["name"],
                description=g["description"],
                status=GameStatus(g["status"]),
                genre=g.get("genre", []),
                skill_domains=g.get("skill_domains", []),
                active_agents=g.get("active_agents", 0),
                bridge_url=g.get("bridge_url"),
            ))
        return games

    def get_game(self, game_id: str) -> GameInfo | None:
        """Get info about a specific game"""
        try:
            g = self._get(f"/games/{game_id}")
            return GameInfo(
                id=g["id"],
                name=g["name"],
                description=g["description"],
                status=GameStatus(g["status"]),
                genre=g.get("genre", []),
                skill_domains=g.get("skill_domains", []),
                bridge_url=g.get("bridge_url"),
            )
        except requests.HTTPError:
            return None

    def register_agent(self, agent_id: str, name: str) -> AgentIdentity:
        """Register a new agent or get existing"""
        result = self._post("/agents", {"agent_id": agent_id, "name": name})
        return AgentIdentity(
            agent_id=result["agent_id"],
            name=result.get("name", name),
            total_steps=result.get("total_steps", 0),
            games_visited=result.get("games_visited", []),
            skills=result.get("skills", {}),
        )

    def get_agent(self, agent_id: str) -> AgentIdentity | None:
        """Get agent identity"""
        try:
            result = self._get(f"/agents/{agent_id}")
            return AgentIdentity(
                agent_id=result["agent_id"],
                name=result.get("name", ""),
                total_steps=result.get("total_steps", 0),
                games_visited=result.get("games_visited", []),
                skills=result.get("skills", {}),
            )
        except requests.HTTPError:
            return None

    def get_nexus_observation(self, agent_id: str) -> dict:
        """Get what agent sees in the Nexus"""
        return self._get(f"/nexus/{agent_id}")

    def enter_game(self, agent_id: str, game_id: str,
                   spawn: str = "safe", difficulty: str = "normal",
                   goals: list[str] | None = None) -> dict:
        """Enter a game"""
        return self._post("/transit/enter", {
            "agent_id": agent_id,
            "game_id": game_id,
            "preferences": {
                "spawn": spawn,
                "difficulty": difficulty,
                "goals": goals or [],
            }
        })

    def exit_game(self, agent_id: str, game_id: str, reason: str = "voluntary",
                  stats: dict | None = None) -> dict:
        """Exit a game and return to Nexus"""
        data = {
            "agent_id": agent_id,
            "game_id": game_id,
            "reason": reason,
        }
        if stats:
            data["stats"] = stats
        return self._post("/transit/exit", data)

    def observe(self, agent_id: str) -> str:
        """Get text observation for LLM"""
        obs = self.get_nexus_observation(agent_id)

        if "error" in obs:
            return f"Error: {obs['error']}"

        agent = obs.get("agent", {})
        games = obs.get("available_games", [])
        suggestions = obs.get("suggested_games", [])

        # Format for LLM
        text = f"""
=== NEXUS ===
Welcome back, {agent.get('name', 'Agent')}.

YOUR STATS:
- Total experience: {agent.get('total_steps', 0)} steps across {len(agent.get('games_visited', []))} games
- Top skills: {self._format_skills(agent.get('skills', {}))}
- Achievements: {len(agent.get('achievements', []))}

AVAILABLE GAMES:
"""
        for g in games:
            status = "[READY]" if g["status"] == "available" else f"[{g['status'].upper()}]"
            text += f"- {g['name']} ({g['id']}) {status}\n"
            text += f"  {g['description']}\n"

        if suggestions:
            text += "\nSUGGESTED FOR YOU:\n"
            for s in suggestions:
                text += f"- {s['game_name']}: {', '.join(s['reasons'])}\n"

        text += """
COMMANDS:
- list_games: See all games
- game_details <id>: Get details about a game
- enter_game <id>: Enter a game world
- review_self: Check your stats and history

What would you like to do?
"""
        return text

    def _format_skills(self, skills: dict[str, float]) -> str:
        """Format skills for display"""
        sorted_skills = sorted(skills.items(), key=lambda x: x[1], reverse=True)
        top_3 = sorted_skills[:3]
        return ", ".join(f"{s[0]}: {s[1]:.0%}" for s in top_3 if s[1] > 0)
