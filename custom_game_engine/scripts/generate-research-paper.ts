#!/usr/bin/env tsx
/**
 * Research Paper Generator
 *
 * Uses Anthropic API to generate research papers in the style of:
 * - Terry Pratchett (witty, observational humor)
 * - Walter Moers (fantastical elaborations)
 * - Douglas Adams (bureaucratic absurdity)
 * - Neil Gaiman (mythological weight)
 */

import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs';
import * as path from 'path';

interface PaperSpec {
  paperId: string;
  title: string;
  field: string;
  paperSets: string[];
  prerequisitePapers: string[];
  complexity: number;
  minimumAge: 'teen' | 'adult' | 'elder';
  minimumSkills?: Record<string, number>;
  skillGrants: Record<string, number>;
  contributesTo: Array<{
    type: 'recipe' | 'building' | 'crop' | 'item' | 'ability' | 'spell' | 'herb';
    id: string;
  }>;
  topicDescription: string; // What the paper is about
  keyPoints: string[]; // Main points to cover
}

const PAPER_GENERATION_PROMPT = `You are an expert at writing academic research papers in the distinctive combined style of Terry Pratchett, Walter Moers, Douglas Adams, and Neil Gaiman.

Your task is to write a research paper about a technical/magical topic, but infused with:

**Terry Pratchett Style:**
- Witty footnotes that are as entertaining as the main text
- Observational humor about the absurdity of the subject
- Practical wisdom wrapped in comedy
- References to historical incidents that sound plausible but are ridiculous
- Use asterisks: *, **, ***, etc.

**Walter Moers Style:**
- Fantastical elaborations and invented details
- Made-up creatures, places, and incidents
- Elaborate digressions that add flavor
- Nested footnotes (footnotes within footnotes)
- Use symbols: †, ††, †††, ‡, ‡‡, ‡‡‡, etc.

**Douglas Adams Style:**
- Bureaucratic absurdity and precise statistics
- Overly specific measurements and percentages
- Commentary on institutional dysfunction
- The contrast between cosmic importance and mundane detail

**Neil Gaiman Style:**
- Mythological weight and ancient history
- References to old gods, forgotten knowledge
- A sense of things older and stranger than understood
- Poetic language mixed with the mundane

## Paper Structure

The paper should have:
1. **Main text** - The academic content, written with gravitas but undermined by humor
2. **Extensive footnotes** - Mix all four styles, making the footnotes as long as or longer than the main text
3. **An abstract** - A serious 1-2 sentence summary of the actual content

## Formatting Requirements

- Main text should be 3-5 paragraphs
- Include AT LEAST 15-20 footnotes
- Footnotes should reference each other occasionally
- Use a mix of *, †, ‡ symbols for footnotes (cycle through them)
- Make footnotes progressively more absurd as they go deeper
- Include "cautionary tales" and "historical incidents"
- Reference made-up scholars, institutions, and events
- Add warnings about what not to do (that people definitely did)

## Example Footnote Progression

Main text: "The author introduces the concept of sympathetic carving*"

*This proves harder than expected. The ratio of "rune successfully carved" to "finger accidentally carved" begins at approximately 3:1 for novices†.

†The Guild of Runecarvers maintains detailed injury statistics. They are surprisingly cheerful about it.

## Tone Guidelines

- Start formal, drift into absurdity
- Treat ridiculous things seriously
- Make serious things sound slightly ridiculous
- Include safety warnings that suggest terrible things happened
- Reference "incidents" without full explanation
- Imply there's more to the story in footnotes

Now write the research paper based on the specifications provided.`;

async function generatePaper(spec: PaperSpec, apiKey: string): Promise<string> {
  const anthropic = new Anthropic({ apiKey });

  const userPrompt = `Generate a research paper with these specifications:

**Paper ID:** ${spec.paperId}
**Title:** ${spec.title}
**Field:** ${spec.field}
**Complexity:** ${spec.complexity}/10
**Minimum Age:** ${spec.minimumAge}
**Topic:** ${spec.topicDescription}

**Key Points to Cover:**
${spec.keyPoints.map((point, i) => `${i + 1}. ${point}`).join('\n')}

**Prerequisites:** ${spec.prerequisitePapers.length > 0 ? spec.prerequisitePapers.join(', ') : 'None - this is a foundational paper'}

**What This Paper Unlocks/Contributes To:**
${spec.contributesTo.map(c => `- ${c.type}: ${c.id}`).join('\n')}

Write the paper with:
- 3-5 paragraphs of main text
- 15-20+ footnotes in the mixed Pratchett/Moers/Adams/Gaiman style
- An abstract (1-2 sentences)
- Extensive humor and absurdity
- Cautionary tales and historical incidents
- References to made-up scholars and institutions

Format the output as:
\`\`\`
[Main text with footnote markers]

[All footnotes]
\`\`\`

Then after the paper text, provide:

ABSTRACT: [1-2 sentence serious summary]`;

  console.log(`Generating paper: ${spec.title}...`);

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 2000, // Reduced - just abstract and key details
    temperature: 1.0, // High creativity for humor
    system: PAPER_GENERATION_PROMPT,
    messages: [
      {
        role: 'user',
        content: userPrompt
      }
    ]
  });

  const response = message.content[0];
  if (response.type !== 'text') {
    throw new Error('Unexpected response type from API');
  }

  return response.text;
}

