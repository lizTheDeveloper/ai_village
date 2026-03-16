"""
MVEE Distilled Micro-NN architectures.

Three networks mirroring the 3-layer MVEE decision architecture:
  - TalkerNN  (~40K params): social decisions (talk, goals, meeting)
  - ExecutorNN (~200K params): task planning (gather, build, farm)

All use the same 40-dim feature vector from feature_extractor.py.

Ref: Policy Distillation (Rusu et al., arXiv:1511.06295)
     LLM4Teach (arXiv:2311.13373)
"""

import torch
import torch.nn as nn
from feature_extractor import FEATURE_DIM, TALKER_ACTIONS, EXECUTOR_ACTIONS


class TalkerNN(nn.Module):
    """
    Social decision classifier.
    Architecture: 40 → 128 → 256 → 128 → 6 classes
    ~40K params. Target: <0.5ms inference at 50 agents.

    Outputs raw logits (use with CrossEntropyLoss during training,
    softmax for confidence at inference).
    """

    INPUT_DIM = FEATURE_DIM
    OUTPUT_DIM = len(TALKER_ACTIONS)
    ACTIONS = TALKER_ACTIONS

    def __init__(self):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(self.INPUT_DIM, 128),
            nn.LayerNorm(128),
            nn.GELU(),
            nn.Linear(128, 256),
            nn.LayerNorm(256),
            nn.GELU(),
            nn.Dropout(0.1),
            nn.Linear(256, 128),
            nn.LayerNorm(128),
            nn.GELU(),
            nn.Linear(128, self.OUTPUT_DIM),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.net(x)

    def predict(self, x: torch.Tensor) -> tuple[torch.Tensor, torch.Tensor]:
        """Returns (action_indices, confidences) via softmax."""
        with torch.no_grad():
            logits = self.forward(x)
            probs = torch.softmax(logits, dim=-1)
            confidence, action_idx = probs.max(dim=-1)
        return action_idx, confidence


class ExecutorNN(nn.Module):
    """
    Task planning classifier.
    Architecture: 40 → 256 → 512 → 256 → 13 classes
    ~200K params. Target: <1ms inference at 50 agents.

    Outputs raw logits.
    """

    INPUT_DIM = FEATURE_DIM
    OUTPUT_DIM = len(EXECUTOR_ACTIONS)
    ACTIONS = EXECUTOR_ACTIONS

    def __init__(self):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(self.INPUT_DIM, 256),
            nn.LayerNorm(256),
            nn.GELU(),
            nn.Linear(256, 512),
            nn.LayerNorm(512),
            nn.GELU(),
            nn.Dropout(0.1),
            nn.Linear(512, 256),
            nn.LayerNorm(256),
            nn.GELU(),
            nn.Linear(256, self.OUTPUT_DIM),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.net(x)

    def predict(self, x: torch.Tensor) -> tuple[torch.Tensor, torch.Tensor]:
        """Returns (action_indices, confidences) via softmax."""
        with torch.no_grad():
            logits = self.forward(x)
            probs = torch.softmax(logits, dim=-1)
            confidence, action_idx = probs.max(dim=-1)
        return action_idx, confidence


def count_params(model: nn.Module) -> int:
    return sum(p.numel() for p in model.parameters() if p.requires_grad)


if __name__ == '__main__':
    talker = TalkerNN()
    executor = ExecutorNN()
    print(f'TalkerNN:   {count_params(talker):,} params')
    print(f'ExecutorNN: {count_params(executor):,} params')
    print(f'Input dim:  {FEATURE_DIM}')
    print(f'Talker actions ({len(TALKER_ACTIONS)}): {TALKER_ACTIONS}')
    print(f'Executor actions ({len(EXECUTOR_ACTIONS)}): {EXECUTOR_ACTIONS}')

    # Smoke test
    x = torch.randn(4, FEATURE_DIM)
    t_out = talker(x)
    e_out = executor(x)
    assert t_out.shape == (4, len(TALKER_ACTIONS)), f'TalkerNN output shape mismatch: {t_out.shape}'
    assert e_out.shape == (4, len(EXECUTOR_ACTIONS)), f'ExecutorNN output shape mismatch: {e_out.shape}'
    print('Smoke test: OK')
