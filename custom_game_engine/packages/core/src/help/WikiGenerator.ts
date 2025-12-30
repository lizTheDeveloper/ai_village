/**
 * WikiGenerator - Generate human-readable and LLM-friendly documentation
 *
 * Creates wiki pages from help entries in multiple formats:
 * - Markdown for human readers
 * - JSON for LLM consumption
 * - HTML for web display
 */

import type {
  HelpEntry,
  ItemHelpEntry,
  EffectHelpEntry,
  BuildingHelpEntry,
} from './HelpEntry.js';
import type { HelpRegistry } from './HelpRegistry.js';

/**
 * Options for wiki generation
 */
export interface WikiOptions {
  /** Include table of contents */
  includeToc?: boolean;

  /** Include lore/flavor text */
  includeLore?: boolean;

  /** Include mechanical details */
  includeMechanics?: boolean;

  /** Include examples */
  includeExamples?: boolean;

  /** Include related topics links */
  includeRelated?: boolean;

  /** Maximum heading level (1-6) */
  maxHeadingLevel?: number;
}

/**
 * Generate human-readable markdown wiki
 */
export class MarkdownWikiGenerator {
  constructor(private registry: HelpRegistry) {}

  /**
   * Generate a full wiki for a category
   */
  generateCategory(category: string, options: WikiOptions = {}): string {
    const entries = this.registry.getByCategory(category);
    if (entries.length === 0) {
      return `# ${this.capitalize(category)}\n\nNo entries found.\n`;
    }

    const subcategories = this.groupBySubcategory(entries);
    let markdown = `# ${this.capitalize(category)}\n\n`;

    // Table of contents
    if (options.includeToc !== false) {
      markdown += this.generateToc(subcategories);
      markdown += '\n---\n\n';
    }

    // Generate each subcategory
    for (const [subcategory, subEntries] of Array.from(subcategories.entries())) {
      markdown += `## ${this.capitalize(subcategory || 'General')}\n\n`;

      for (const entry of subEntries) {
        markdown += this.generateEntry(entry, options);
        markdown += '\n---\n\n';
      }
    }

    return markdown;
  }

