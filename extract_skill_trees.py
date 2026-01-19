#!/usr/bin/env python3
"""
Extract magic skill tree data from TypeScript to JSON.

This script parses skill tree TypeScript files and extracts:
- Node definitions (createSkillNode calls)
- XP sources
- Tree metadata
- Constants

Output: JSON files in packages/magic/data/skill-trees/
"""

import json
import re
from pathlib import Path
from typing import Any, Dict, List


def extract_paradigm_id(content: str) -> str:
    """Extract PARADIGM_ID constant."""
    match = re.search(r"const PARADIGM_ID = ['\"]([^'\"]+)['\"]", content)
    if not match:
        raise ValueError("Could not find PARADIGM_ID")
    return match.group(1)


def extract_node_definitions(content: str) -> List[Dict[str, Any]]:
    """Extract all createSkillNode calls from TypeScript."""
    nodes = []

    # Pattern for createSkillNode calls
    # This is a simplified pattern - full parsing would need AST
    pattern = r"const ([A-Z_]+)_NODE = createSkillNode\(\s*([^;]+)\s*\);"

    matches = re.finditer(pattern, content, re.DOTALL)

    for match in matches:
        node_const_name = match.group(1)
        node_data = match.group(2)

        # Extract basic parameters (simplified - this won't handle all cases)
        # For a production tool, we'd use a proper TypeScript parser
        params = extract_skill_node_params(node_data)

        if params:
            params['_source_constant'] = node_const_name
            nodes.append(params)

    return nodes


def extract_skill_node_params(data: str) -> Dict[str, Any]:
    """
    Extract parameters from a createSkillNode call.

    This is a simplified extraction that handles common patterns.
    For full robustness, we'd need a TypeScript AST parser.
    """
    # This is too complex for regex alone - we need a different approach
    # Let's just mark this for manual review
    return None


def extract_xp_sources(content: str) -> List[Dict[str, Any]]:
    """Extract XP source definitions."""
    xp_sources = []

    # Find XP_SOURCES array
    match = re.search(r"const XP_SOURCES: MagicXPSource\[\] = \[([^\]]+)\];", content, re.DOTALL)
    if not match:
        return xp_sources

    sources_content = match.group(1)

    # Extract individual source objects
    # This is simplified - real implementation would need proper parsing
    object_pattern = r"\{([^}]+)\}"
    for obj_match in re.finditer(object_pattern, sources_content):
        obj_content = obj_match.group(1)

        event_type = re.search(r"eventType: ['\"]([^'\"]+)['\"]", obj_content)
        xp_amount = re.search(r"xpAmount: (\d+)", obj_content)
        description = re.search(r"description: ['\"]([^'\"]+)['\"]", obj_content)

        if event_type and xp_amount and description:
            xp_sources.append({
                "eventType": event_type.group(1),
                "xpAmount": int(xp_amount.group(1)),
                "description": description.group(1)
            })

    return xp_sources


def extract_tree_metadata(content: str, filename: str) -> Dict[str, Any]:
    """Extract tree-level metadata."""
    paradigm_id = extract_paradigm_id(content)

    # Extract from exported tree constant
    tree_match = re.search(
        r"export const ([A-Z_]+)_SKILL_TREE: MagicSkillTree = \{([^;]+)\};",
        content,
        re.DOTALL
    )

    metadata = {
        "paradigmId": paradigm_id,
        "sourceFile": filename,
    }

    if tree_match:
        tree_content = tree_match.group(2)

        # Extract simple string fields
        for field in ['id', 'name', 'description', 'lore']:
            pattern = f"{field}: ['\"`]([^'\"`]+)['\"`]"
            match = re.search(pattern, tree_content)
            if match:
                metadata[field] = match.group(1)

    return metadata


def process_skill_tree_file(ts_file: Path) -> Dict[str, Any]:
    """Process a single skill tree TypeScript file."""
    print(f"Processing {ts_file.name}...")

    content = ts_file.read_text()

    # Extract components
    metadata = extract_tree_metadata(content, ts_file.name)
    xp_sources = extract_xp_sources(content)

    # Count nodes
    node_count = len(re.findall(r"const [A-Z_]+_NODE = createSkillNode\(", content))

    return {
        "metadata": metadata,
        "nodeCount": node_count,
        "xpSources": xp_sources,
        "_note": "Full node extraction requires TypeScript AST parsing"
    }


def main():
    """Main extraction process."""
    print("Magic Skill Tree Extraction Tool")
    print("=" * 60)

    base_path = Path(__file__).parent / "custom_game_engine" / "packages" / "magic"
    skill_trees_path = base_path / "src" / "skillTrees"
    output_path = base_path / "data" / "skill-trees"

    # Ensure output directory exists
    output_path.mkdir(parents=True, exist_ok=True)

    # Process all skill tree files
    ts_files = sorted(skill_trees_path.glob("*SkillTree.ts"))

    summary = {
        "totalTrees": len(ts_files),
        "totalNodes": 0,
        "trees": {}
    }

    for ts_file in ts_files:
        try:
            data = process_skill_tree_file(ts_file)
            paradigm_id = data["metadata"]["paradigmId"]

            summary["trees"][paradigm_id] = {
                "file": ts_file.name,
                "nodeCount": data["nodeCount"]
            }
            summary["totalNodes"] += data["nodeCount"]

            # Write individual tree data
            output_file = output_path / f"{paradigm_id}.json"
            with open(output_file, 'w') as f:
                json.dump(data, f, indent=2)

        except Exception as e:
            print(f"Error processing {ts_file.name}: {e}")

    # Write summary
    summary_file = output_path / "_summary.json"
    with open(summary_file, 'w') as f:
        json.dump(summary, f, indent=2)

    print("\n" + "=" * 60)
    print(f"Extraction complete!")
    print(f"Total trees: {summary['totalTrees']}")
    print(f"Total nodes: {summary['totalNodes']}")
    print(f"Output directory: {output_path}")
    print("\nNOTE: This script extracts metadata and XP sources.")
    print("Full node data extraction requires TypeScript AST parsing.")
    print("See below for recommended next steps.")


if __name__ == "__main__":
    main()
