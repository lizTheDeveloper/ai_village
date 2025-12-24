#!/bin/bash
# This script will be used to document the pattern, but I'll do the actual fixes manually

echo "Pattern to fix:"
echo "OLD: agent.addComponent(AgentComponent, { name: 'X', personality: {...} })"
echo "NEW: agent.addComponent(createAgentComponent());"
echo "     agent.addComponent(createPersonalityComponent({...}));"
