#!/usr/bin/env python3
import re

# Read the file
with open('packages/core/src/systems/__tests__/VerificationSystem.test.ts', 'r') as f:
    content = f.read()

# Pattern to find and replace
old_pattern = r"verifier\.addComponent\('SocialGradient', \{\s*gradients: \[\{\s*resourceType: '(\w+)',\s*bearing: (\d+),\s*distance: (\d+),\s*sourceAgentId: '(\w+)',\s*claimPosition: \{ x: ([\d.]+), y: ([\d.]+) \},\s*tick: (\d+),\s*\}\],\s*\}\);"

def replacement(match):
    resource_type, bearing, distance, source_id, x, y, tick = match.groups()
    return f"""verifier.addComponent('SocialGradient', {{}});

      addGradientWithClaim(verifier, {{
        resourceType: '{resource_type}',
        bearing: {bearing},
        distance: {distance},
        sourceAgentId: '{source_id}',
        claimPosition: {{ x: {x}, y: {y} }},
        tick: {tick},
      }});"""

# Apply replacement
content = re.sub(old_pattern, replacement, content)

# Also fix world.eventBus.on to use eventBus variable
content = re.sub(r"world\.eventBus\.on\('(\w+:\w+)', \(e: any\) => events\.push\(e\)\);",
                 r"const eventBus = (world as any)._eventBus;\n      eventBus.on('\1', (e: any) => events.push(e));",
                 content)

# Write back
with open('packages/core/src/systems/__tests__/VerificationSystem.test.ts', 'w') as f:
    f.write(content)

print("Fixed VerificationSystem.test.ts")
