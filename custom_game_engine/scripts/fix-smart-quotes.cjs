#!/usr/bin/env node
/**
 * Fix smart quotes in research papers files
 */
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '../packages/world/src/research-papers');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.ts'));

let fixedCount = 0;

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace smart quotes with regular quotes
  const original = content;
  content = content
    .replace(/'/g, "'")  // Left single quote
    .replace(/'/g, "'")  // Right single quote
    .replace(/"/g, '"')  // Left double quote
    .replace(/"/g, '"'); // Right double quote

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    fixedCount++;
    console.log(`Fixed: ${file}`);
  }
}

console.log(`\nFixed ${fixedCount} files`);
