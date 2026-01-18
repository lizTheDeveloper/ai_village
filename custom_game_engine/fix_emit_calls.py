#!/usr/bin/env python3
import re
import sys

def fix_emit_calls(content):
    """
    Fix emit calls from:
      this.events.emit({
        type: 'event:type',
        source: this.id,
        data: { ... }
      });

    To:
      this.events.emit('event:type', { ... });
    """

    # Pattern to match the malformed emit calls
    pattern = r"this\.events\.emit\(\{\s*\n\s*type:\s*'([^']+)',\s*\n\s*source:\s*this\.id,\s*\n\s*data:\s*\{"

    def replacement(match):
        event_type = match.group(1)
        return f"this.events.emit('{event_type}', {{"

    content = re.sub(pattern, replacement, content)

    # Fix the closing braces - find patterns like:
    #   }
    # });
    # That should become:
    # });
    # (Remove one level of closing brace)

    # This is tricky - we need to find emit calls and fix their closing
    # Let's use a different approach: find and replace the entire emit call structure

    # More precise pattern that captures the entire emit call
    full_pattern = r"this\.events\.emit\(\{\s*\n\s*type:\s*'([^']+)',\s*\n\s*source:\s*this\.id,\s*\n\s*data:\s*(\{[^}]*(?:\{[^}]*\}[^}]*)*\})\s*\n\s*\}\);"

    def full_replacement(match):
        event_type = match.group(1)
        data = match.group(2)
        return f"this.events.emit('{event_type}', {data});"

    content = re.sub(full_pattern, full_replacement, content, flags=re.DOTALL)

    return content

if __name__ == '__main__':
    file_path = sys.argv[1] if len(sys.argv) > 1 else 'packages/botany/src/systems/PlantDiseaseSystem.ts'

    with open(file_path, 'r') as f:
        content = f.read()

    fixed_content = fix_emit_calls(content)

    with open(file_path, 'w') as f:
        f.write(fixed_content)

    print(f"Fixed emit calls in {file_path}")
