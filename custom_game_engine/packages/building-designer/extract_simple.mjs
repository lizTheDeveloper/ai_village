#!/usr/bin/env node
/**
 * Simple regex-based extraction of building definitions from TypeScript.
 * Parses the structure without needing to compile or import.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function extractBuildingObject(text, startIdx) {
  // Find opening brace
  let openBrace = text.indexOf('{', startIdx);
  if (openBrace === -1) return null;

  // Count braces to find matching close
  let braceCount = 0;
  let i = openBrace;
  let inString = false;
  let stringChar = null;
  let escaped = false;

  while (i < text.length) {
    const char = text[i];

    if (escaped) {
      escaped = false;
      i++;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      i++;
      continue;
    }

    if (!inString) {
      if (char === '"' || char === "'" || char === '`') {
        inString = true;
        stringChar = char;
      } else if (char === '{') {
        braceCount++;
      } else if (char === '}') {
        braceCount--;
        if (braceCount === 0) {
          // Found matching brace
          return text.substring(openBrace, i + 1);
        }
      }
    } else {
      if (char === stringChar) {
        inString = false;
        stringChar = null;
      }
    }

    i++;
  }

  return null;
}

function parseValue(valueStr) {
  valueStr = valueStr.trim();

  // Boolean
  if (valueStr === 'true') return true;
  if (valueStr === 'false') return false;

  // Null/undefined
  if (valueStr === 'null' || valueStr === 'undefined') return null;

  // Number
  if (/^-?\d+(\.\d+)?$/.test(valueStr)) {
    return valueStr.includes('.') ? parseFloat(valueStr) : parseInt(valueStr);
  }

  // String (remove quotes)
  if ((valueStr.startsWith("'") && valueStr.endsWith("'")) ||
      (valueStr.startsWith('"') && valueStr.endsWith('"')) ||
      (valueStr.startsWith('`') && valueStr.endsWith('`'))) {
    return valueStr.slice(1, -1);
  }

  // Array
  if (valueStr.startsWith('[') && valueStr.endsWith(']')) {
    return parseArray(valueStr);
  }

  // Object
  if (valueStr.startsWith('{') && valueStr.endsWith('}')) {
    return parseObject(valueStr);
  }

  // Return as string if can't parse
  return valueStr;
}

function parseArray(arrayStr) {
  const content = arrayStr.slice(1, -1).trim();
  if (!content) return [];

  const items = [];
  let currentItem = '';
  let depth = 0;
  let inString = false;
  let stringChar = null;
  let escaped = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];

    if (escaped) {
      currentItem += char;
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      currentItem += char;
      continue;
    }

    if (!inString) {
      if (char === '"' || char === "'" || char === '`') {
        inString = true;
        stringChar = char;
        currentItem += char;
      } else if (char === '[' || char === '{') {
        depth++;
        currentItem += char;
      } else if (char === ']' || char === '}') {
        depth--;
        currentItem += char;
      } else if (char === ',' && depth === 0) {
        // End of item
        items.push(parseValue(currentItem.trim()));
        currentItem = '';
      } else {
        currentItem += char;
      }
    } else {
      currentItem += char;
      if (char === stringChar) {
        inString = false;
        stringChar = null;
      }
    }
  }

  // Add last item
  if (currentItem.trim()) {
    items.push(parseValue(currentItem.trim()));
  }

  return items;
}

function parseObject(objStr) {
  const content = objStr.slice(1, -1).trim();
  if (!content) return {};

  const obj = {};
  let currentKey = '';
  let currentValue = '';
  let inKey = true;
  let depth = 0;
  let inString = false;
  let stringChar = null;
  let escaped = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];

    if (escaped) {
      if (inKey) currentKey += char;
      else currentValue += char;
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      if (inKey) currentKey += char;
      else currentValue += char;
      continue;
    }

    if (!inString) {
      if (char === '"' || char === "'" || char === '`') {
        inString = true;
        stringChar = char;
        if (inKey) currentKey += char;
        else currentValue += char;
      } else if (inKey && char === ':') {
        inKey = false;
      } else if (!inKey && (char === '[' || char === '{')) {
        depth++;
        currentValue += char;
      } else if (!inKey && (char === ']' || char === '}')) {
        depth--;
        currentValue += char;
      } else if (char === ',' && depth === 0 && !inKey) {
        // End of key-value pair
        const key = currentKey.trim().replace(/['"]/g, '');
        obj[key] = parseValue(currentValue.trim());
        currentKey = '';
        currentValue = '';
        inKey = true;
      } else {
        if (inKey) currentKey += char;
        else currentValue += char;
      }
    } else {
      if (inKey) currentKey += char;
      else currentValue += char;
      if (char === stringChar) {
        inString = false;
        stringChar = null;
      }
    }
  }

  // Add last pair
  if (currentKey.trim() && !inKey) {
    const key = currentKey.trim().replace(/['"]/g, '');
    obj[key] = parseValue(currentValue.trim());
  }

  return obj;
}

function extractBuildings(sourceText) {
  const buildings = [];

  // Find all export const BUILDING_NAME: VoxelBuildingDefinition = {...}
  const pattern = /export\s+const\s+(\w+)\s*:\s*VoxelBuildingDefinition\s*=/g;
  let match;

  while ((match = pattern.exec(sourceText)) !== null) {
    const buildingName = match[1];
    const startIdx = match.index + match[0].length;

    const objectText = extractBuildingObject(sourceText, startIdx);
    if (objectText) {
      try {
        const building = parseObject(objectText);
        if (building.id && building.name && building.layout) {
          buildings.push(building);
          console.log(`  ✓ Extracted: ${building.id} (${building.name})`);
        }
      } catch (error) {
        console.error(`  ✗ Failed to parse ${buildingName}:`, error.message);
      }
    }
  }

  return buildings;
}

async function main() {
  const srcDir = path.join(__dirname, 'src');
  const dataDir = path.join(__dirname, 'data');

  // Ensure data directory exists
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const files = [
    { source: 'building-library.ts', output: 'standard-buildings.json' },
    { source: 'exotic-buildings.ts', output: 'exotic-buildings.json' },
    { source: 'magic-buildings.ts', output: 'magic-buildings.json' },
    { source: 'crafting-buildings.ts', output: 'crafting-buildings.json' },
  ];

  let totalExtracted = 0;

  for (const file of files) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Processing: ${file.source}`);
    console.log(`${'='.repeat(60)}`);

    try {
      const sourcePath = path.join(srcDir, file.source);
      const sourceText = fs.readFileSync(sourcePath, 'utf-8');

      const buildings = extractBuildings(sourceText);

      if (buildings.length > 0) {
        const outputPath = path.join(dataDir, file.output);
        fs.writeFileSync(outputPath, JSON.stringify(buildings, null, 2), 'utf-8');
        console.log(`\n  ✓ Saved ${buildings.length} buildings to: ${file.output}`);
        totalExtracted += buildings.length;
      } else {
        console.log(`  ✗ No buildings extracted from ${file.source}`);
      }
    } catch (error) {
      console.error(`  ✗ Error processing ${file.source}:`, error.message);
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`EXTRACTION COMPLETE`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Total buildings extracted: ${totalExtracted}`);
  console.log(`Output directory: ${dataDir}`);
  console.log(`${'='.repeat(60)}`);
}

main().catch(console.error);