  /**
   * Generate markdown for a single help entry
   */
  generateEntry(entry: HelpEntry, options: WikiOptions = {}): string {
    let md = `### ${entry.id}\n\n`;
    md += `**${entry.summary}**\n\n`;
    md += `${entry.description}\n\n`;

    // Tags
    if (entry.tags.length > 0) {
      md += `*Tags: ${entry.tags.map(t => `\`${t}\``).join(', ')}*\n\n`;
    }

    // Type-specific sections
    if (this.isItemHelp(entry)) {
      md += this.generateItemSection(entry, options);
    } else if (this.isEffectHelp(entry)) {
      md += this.generateEffectSection(entry, options);
    } else if (this.isBuildingHelp(entry)) {
      md += this.generateBuildingSection(entry, options);
    }

    // Mechanics
    if (options.includeMechanics !== false && entry.mechanics) {
      md += this.generateMechanicsSection(entry.mechanics);
    }

    // Examples
    if (options.includeExamples !== false && entry.examples) {
      md += this.generateExamplesSection(entry.examples);
    }

    // Tips
    if (entry.tips && entry.tips.length > 0) {
      md += `#### Tips\n\n`;
      for (const tip of entry.tips) {
        md += `- ${tip}\n`;
      }
      md += '\n';
    }

    // Warnings
    if (entry.warnings && entry.warnings.length > 0) {
      md += `#### Warnings\n\n`;
      for (const warning of entry.warnings) {
        md += `⚠️ ${warning}\n\n`;
      }
    }

    // Lore
    if (options.includeLore !== false && entry.lore) {
      md += `#### Lore\n\n`;
      md += `*${entry.lore}*\n\n`;
    }

    // Related topics
    if (
      options.includeRelated !== false &&
      entry.relatedTopics &&
      entry.relatedTopics.length > 0
    ) {
      md += `#### Related Topics\n\n`;
      for (const topicId of entry.relatedTopics) {
        const topic = this.registry.get(topicId);
        if (topic) {
          md += `- [${topic.id}](#${this.slugify(topic.id)}) - ${topic.summary}\n`;
        }
      }
      md += '\n';
    }

    return md;
  }

  private generateItemSection(entry: ItemHelpEntry, _options: WikiOptions): string {
    let md = '';

    if (entry.obtainedBy && entry.obtainedBy.length > 0) {
      md += `#### How to Obtain\n\n`;
      for (const method of entry.obtainedBy) {
        md += `- ${method}\n`;
      }
      md += '\n';
    }

    if (entry.usedFor && entry.usedFor.length > 0) {
      md += `#### Uses\n\n`;
      for (const use of entry.usedFor) {
        md += `- ${use}\n`;
      }
      md += '\n';
    }

    if (entry.crafting) {
      md += `#### Crafting\n\n`;
      if (entry.crafting.station) {
        md += `**Station:** ${entry.crafting.station}\n\n`;
      }
      md += `**Ingredients:**\n`;
      for (const ing of entry.crafting.ingredients) {
        md += `- ${ing.amount}x ${ing.item}\n`;
      }
      if (entry.crafting.skill) {
        md += `\n**Required Skill:** ${entry.crafting.skill} (Level ${entry.crafting.skillLevel || 1})\n`;
      }
      md += '\n';
    }

    if (entry.qualityInfo) {
      md += `#### Quality\n\n`;
      md += `Range: ${entry.qualityInfo.min}-${entry.qualityInfo.max}\n\n`;
      md += `${entry.qualityInfo.effects}\n\n`;
    }

    return md;
  }

  private generateEffectSection(entry: EffectHelpEntry, _options: WikiOptions): string {
    let md = '';

    md += `**Effect Type:** ${entry.effectCategory}\n\n`;
    md += `**Target:** ${entry.targetType}\n\n`;

    if (entry.duration) {
      md += `**Duration:** ${entry.duration}\n\n`;
    }

    if (entry.range) {
      md += `**Range:** ${entry.range}\n\n`;
    }

    if (entry.damageType) {
      md += `**Damage Type:** ${entry.damageType}\n\n`;
    }

    if (entry.scaling) {
      md += `#### Scaling\n\n`;
      md += `**Attribute:** ${entry.scaling.attribute}\n\n`;
      md += `**Formula:** \`${entry.scaling.formula}\`\n\n`;
      md += `${entry.scaling.description}\n\n`;
    }

    if (entry.counterplay && entry.counterplay.length > 0) {
      md += `#### Counterplay\n\n`;
      for (const counter of entry.counterplay) {
        md += `- ${counter}\n`;
      }
      md += '\n';
    }

    return md;
  }

  private generateBuildingSection(
    entry: BuildingHelpEntry,
    _options: WikiOptions
  ): string {
    let md = '';

    if (entry.construction) {
      md += `#### Construction\n\n`;
      md += `**Materials:**\n`;
      for (const mat of entry.construction.materials) {
        md += `- ${mat.amount}x ${mat.item}\n`;
      }
      if (entry.construction.skill) {
        md += `\n**Required Skill:** ${entry.construction.skill} (Level ${entry.construction.skillLevel || 1})\n`;
      }
      if (entry.construction.buildTime) {
        md += `\n**Build Time:** ${entry.construction.buildTime}\n`;
      }
      md += '\n';
    }

    if (entry.craftsItems && entry.craftsItems.length > 0) {
      md += `#### Crafts\n\n`;
      for (const item of entry.craftsItems) {
        md += `- ${item}\n`;
      }
      md += '\n';
    }

    if (entry.features && entry.features.length > 0) {
      md += `#### Features\n\n`;
      for (const feature of entry.features) {
        md += `- ${feature}\n`;
      }
      md += '\n';
    }

    if (entry.placement && entry.placement.length > 0) {
      md += `#### Placement\n\n`;
      for (const rule of entry.placement) {
        md += `- ${rule}\n`;
      }
      md += '\n';
    }

    return md;
  }

  private generateMechanicsSection(mechanics: HelpEntry['mechanics']): string {
    if (!mechanics) return '';

    let md = `#### Game Mechanics\n\n`;

    if (mechanics.values) {
      md += `**Values:**\n`;
      for (const [key, value] of Object.entries(mechanics.values)) {
        md += `- ${key}: ${value}\n`;
      }
      md += '\n';
    }

    if (mechanics.formulas) {
      md += `**Formulas:**\n`;
      for (const [name, formula] of Object.entries(mechanics.formulas)) {
        md += `- ${name}: \`${formula}\`\n`;
      }
      md += '\n';
    }

    if (mechanics.conditions) {
      md += `**Conditions:**\n`;
      for (const [condition, effect] of Object.entries(mechanics.conditions)) {
        md += `- ${condition}: ${effect}\n`;
      }
      md += '\n';
    }

    if (mechanics.dependencies && mechanics.dependencies.length > 0) {
      md += `**Dependencies:** ${mechanics.dependencies.join(', ')}\n\n`;
    }

    if (mechanics.unlocks && mechanics.unlocks.length > 0) {
      md += `**Unlocks:** ${mechanics.unlocks.join(', ')}\n\n`;
    }

    if (mechanics.timing) {
      md += `**Timing:**\n`;
      for (const [key, value] of Object.entries(mechanics.timing)) {
        md += `- ${key}: ${value}\n`;
      }
      md += '\n';
    }

    if (mechanics.costs) {
      md += `**Costs:**\n`;
      for (const [resource, amount] of Object.entries(mechanics.costs)) {
        md += `- ${resource}: ${amount}\n`;
      }
      md += '\n';
    }

    return md;
  }

  private generateExamplesSection(examples: HelpEntry['examples']): string {
    if (!examples || examples.length === 0) return '';

    let md = `#### Examples\n\n`;

    for (const example of examples) {
      md += `**${example.title}**\n\n`;
      md += `${example.description}\n\n`;
      if (example.code) {
        md += `\`\`\`\n${example.code}\n\`\`\`\n\n`;
      }
    }

    return md;
  }

  private generateToc(
    subcategories: Map<string, HelpEntry[]>
  ): string {
    let toc = `## Table of Contents\n\n`;

    for (const [subcategory, entries] of Array.from(subcategories.entries())) {
      toc += `- [${this.capitalize(subcategory || 'General')}](#${this.slugify(subcategory || 'general')})\n`;
      for (const entry of entries) {
        toc += `  - [${entry.id}](#${this.slugify(entry.id)})\n`;
      }
    }

    return toc;
  }

  private groupBySubcategory(entries: HelpEntry[]): Map<string, HelpEntry[]> {
    const groups = new Map<string, HelpEntry[]>();

    for (const entry of entries) {
      const key = entry.subcategory || '';
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(entry);
    }

    return groups;
  }

  private isItemHelp(entry: HelpEntry): entry is ItemHelpEntry {
    return entry.category === 'items';
  }

  private isEffectHelp(entry: HelpEntry): entry is EffectHelpEntry {
    return entry.category === 'magic' || entry.category === 'effects';
  }

  private isBuildingHelp(entry: HelpEntry): entry is BuildingHelpEntry {
    return entry.category === 'buildings';
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  private slugify(str: string): string {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
}

/**
 * Generate LLM-friendly JSON documentation
 */
export class JsonWikiGenerator {
  constructor(private registry: HelpRegistry) {}

  /**
   * Generate complete JSON wiki
   */
  generateFull(): object {
    const categories = this.registry.getCategories();
    const wiki: Record<string, any> = {
      version: '1.0',
      generatedAt: new Date().toISOString(),
      stats: this.registry.getStats(),
      categories: {},
    };

    for (const category of categories) {
      wiki.categories[category] = this.generateCategory(category);
    }

    return wiki;
  }

  /**
   * Generate JSON for a category
   */
  generateCategory(category: string): object {
    const entries = this.registry.getByCategory(category);
    const subcategories = this.groupBySubcategory(entries);

    const result: Record<string, any> = {
      name: category,
      count: entries.length,
      subcategories: {},
    };

    for (const [subcategory, subEntries] of Array.from(subcategories.entries())) {
      result.subcategories[subcategory || 'general'] = {
        count: subEntries.length,
        entries: subEntries.map(e => this.serializeEntry(e)),
      };
    }

    return result;
  }

  /**
   * Serialize a help entry for LLM consumption
   */
  private serializeEntry(entry: HelpEntry): object {
    return {
      id: entry.id,
      summary: entry.summary,
      description: entry.description,
      category: entry.category,
      subcategory: entry.subcategory,
      tags: entry.tags,
      examples: entry.examples,
      relatedTopics: entry.relatedTopics,
      tips: entry.tips,
      warnings: entry.warnings,
      mechanics: entry.mechanics,
      lore: entry.lore,
      ...(this.isItemHelp(entry) && {
        itemData: {
          obtainedBy: entry.obtainedBy,
          usedFor: entry.usedFor,
          crafting: entry.crafting,
          qualityInfo: entry.qualityInfo,
        },
      }),
      ...(this.isEffectHelp(entry) && {
        effectData: {
          effectCategory: entry.effectCategory,
          targetType: entry.targetType,
          duration: entry.duration,
          range: entry.range,
          damageType: entry.damageType,
          scaling: entry.scaling,
          counterplay: entry.counterplay,
        },
      }),
      ...(this.isBuildingHelp(entry) && {
        buildingData: {
          construction: entry.construction,
          craftsItems: entry.craftsItems,
          features: entry.features,
          placement: entry.placement,
        },
      }),
    };
  }

  private groupBySubcategory(entries: HelpEntry[]): Map<string, HelpEntry[]> {
    const groups = new Map<string, HelpEntry[]>();

    for (const entry of entries) {
      const key = entry.subcategory || '';
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(entry);
    }

    return groups;
  }

  private isItemHelp(entry: HelpEntry): entry is ItemHelpEntry {
    return entry.category === 'items';
  }

  private isEffectHelp(entry: HelpEntry): entry is EffectHelpEntry {
    return entry.category === 'magic' || entry.category === 'effects';
  }

  private isBuildingHelp(entry: HelpEntry): entry is BuildingHelpEntry {
    return entry.category === 'buildings';
  }
}
