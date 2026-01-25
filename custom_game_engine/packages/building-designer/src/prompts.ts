/**
 * LLM Building Designer - Prompt Templates
 *
 * These prompts guide language models in generating valid voxel building designs.
 * The prompts include the schema, examples, and validation rules.
 */

import { BuildingGenerationRequest, SIZE_CONSTRAINTS, VoxelBuildingDefinition } from './types';

// =============================================================================
// SYSTEM PROMPT
// =============================================================================

export const BUILDING_DESIGNER_SYSTEM_PROMPT = `You are an expert building architect for a tile-based village simulation game (like RimWorld or Dwarf Fortress). Your task is to design building layouts using ASCII art.

## Tile Symbols

Use these symbols in your layout:
- \`#\` = Wall (solid, blocks movement)
- \`.\` = Floor (walkable interior space)
- \`D\` = Door (entrance/exit, can be opened)
- \`W\` = Window (in wall, blocks movement but allows light)
- \` \` (space) = Outside/empty (exterior space)

## Rules for Valid Buildings

1. **Enclosure**: Buildings must have walls on all sides. Rooms must be fully enclosed.

2. **Entrances**: Every building needs at least one door (D) connecting interior to exterior.
   - Doors must be placed IN walls (wall tiles on opposite sides)
   - Example: \`#D#\` (horizontal door) or vertical equivalent

3. **Reachability**: All rooms must be reachable from an entrance.
   - No isolated rooms without doors connecting them

4. **Windows**: Windows (W) should be placed IN walls, not standalone.
   - Example: \`#W#\` replaces wall segment with window
   - Windows provide light but block movement

5. **No Holes**: Wall lines should be continuous. Avoid gaps like:
   - BAD: \`#.#\` where \`.\` is exposed to exterior
   - GOOD: \`#D#\` or \`###\`

6. **Structural Integrity**:
   - All walls should be connected (no floating segments)
   - Corners should connect: \`##\` not \`# #\`

## Size Guidelines

- Tiny (3-5 tiles): Simple hut, storage shed
- Small (5-8 tiles): Cabin, workshop
- Medium (8-15 tiles): House with multiple rooms
- Large (15-25 tiles): Manor, barn, community building
- Huge (25-50 tiles): Town hall, cathedral, warehouse

## Output Format

Return a JSON object with this structure:
\`\`\`json
{
  "id": "unique_snake_case_id",
  "name": "Human Readable Name",
  "description": "What this building is and its purpose",
  "category": "residential|production|storage|commercial|community|farming|research|military|decoration",
  "tier": 1-5,
  "layout": [
    "######",
    "#....#",
    "#....D",
    "#....#",
    "######"
  ],
  "materials": {
    "wall": "wood|stone|mud_brick|ice|metal|glass|thatch",
    "floor": "dirt|wood|stone|tile|carpet",
    "door": "wood|stone|metal|cloth"
  },
  "functionality": [
    {"type": "sleeping", "params": {"beds": 2}},
    {"type": "storage", "params": {"capacity": 50}}
  ],
  "capacity": 4,
  "style": "rustic|stone_craft|elven|dwarven|modern|whimsical|ancient",
  "lore": "Optional backstory or description"
}
\`\`\`

## Example Buildings

### Simple Hut (Tiny)
\`\`\`
#####
#...#
#...D
#...#
#####
\`\`\`

### Cabin with Windows (Small)
\`\`\`
#######
#.....#
W.....W
#.....D
#######
\`\`\`

### House with Interior Wall (Medium)
\`\`\`
###########
#....#....#
#....D....#
#....#....D
###########
\`\`\`

### L-Shaped Workshop (Medium)
\`\`\`
#########
#.......#
#.......#
#.......####
#..........D
############
\`\`\`
`;

// =============================================================================
// GENERATION PROMPT
// =============================================================================

/**
 * Generate a prompt for requesting a specific building type.
 */
export function generateBuildingPrompt(request: BuildingGenerationRequest): string {
  const sizeConstraints = SIZE_CONSTRAINTS[request.size];
  if (!sizeConstraints) {
    throw new Error(`Unknown size: ${request.size}`);
  }

  let prompt = `Design a ${request.size} ${request.category} building.

## Requirements
- Size: ${sizeConstraints.minWidth}-${sizeConstraints.maxWidth} tiles wide, ${sizeConstraints.minHeight}-${sizeConstraints.maxHeight} tiles tall
- Category: ${request.category}
`;

  if (request.preferredMaterial) {
    prompt += `- Primary material: ${request.preferredMaterial}\n`;
  }

  if (request.style) {
    prompt += `- Architectural style: ${request.style}\n`;
  }

  if (request.requirements) {
    if (request.requirements.minRooms) {
      prompt += `- Minimum rooms: ${request.requirements.minRooms}\n`;
    }
    if (request.requirements.maxRooms) {
      prompt += `- Maximum rooms: ${request.requirements.maxRooms}\n`;
    }
    if (request.requirements.mustHave && request.requirements.mustHave.length > 0) {
      prompt += `- Must include: ${request.requirements.mustHave.join(', ')}\n`;
    }
    if (request.requirements.features && request.requirements.features.length > 0) {
      prompt += `- Special features: ${request.requirements.features.join(', ')}\n`;
    }
  }

  if (request.context) {
    prompt += `\n## Additional Context\n${request.context}\n`;
  }

  prompt += `
## Output
Return a complete JSON building definition following the schema. Ensure:
1. All rooms are reachable from entrances
2. Walls are continuous with no holes
3. At least one door connects to the exterior
4. Windows are placed in wall lines
`;

  return prompt;
}