function formatAsTypeScript(spec: PaperSpec, generatedText: string): string {
  // Extract abstract from generated text
  const abstractMatch = generatedText.match(/ABSTRACT:\s*(.+?)$/m);
  const abstract = abstractMatch ? abstractMatch[1].trim() : 'Research paper on ' + spec.topicDescription;

  // Extract the paper description (everything before ABSTRACT)
  const descriptionMatch = generatedText.split('ABSTRACT:')[0].trim();
  const description = descriptionMatch.replace(/^```\n?/, '').replace(/```\n?$/, '');

  const skillGrantsStr = Object.entries(spec.skillGrants)
    .map(([skill, points]) => `${skill}: ${points}`)
    .join(', ');

  const contributesToStr = spec.contributesTo
    .map(c => `    { type: '${c.type}', ${c.type}Id: '${c.id}' }`)
    .join(',\n');

  const prerequisitesStr = spec.prerequisitePapers.length > 0
    ? `['${spec.prerequisitePapers.join("', '")}']`
    : '[]';

  const paperSetsStr = `['${spec.paperSets.join("', '")}']`;

  const minimumSkillsStr = spec.minimumSkills
    ? `,\n  minimumSkills: { ${Object.entries(spec.minimumSkills).map(([s, p]) => `${s}: ${p}`).join(', ')} }`
    : '';

  return `export const ${spec.paperId.toUpperCase()}: ResearchPaper = {
  paperId: '${spec.paperId}',
  title: '${spec.title}',
  field: '${spec.field}',
  paperSets: ${paperSetsStr},
  prerequisitePapers: ${prerequisitesStr},
  complexity: ${spec.complexity},
  minimumAge: '${spec.minimumAge}',
  skillGrants: { ${skillGrantsStr} }${minimumSkillsStr},
  contributesTo: [
${contributesToStr}
  ],
  description: \`${description}\`,
  abstract: '${abstract}',
  published: false
};
`;
}

async function generatePaperFile(
  specs: PaperSpec[],
  outputFile: string,
  apiKey: string
): Promise<void> {
  const papers: string[] = [];

  for (const spec of specs) {
    const generatedText = await generatePaper(spec, apiKey);
    const typescript = formatAsTypeScript(spec, generatedText);
    papers.push(typescript);

    // Small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  const paperIds = specs.map(s => s.paperId.toUpperCase()).join(',\n  ');

  const fileContent = `/**
 * Generated Research Papers
 *
 * Auto-generated using AI with Pratchett/Moers/Adams/Gaiman style
 */

import type { ResearchPaper } from './types.js';

${papers.join('\n\n')}

export const GENERATED_PAPERS = [
  ${paperIds}
];
`;

  fs.writeFileSync(outputFile, fileContent);
  console.log(`\nGenerated ${specs.length} papers to ${outputFile}`);
}

// CLI Usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log(`
Usage: tsx scripts/generate-research-paper.ts <spec-file.json> <output-file.ts> [--api-key=KEY]

The spec file should be a JSON array of PaperSpec objects.

Example spec file:
[
  {
    "paperId": "yeast_fermentation",
    "title": "On the Mysterious Rising of Dough: A Study of Yeast",
    "field": "cuisine",
    "paperSets": ["bread_baking"],
    "prerequisitePapers": [],
    "complexity": 3,
    "minimumAge": "teen",
    "skillGrants": { "cooking": 10, "nature": 5 },
    "contributesTo": [
      { "type": "recipe", "id": "simple_bread" }
    ],
    "topicDescription": "The role of yeast in fermentation and bread rising",
    "keyPoints": [
      "Yeast as living organisms",
      "Anaerobic fermentation process",
      "Temperature and timing requirements",
      "Signs of successful fermentation"
    ]
  }
]
`);
    process.exit(1);
  }

  const specFile = args[0];
  const outputFile = args[1];
  const apiKeyArg = args.find(arg => arg.startsWith('--api-key='));
  const apiKey = apiKeyArg ? apiKeyArg.split('=')[1] : process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.error('Error: No API key provided. Use --api-key=KEY or set ANTHROPIC_API_KEY env var');
    process.exit(1);
  }

  const specs: PaperSpec[] = JSON.parse(fs.readFileSync(specFile, 'utf-8'));

  generatePaperFile(specs, outputFile, apiKey)
    .then(() => console.log('Done!'))
    .catch(err => {
      console.error('Error:', err);
      process.exit(1);
    });
}

export { generatePaper, generatePaperFile, PaperSpec };
