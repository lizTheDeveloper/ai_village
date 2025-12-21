#!/usr/bin/env python3
"""
Run a WSAP agent on a game.

Usage:
    python run_agent.py --game crafter --model qwen3:8b --steps 100
    python run_agent.py --game starbound --mock  # Test without game running
"""

import argparse

from wsap import OllamaAgent, MemoryAgent
from wsap.agent import run_episode
from wsap.adapters import CrafterAdapter, StarboundAdapter, MockStarboundAdapter


def main():
    parser = argparse.ArgumentParser(description="Run WSAP agent on a game")
    parser.add_argument("--game", default="crafter", choices=["crafter", "starbound"],
                        help="Game to play")
    parser.add_argument("--model", default="qwen3:8b",
                        help="Ollama model to use")
    parser.add_argument("--steps", type=int, default=100,
                        help="Max steps per episode")
    parser.add_argument("--memory", action="store_true",
                        help="Use memory-enhanced agent")
    parser.add_argument("--quiet", action="store_true",
                        help="Reduce output")
    parser.add_argument("--mock", action="store_true",
                        help="Use mock adapter (no real game needed)")
    args = parser.parse_args()

    # Create adapter
    if args.game == "crafter":
        adapter = CrafterAdapter()
    elif args.game == "starbound":
        if args.mock:
            adapter = MockStarboundAdapter()
        else:
            adapter = StarboundAdapter()
    else:
        raise ValueError(f"Unknown game: {args.game}")

    # Create agent
    if args.memory:
        agent = MemoryAgent(model=args.model)
    else:
        agent = OllamaAgent(model=args.model)

    print(f"Running {args.game} with {args.model}")
    print("=" * 50)

    # Run episode
    stats = run_episode(
        adapter=adapter,
        agent=agent,
        max_steps=args.steps,
        verbose=not args.quiet,
    )

    print("\n" + "=" * 50)
    print("FINAL STATS")
    print("=" * 50)
    print(f"Steps: {stats['steps']}")
    print(f"Total Reward: {stats['total_reward']:.2f}")
    print(f"Achievements: {stats['achievements']}")

    adapter.close()


if __name__ == "__main__":
    main()