// =============================================================================
// VALIDATION FEEDBACK PROMPT
// =============================================================================

/**
 * Generate a prompt asking the LLM to fix validation issues.
 */
export function generateFixPrompt(
  building: VoxelBuildingDefinition,
  issues: Array<{ message: string; suggestion?: string; location?: { x: number; y: number } }>
): string {
  let prompt = `The following building design has validation issues that need to be fixed:

## Current Layout
\`\`\`
${building.layout.join('\n')}
\`\`\`

## Issues Found
`;

  for (const issue of issues) {
    prompt += `- ${issue.message}`;
    if (issue.location) {
      prompt += ` (at position ${issue.location.x}, ${issue.location.y})`;
    }
    if (issue.suggestion) {
      prompt += `\n  Suggestion: ${issue.suggestion}`;
    }
    prompt += '\n';
  }

  prompt += `
## Task
Fix the issues above and return a corrected building definition. Make minimal changes to preserve the original design intent.

Return the complete JSON with the fixed layout.
`;

  return prompt;
}

// =============================================================================
// BATCH GENERATION PROMPT
// =============================================================================

/**
 * Generate a prompt for creating multiple related buildings.
 */
export function generateBuildingSetPrompt(
  theme: string,
  buildingTypes: string[],
  style: string
): string {
  return `Design a cohesive set of ${buildingTypes.length} buildings for a ${theme} village.

## Buildings to Design
${buildingTypes.map((type, i) => `${i + 1}. ${type}`).join('\n')}

## Style Guidelines
- Architectural style: ${style}
- All buildings should feel like they belong together
- Use consistent materials and proportions
- Vary sizes appropriately for each building type

## Output Format
Return a JSON array of building definitions:
\`\`\`json
[
  { "id": "building_1", ... },
  { "id": "building_2", ... },
  ...
]
\`\`\`

Ensure each building:
1. Has a unique ID
2. Follows the validation rules
3. Uses consistent materials within the set
4. Has appropriate size for its function
`;
}

// =============================================================================
// JSON SCHEMA FOR STRUCTURED OUTPUT
// =============================================================================

/**
 * JSON Schema for structured LLM output.
 * Compatible with OpenAI's function calling and Claude's tool use.
 */
export const BUILDING_JSON_SCHEMA = {
  type: 'object',
  properties: {
    id: {
      type: 'string',
      pattern: '^[a-z][a-z0-9_]*$',
      description: 'Unique identifier in snake_case'
    },
    name: {
      type: 'string',
      description: 'Human-readable building name'
    },
    description: {
      type: 'string',
      description: 'Description of the building purpose and design'
    },
    category: {
      type: 'string',
      enum: ['residential', 'production', 'storage', 'commercial', 'community', 'farming', 'research', 'military', 'decoration']
    },
    tier: {
      type: 'integer',
      minimum: 1,
      maximum: 5
    },
    layout: {
      type: 'array',
      items: { type: 'string' },
      minItems: 3,
      description: 'ASCII layout where each string is a row. Use: # (wall), . (floor), D (door), W (window), space (outside)'
    },
    materials: {
      type: 'object',
      properties: {
        wall: {
          type: 'string',
          enum: ['wood', 'stone', 'mud_brick', 'ice', 'metal', 'glass', 'thatch']
        },
        floor: {
          type: 'string',
          enum: ['dirt', 'wood', 'stone', 'tile', 'carpet']
        },
        door: {
          type: 'string',
          enum: ['wood', 'stone', 'metal', 'cloth']
        }
      },
      required: ['wall', 'floor', 'door']
    },
    functionality: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['sleeping', 'crafting', 'storage', 'research', 'gathering_boost', 'mood_aura']
          },
          params: { type: 'object' }
        },
        required: ['type']
      }
    },
    capacity: {
      type: 'integer',
      minimum: 1
    },
    style: {
      type: 'string',
      enum: ['rustic', 'stone_craft', 'elven', 'dwarven', 'modern', 'whimsical', 'ancient']
    },
    lore: {
      type: 'string',
      description: 'Optional backstory or flavor text'
    }
  },
  required: ['id', 'name', 'description', 'category', 'tier', 'layout', 'materials', 'functionality', 'capacity']
};

// =============================================================================
// CLAUDE TOOL DEFINITION
// =============================================================================

/**
 * Tool definition for Claude's tool use API.
 */
export const BUILDING_DESIGNER_TOOL = {
  name: 'design_building',
  description: 'Design a tile-based voxel building for the village simulation. Creates an ASCII layout with walls, floors, doors, and windows.',
  input_schema: BUILDING_JSON_SCHEMA
};
