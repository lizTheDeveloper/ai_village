"""
Game adapter protocol - games implement this to become LLM-controllable.
"""

from abc import ABC, abstractmethod
from .core import Observation, ActionSpace, Action, ActionResult


class GameAdapter(ABC):
    """
    Abstract base class for game adapters.

    Games implement this interface to become controllable by WSAP agents.
    The adapter translates between the game's internal state and the
    protocol's text-friendly format.
    """

    @property
    @abstractmethod
    def name(self) -> str:
        """Name of the game"""
        ...

    @property
    @abstractmethod
    def game_description(self) -> str:
        """
        Static description of the game, its goals, and core mechanics.
        This is sent once at session start to give the agent context.

        Should include:
        - What kind of game this is
        - Main objectives/win conditions
        - Key mechanics (survival, crafting, combat, etc.)
        - Basic progression path
        - Major threats/dangers
        """
        ...

    @property
    @abstractmethod
    def action_space(self) -> ActionSpace:
        """
        All actions available to the agent.
        Can be static or dynamic based on current game state.
        """
        ...

    @abstractmethod
    def observe(self) -> Observation:
        """
        Get current game state as an Observation.

        This is called before each agent decision. Should include
        all information the agent needs to make a good choice.
        """
        ...

    @abstractmethod
    def act(self, action: Action) -> ActionResult:
        """
        Execute an action in the game.

        Returns ActionResult with:
        - success: whether action completed
        - message: what happened (for agent feedback)
        - reward: numerical signal (optional)
        - observation: new state after action
        """
        ...

    @abstractmethod
    def reset(self) -> Observation:
        """Reset game to initial state, return starting observation."""
        ...

    def close(self) -> None:
        """Clean up resources (optional)."""
        pass

    # Convenience methods

    def step(self, action: Action) -> tuple[Observation, float, bool, dict]:
        """
        Gym-style step interface for compatibility.
        Returns (observation, reward, done, info)
        """
        result = self.act(action)
        info = {
            "success": result.success,
            "message": result.message,
            "achievements": result.achievements,
        }
        return result.observation, result.reward, result.done, info

    def get_system_prompt(self) -> str:
        """Generate system prompt for LLM from game description."""
        return f"""You are an AI agent playing {self.name}.

{self.game_description}

AVAILABLE ACTIONS:
{self.action_space.to_text()}

RESPONSE FORMAT:
Respond with a JSON object containing your chosen action:
{{"action": "action_name", "params": {{}}, "reasoning": "brief explanation"}}

Focus on survival and progress. Make decisions based on current state."""
