/**
 * AcademicPaperSystem - Research through publication and citation
 *
 * Instead of arbitrary "research points", researchers publish academic papers
 * as they work toward discoveries. This creates:
 *
 * 1. **Papers** - Published during research, with authors and citations
 * 2. **Citation Network** - Papers cite prerequisite research papers
 * 3. **Author Metrics** - h-index, citation count, co-author network
 * 4. **Fame from Citations** - Being cited = recognition and prestige
 *
 * Research Progress:
 * - Each research project requires N papers to complete
 * - Higher tier research requires more papers
 * - Papers cite prerequisite research (creating the citation network)
 * - Multiple authors share credit (lead author + et al.)
 *
 * Example flow for "Advanced AI" research:
 * 1. Researcher starts working on Advanced AI
 * 2. Publishes "Neural Architecture Foundations" (cites Neural Interface papers)
 * 3. Publishes "Self-Improvement Algorithms" (cites own previous paper)
 * 4. Publishes "Emergent Creativity in AGI" (cites AI, neural papers)
 * 5. Research complete! All 3 papers now part of Advanced AI's bibliography
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import type { EventBus } from '../events/EventBus.js';
import { ResearchRegistry } from './ResearchRegistry.js';
import type { ResearchDefinition, ResearchField } from './types.js';

// =============================================================================
// TYPES
// =============================================================================

export interface AcademicPaper {
  id: string;
  title: string;
  abstract: string;

  // Authors
  firstAuthorId: string;
  firstAuthorName: string;
  coAuthorIds: string[];
  coAuthorNames: string[];

  // Research context
  researchId: string; // Which research this contributes to
  researchName: string;
  field: ResearchField;
  tier: number;

  // Citations (papers this paper cites)
  citations: string[]; // paper IDs

  // Metrics (updated over time)
  citedByCount: number; // How many papers cite this one
  citedBy: string[]; // Paper IDs that cite this

  // Timestamps
  publishedAt: number;
  lastCitedAt: number;

  // Quality indicators
  significance: number; // 0-100, based on tier and novelty
  isBreakthrough: boolean; // Major discovery paper
  isSeminal: boolean; // Foundational paper in a field
}

export interface Author {
  agentId: string;
  name: string;

  // Publication metrics
  papers: string[]; // paper IDs
  papersAsFirstAuthor: string[];
  papersAsCoAuthor: string[];

  // Citation metrics
  totalCitations: number;
  hIndex: number; // h papers with at least h citations each
  i10Index: number; // papers with at least 10 citations

  // Collaboration
  coAuthors: Map<string, number>; // agentId -> number of collaborations
  mentees: string[]; // agents they've co-authored with who have fewer papers
  mentors: string[]; // agents who co-authored their early papers

  // Fields
  primaryField: ResearchField | null;
  fieldsPublishedIn: Set<ResearchField>;

  // Recognition
  citationsByField: Map<ResearchField, number>;
  mostCitedPaper: string | null;
  breakthroughPapers: string[];

  // Career
  firstPublicationAt: number;
  lastPublicationAt: number;
  yearsActive: number;
}

export interface ResearchBibliography {
  researchId: string;
  researchName: string;
  papers: string[]; // papers published for this research
  papersRequired: number;
  isComplete: boolean;
  completedAt?: number;
  leadResearcherId: string;
  contributorIds: string[];
}

export interface CitationEvent {
  citingPaperId: string;
  citedPaperId: string;
  citingAuthorId: string;
  citedAuthorId: string;
  timestamp: number;
}

// =============================================================================
// PAPER TITLE GENERATOR
// =============================================================================

const TITLE_TEMPLATES: Record<ResearchField, string[]> = {
  agriculture: [
    'Advances in {topic} Cultivation Techniques',
    'Soil Optimization for Enhanced {topic} Yield',
    'Sustainable {topic} Practices: A Comprehensive Study',
    'Novel Approaches to {topic} in Arid Climates',
    '{topic} Growth Factors: An Empirical Analysis',
    // Researcher humor
    'Why {topic} Crops Outperform Our Graduate Students in Sunlight Absorption',
    '{topic} Irrigation: 42% of the Time, It Works Every Time',
    'P-Hacking in {topic} Yield Studies: A Self-Referential Meta-Analysis',
    'Reviewer 2 Was Wrong About {topic}: A Rebuttal',
    'Deep Learning Approaches to {topic} (Yes, We Added AI to Agriculture)',
  ],
  construction: [
    'Structural Analysis of {topic} Buildings',
    'Load-Bearing Properties of {topic} Materials',
    'Efficient {topic} Construction Methods',
    'Durability Studies in {topic} Architecture',
    '{topic} Design Principles for Modern Structures',
    // Researcher humor
    'Everything We Thought We Knew About {topic} Was Wrong (Again)',
    '{topic} Load Testing: Why Our Graduate Students Carry Heavy Things',
    'A Statistically Significant Number of {topic} Structures Still Standing',
    'WITHDRAWN: {topic} Safety Study (See Corrigendum)',
    'N=1 Case Study: My House Uses {topic} Materials',
  ],
  crafting: [
    'Optimizing {topic} Production Workflows',
    'Material Properties in {topic} Fabrication',
    'Precision Techniques for {topic} Creation',
    'Quality Control in {topic} Manufacturing',
    'Traditional vs Modern {topic} Methods',
    // Researcher humor
    '{topic} Fabrication: Now With 99.7% Fewer Fires',
    'Can Transformers Learn {topic} Crafting? (Spoiler: We Got Funding)',
    'A Novel {topic} Approach That Is Definitely Not Just Gradient Descent',
    'Why {topic} Takes Longer Than We Told the Grant Committee',
    'Reproducibility Crisis in {topic}: Works On My Workbench',
  ],
  metallurgy: [
    'Alloy Composition in {topic} Forging',
    'Heat Treatment Optimization for {topic}',
    'Crystalline Structures in {topic} Metals',
    'Corrosion Resistance of {topic} Alloys',
    '{topic} Smelting: Temperature Dynamics',
    // Researcher humor
    'The Phase Diagram Is Not The Territory: {topic} Alloy Studies',
    '{topic} Hardness Testing: Reviewer 2 Hits Back',
    'Local Blacksmith Discovers {topic} Trick Metallurgists Hate',
    'Why {topic} Samples Keep Disappearing from the Lab',
    'Attention Is All You Need for {topic} Crystal Growth (Please Cite Us)',
  ],
  alchemy: [
    'Transmutation Pathways in {topic} Synthesis',
    'Catalytic Properties of {topic} Reagents',
    'Stabilization Methods for {topic} Compounds',
    'Elemental Balance in {topic} Reactions',
    '{topic} Potency Enhancement Techniques',
    // Researcher humor
    'This {topic} Reaction Definitely Will Not Explode (Confidence: 73%)',
    'Gradient Descent in {topic} Transmutation Parameter Space',
    '{topic} Synthesis: Read The Error Bars Before Getting Excited',
    'A Pre-Registered {topic} Study (Results Still Unexpected)',
    'The {topic} Compound We Made By Accident Is Now Our Best Paper',
  ],
  textiles: [
    'Fiber Strength Analysis in {topic} Weaving',
    'Dye Absorption Rates for {topic} Fabrics',
    '{topic} Thread Tensile Properties',
    'Pattern Optimization in {topic} Design',
    'Durability Testing of {topic} Materials',
    // Researcher humor
    '{topic} Fabric Unraveled: A Thread-Level Analysis',
    'Transfer Learning from ImageNet to {topic} Pattern Recognition',
    'Why {topic} Samples Shrink Precisely When Grant Reviewers Visit',
    'P < 0.05 for {topic} Durability (p = 0.049)',
    'The {topic} Dataset Everyone Uses but Nobody Cites',
  ],
  cuisine: [
    'Flavor Profile Analysis in {topic} Preparation',
    'Preservation Techniques for {topic} Foods',
    'Nutritional Optimization of {topic} Recipes',
    'Temperature Effects on {topic} Cooking',
    'Fermentation Dynamics in {topic} Production',
    // Researcher humor
    'The Optimal {topic} Recipe (According to Our Gradient Boosted Model)',
    '{topic} Fermentation: Waiting Is the Hardest Part (p < 0.001)',
    'Overfitting in {topic} Flavor Prediction: A Tasty Cautionary Tale',
    'Why {topic} Tastes Better at Conferences',
    'Ablation Study on {topic} Ingredients (Literally Just Removing Things)',
  ],
  machinery: [
    'Mechanical Efficiency in {topic} Systems',
    'Gear Ratio Optimization for {topic} Devices',
    'Energy Transfer in {topic} Mechanisms',
    'Automation Principles for {topic} Machinery',
    '{topic} Component Stress Analysis',
    // Researcher humor
    '{topic} Machinery: It Works But We Do Not Know Why',
    'Reinforcement Learning for {topic}: Teaching Machines to Turn Themselves Off',
    'The {topic} Prototype That Definitely Did Not Injure Any Interns',
    'Why {topic} Efficiency Peaked in the 1970s: A Pessimistic Survey',
    'Everything Is a {topic} Problem If You Squint Hard Enough',
  ],
  nature: [
    'Ecosystem Dynamics in {topic} Habitats',
    'Species Interaction Patterns: {topic} Study',
    'Conservation Strategies for {topic} Flora',
    'Biodiversity Metrics in {topic} Regions',
    '{topic} Population Dynamics Analysis',
    // Researcher humor
    '{topic} Species Count: More Than We Expected, Less Than We Hoped',
    'This {topic} Ecosystem Is More Complex Than Our Models (Obviously)',
    'Observing {topic} Without Being Eaten: A Survival Guide',
    'The {topic} Data We Collected in the Rain Is Still Valid, Fight Us',
    'Climate Change Projections for {topic} (The Depressing One)',
  ],
  society: [
    'Social Organization in {topic} Communities',
    'Economic Models for {topic} Trade Systems',
    'Governance Structures: A {topic} Analysis',
    'Cultural Evolution of {topic} Practices',
    '{topic} Cooperation Mechanisms',
    // Researcher humor
    'Rational Actors in {topic}: A Work of Fiction',
    '{topic} Survey Results: N=23 (All Our Friends)',
    'The {topic} Effect We Named After Ourselves',
    'Why {topic} Communities Ignore Our Policy Recommendations',
    'Correlation Is Not Causation: A {topic} Case Study (We Found Causation)',
  ],
  arcane: [
    'Mana Flow Dynamics in {topic} Casting',
    'Runic Resonance Patterns for {topic} Spells',
    'Arcane Stability in {topic} Enchantments',
    '{topic} Power Channeling Techniques',
    'Ethereal Harmonics in {topic} Magic',
    // Researcher humor
    '{topic} Spell Optimization: Now 30% Less Catastrophic Failure',
    'Training Transformers on {topic} Incantations (Double Meaning Intended)',
    'The {topic} Anomaly We Cannot Explain But Sure Can Graph',
    'Why {topic} Spells Work Better on Tuesdays (Not Significant After Correction)',
    'Exploding Gradient Problem in {topic}: Literal Explosions',
  ],
  experimental: [
    'Novel {topic} Phenomena: Initial Observations',
    'Breakthrough in {topic} Understanding',
    'Paradigm Shift: {topic} Reconsidered',
    '{topic} Frontiers: Pushing Known Limits',
    'Emergent Properties in {topic} Systems',
    // Researcher humor
    '{topic} Results: Surprising to Us, Obvious to Everyone Else',
    'This {topic} Discovery Is Not Aliens (Probably)',
    'The {topic} Experiment That Worked on the First Try (We Are Also Confused)',
    'GPT-4 Could Not Reproduce Our {topic} Results Either',
    'BREAKING: {topic} Laws of Physics Still Apply',
  ],
  genetics: [
    'Gene Expression Patterns in {topic} Organisms',
    'Hereditary Traits: {topic} Analysis',
    'Mutation Rates in {topic} Populations',
    '{topic} DNA Sequence Mapping',
    'Epigenetic Factors in {topic} Development',
    // Researcher humor
    '{topic} CRISPR Results: Some Editing Required',
    'The {topic} Gene We Spent 5 Years Finding (Does Very Little)',
    '{topic} Genome: More Junk DNA Than We Would Admit in the Grant',
    'Deep Learning on {topic} Sequences: CNN Finds Patterns We Cannot See',
    'This {topic} Mutation Is Definitely Not From Contamination',
  ],
  spaceflight: [
    'Advances in {topic} Propulsion Systems',
    'Emotional Coherence in {topic} Navigation',
    'β-Space Topology and {topic} Trajectories',
    'Crew Synchronization for {topic} Operations',
    'Narrative Weight in {topic} Journey Planning',
    // Researcher humor
    'Why {topic} Takes Longer Than We Told the Grant Committee',
    'The {topic} Coherence Threshold: 95% of the Time, It Works Every Time',
    '{topic} Jump Failures: A Retrospective Nobody Wanted',
    'Emotional Navigation: When Feelings Are Actually Data',
    'P-Values in {topic} Research: Statistically Significant at α=0.049',
  ],
};

/**
 * Humorous abstract phrases in the style of Pratchett/Adams/Gaiman
 */
const FUNNY_ABSTRACT_PHRASES: string[] = [
  // Terry Pratchett style - footnote humor and philosophical asides
  'It has been observed that the universe tends toward maximum irony.*',
  'As the philosopher Ly Tin Wheedle once noted, "knowing everything about something tells you nothing about anything."',
  'The experiment succeeded in the way that a falling anvil succeeds at obeying gravity.',
  'This phenomenon behaves exactly as it should, which is to say, inexplicably.',
  'Research was conducted with all the rigor of someone who knows they will be proven wrong eventually.',
  'The results are significant in the same way that any result is significant if you stare at it long enough.',

  // Douglas Adams style - cosmic absurdity and probability
  'The universe, as it turns out, is not only queerer than we suppose, but queerer than we can suppose.',
  'This discovery is rather like finding that the library book you needed was due back two million years ago.',
  'The probability of this occurring was roughly one in one googolplex, which is why it happened last Tuesday.',
  'Space is big. Really big. This research makes it approximately 0.0000001% less mysterious.',
  'The answer to this particular question turns out to be forty-two, for values of forty-two approaching our original hypothesis.',
  'Much like the Guide itself, this paper contains many things that are apocryphal, or at least wildly inaccurate.',

  // Neil Gaiman style - mythic undertones and quietly ominous
  'In the beginning, there was the hypothesis. The hypothesis was formless, and void. And the researcher said, let there be data.',
  'This knowledge has always been known, by those who know. We merely wrote it down.',
  'The experiment worked, in the way that old bargains work: it gave us what we asked for, not what we wanted.',
  'Some truths are too important to be discovered. This, fortunately, is not one of those.',
  'The findings presented here were inevitable. They had been waiting for someone to find them.',

  // Classic academic humor with British wit
  'Contrary to the predictions of Reviewer 2 (who remains anonymous but not forgotten), our results demonstrate',
  'The p-value was 0.049, which we interpret as the universe winking at us.',
  'Future work will address the limitations we do not have space to mention, and possibly the ones we are pretending do not exist.',
  'The error bars represent one standard deviation, or perhaps merely hope given statistical form.',
  'We leave the trivial case as an exercise for the reader, as is traditional among those who cannot solve it.',
  'No graduate students were harmed in the production of this research, though several were mildly inconvenienced.',
  'This work was supported by grants we are terrified of not renewing, a fear we have learned to channel productively.',
];

function generatePaperTitle(
  field: ResearchField,
  researchName: string,
  paperNumber: number,
  isBreakthrough: boolean
): string {
  const templates = TITLE_TEMPLATES[field] || TITLE_TEMPLATES.experimental;
  const template = templates[paperNumber % templates.length] || templates[0]!;

  // Extract topic from research name
  const topic = researchName.replace(/\s+(I|II|III|IV|V)$/, '').trim();

  let title = template.replace('{topic}', topic);

  if (isBreakthrough) {
    title = `Breakthrough: ${title}`;
  }

  return title;
}

/**
 * Field-specific opening lines in the Pratchett/Adams/Gaiman style
 */
const FIELD_OPENING_LINES: Record<ResearchField, string[]> = {
  agriculture: [
    'The thing about plants is that they grow whether or not you understand why.',
    'Farmers have known this for ten thousand years. Researchers discovered it last Thursday.',
    'Seeds, like academics, require the right conditions to flourish and will die spectacularly if ignored.',
  ],
  construction: [
    'Buildings, unlike arguments, must stand up to scrutiny in the most literal sense.',
    'The difference between a wall and a theory is that walls, occasionally, hold up.',
    'It has long been known that things fall down. The trick is making them stop.',
  ],
  crafting: [
    'The art of making things is the art of pretending you meant to do that.',
    'Craftsmanship is the noble pursuit of making the same mistake until it becomes a feature.',
    'To craft is to argue with raw materials until they see reason.',
  ],
  metallurgy: [
    'Metal remembers the fire that made it. So do metallurgists, usually with minor burns.',
    'The ancients understood metallurgy intuitively. We understand it with grants.',
    'Heat, pressure, and time will change anything. The question is whether you have enough of all three.',
  ],
  alchemy: [
    'Alchemy is the pursuit of turning one thing into another, which is also the job description of a chef, but with more explosions.',
    'The line between alchemy and chemistry is drawn by whoever funded the experiment.',
    'Everything is made of something else. Alchemists simply take this more personally.',
  ],
  textiles: [
    'Thread, like narrative, gains strength when twisted together.',
    'The first garment was worn to keep warm. Every one since has been a statement.',
    'Fabric remembers every stress placed upon it, much like researchers remember rejections.',
  ],
  cuisine: [
    'Cooking is alchemy for people who prefer edible explosions.',
    'The secret ingredient is usually time, patience, or lying about how much butter you used.',
    'Fermentation is just controlled rot, which could be said of most academic careers.',
  ],
  machinery: [
    'Machines work because they must. They break because they can.',
    'The mechanical universe is elegant, efficient, and will trap your fingers if given the chance.',
    'Every machine is a argument made of gears about how the world should work.',
  ],
  nature: [
    'Nature is that which is indifferent to human plans while remaining exquisitely sensitive to human interference.',
    'Ecosystems are like committees: remove one member and everything works differently, though not always worse.',
    'Evolution has had four billion years to figure things out. We have had a grant period.',
  ],
  society: [
    'Humans, when gathered in groups, behave in ways no individual human would consider reasonable.',
    'Society is what happens when everyone agrees to pretend the same things are real.',
    'The study of society is the study of people doing exactly what they say they do not do.',
  ],
  arcane: [
    'Magic, like bureaucracy, follows rules that make sense only to those who invented them.',
    'The fundamental force of the universe is either love, gravity, or spite, depending on the experiment.',
    'Spellwork is the art of asking the universe politely and being prepared for a rude answer.',
  ],
  experimental: [
    'The edge of knowledge is always further away than it appears on the map.',
    'This is the kind of research that makes other researchers say "wait, you can do that?"',
    'Discovery is what happens when you run out of things that make sense.',
  ],
  genetics: [
    'DNA is a four-letter word for "it\'s complicated."',
    'Genes are instructions written in a language that changes meaning depending on who reads them.',
    'Life is a self-replicating error that got very good at making errors.',
  ],
  spaceflight: [
    'β-space navigation proves that feelings can indeed be measured—though perhaps they shouldn\'t be.',
    'The Heart chamber synchronizes emotions; getting the crew to agree on lunch remains unsolved.',
    'Emotional coherence is required for jumps. Emotional maturity remains optional.',
  ],
};

function generateAbstract(
  field: ResearchField,
  researchName: string,
  citations: string[],
  paperManager: AcademicPaperManager
): string {
  const citationCount = citations.length;
  const citedWorks =
    citationCount > 0
      ? citations
          .slice(0, 3)
          .map((id) => {
            const paper = paperManager.getPaper(id);
            return paper ? paper.firstAuthorName : 'Unknown';
          })
          .join(', ')
      : '';

  // Choose opening style based on paper characteristics
  const useFieldOpening = Math.random() > 0.5;
  const useFunnyPhrase = Math.random() > 0.6;

  const openingLines = FIELD_OPENING_LINES[field] || FIELD_OPENING_LINES.experimental;
  const opening = useFieldOpening
    ? openingLines[Math.floor(Math.random() * openingLines.length)]
    : '';

  const funnyPhrase = useFunnyPhrase
    ? FUNNY_ABSTRACT_PHRASES[Math.floor(Math.random() * FUNNY_ABSTRACT_PHRASES.length)]
    : '';

  const citationPhrase =
    citationCount > 0
      ? `Building upon the foundational work of ${citedWorks}${citationCount > 3 ? ' et al.' : ''}, `
      : '';

  // Construct abstract with varying style
  if (opening && funnyPhrase) {
    return (
      `${opening} ${citationPhrase}this paper presents advances in ${researchName}. ` +
      `${funnyPhrase} Through experimentation in the field of ${field}, we extend ` +
      `current understanding in ways that will surely be misinterpreted by future researchers.`
    );
  } else if (opening) {
    return (
      `${opening} ${citationPhrase}this paper examines ${researchName} with the rigor ` +
      `of those who know their conclusions will be questioned. Our findings suggest ` +
      `that ${field} is exactly as complicated as previously suspected, if not more so.`
    );
  } else if (funnyPhrase) {
    return (
      `${citationPhrase}${funnyPhrase} In the field of ${researchName}, we demonstrate ` +
      `novel approaches that extend current understanding and open new avenues for ` +
      `future research, grant applications, and inevitable disagreements.`
    );
  } else {
    return (
      `${citationPhrase}This paper presents significant advances in ${researchName}. ` +
      `Through rigorous experimentation in the field of ${field}, we demonstrate novel approaches ` +
      `that extend current understanding and open new avenues for future research.`
    );
  }
}

// =============================================================================
// PAPERS REQUIRED CALCULATOR
// =============================================================================

function calculatePapersRequired(tier: number): number {
  // Tier 1: 2 papers, Tier 2: 3 papers, ... Tier 8: 9 papers
  return tier + 1;
}

// =============================================================================
// ACADEMIC PAPER MANAGER
// =============================================================================

export class AcademicPaperManager {
  private papers: Map<string, AcademicPaper> = new Map();
  private authors: Map<string, Author> = new Map();
  private bibliographies: Map<string, ResearchBibliography> = new Map();
  private citationEvents: CitationEvent[] = [];
  private registry: ResearchRegistry;

  constructor() {
    this.registry = ResearchRegistry.getInstance();
  }

  // ---------------------------------------------------------------------------
  // Paper Publication
  // ---------------------------------------------------------------------------

  /**
   * Publish a paper contributing to a research project.
   * Returns the new paper and whether this completes the research.
   */
  publishPaper(
    researchId: string,
    firstAuthorId: string,
    firstAuthorName: string,
    coAuthorIds: string[],
    coAuthorNames: string[],
    currentTick: number,
    isBreakthrough: boolean = false
  ): { paper: AcademicPaper; researchComplete: boolean } {
    const research = this.registry.tryGet(researchId);
    if (!research) {
      throw new Error(`Research not found: ${researchId}`);
    }

    // Get or create bibliography
    let bibliography = this.bibliographies.get(researchId);
    if (!bibliography) {
      bibliography = {
        researchId,
        researchName: research.name,
        papers: [],
        papersRequired: calculatePapersRequired(research.tier),
        isComplete: false,
        leadResearcherId: firstAuthorId,
        contributorIds: [],
      };
      this.bibliographies.set(researchId, bibliography);
    }

    // Add contributors
    for (const coAuthorId of coAuthorIds) {
      if (!bibliography.contributorIds.includes(coAuthorId)) {
        bibliography.contributorIds.push(coAuthorId);
      }
    }

    // Find papers to cite (prerequisite research papers)
    const citations = this.findCitablePapers(research, bibliography.papers.length);

    // Generate paper
    const paperNumber = bibliography.papers.length + 1;
    const paper: AcademicPaper = {
      id: `paper_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: generatePaperTitle(
        research.field,
        research.name,
        paperNumber,
        isBreakthrough
      ),
      abstract: generateAbstract(research.field, research.name, citations, this),
      firstAuthorId,
      firstAuthorName,
      coAuthorIds,
      coAuthorNames,
      researchId,
      researchName: research.name,
      field: research.field,
      tier: research.tier,
      citations,
      citedByCount: 0,
      citedBy: [],
      publishedAt: currentTick,
      lastCitedAt: 0,
      significance: this.calculateSignificance(research.tier, isBreakthrough),
      isBreakthrough,
      isSeminal: paperNumber === 1 && research.tier >= 4,
    };

    // Store paper
    this.papers.set(paper.id, paper);
    bibliography.papers.push(paper.id);

    // Update cited papers
    for (const citedPaperId of citations) {
      const citedPaper = this.papers.get(citedPaperId);
      if (citedPaper) {
        citedPaper.citedByCount++;
        citedPaper.citedBy.push(paper.id);
        citedPaper.lastCitedAt = currentTick;

        // Record citation event
        this.citationEvents.push({
          citingPaperId: paper.id,
          citedPaperId,
          citingAuthorId: firstAuthorId,
          citedAuthorId: citedPaper.firstAuthorId,
          timestamp: currentTick,
        });

        // Update cited author's metrics
        this.updateAuthorCitations(citedPaper.firstAuthorId);
      }
    }

    // Update all authors
    this.updateAuthor(
      firstAuthorId,
      firstAuthorName,
      paper.id,
      true,
      research.field,
      currentTick,
      coAuthorIds
    );

    for (let i = 0; i < coAuthorIds.length; i++) {
      this.updateAuthor(
        coAuthorIds[i]!,
        coAuthorNames[i] || 'Unknown',
        paper.id,
        false,
        research.field,
        currentTick,
        [firstAuthorId, ...coAuthorIds.filter((id) => id !== coAuthorIds[i])]
      );
    }

    // Check if research is complete
    const researchComplete =
      bibliography.papers.length >= bibliography.papersRequired;
    if (researchComplete && !bibliography.isComplete) {
      bibliography.isComplete = true;
      bibliography.completedAt = currentTick;
    }

    return { paper, researchComplete };
  }

  private findCitablePapers(
    research: ResearchDefinition,
    currentPaperCount: number
  ): string[] {
    const citations: string[] = [];
    const maxCitations = 5;

    // First, cite prerequisite research papers
    for (const prereqId of research.prerequisites) {
      const prereqBib = this.bibliographies.get(prereqId);
      if (prereqBib && prereqBib.papers.length > 0) {
        // Cite the most significant papers from prerequisites
        const prereqPapers = prereqBib.papers
          .map((id) => this.papers.get(id))
          .filter((p): p is AcademicPaper => p !== undefined)
          .sort((a, b) => b.significance - a.significance);

        for (const prereqPaper of prereqPapers.slice(0, 2)) {
          if (citations.length < maxCitations) {
            citations.push(prereqPaper.id);
          }
        }
      }
    }

    // Then cite own previous papers in this research
    const ownBib = this.bibliographies.get(research.id);
    if (ownBib && currentPaperCount > 0) {
      // Cite the previous paper in the series
      const prevPaperId = ownBib.papers[currentPaperCount - 1];
      if (prevPaperId && !citations.includes(prevPaperId)) {
        citations.push(prevPaperId);
      }
    }

    // Finally, cite highly-cited papers in the same field
    const fieldPapers = Array.from(this.papers.values())
      .filter(
        (p) =>
          p.field === research.field &&
          p.researchId !== research.id &&
          !citations.includes(p.id)
      )
      .sort((a, b) => b.citedByCount - a.citedByCount)
      .slice(0, maxCitations - citations.length);

    for (const paper of fieldPapers) {
      citations.push(paper.id);
    }

    return citations;
  }

  private calculateSignificance(tier: number, isBreakthrough: boolean): number {
    const baseSignificance = tier * 10;
    const breakthroughBonus = isBreakthrough ? 30 : 0;
    return Math.min(100, baseSignificance + breakthroughBonus);
  }

  // ---------------------------------------------------------------------------
  // Author Management
  // ---------------------------------------------------------------------------

  private updateAuthor(
    agentId: string,
    name: string,
    paperId: string,
    isFirstAuthor: boolean,
    field: ResearchField,
    currentTick: number,
    coAuthorIds: string[]
  ): void {
    let author = this.authors.get(agentId);

    if (!author) {
      author = {
        agentId,
        name,
        papers: [],
        papersAsFirstAuthor: [],
        papersAsCoAuthor: [],
        totalCitations: 0,
        hIndex: 0,
        i10Index: 0,
        coAuthors: new Map(),
        mentees: [],
        mentors: [],
        primaryField: null,
        fieldsPublishedIn: new Set(),
        citationsByField: new Map(),
        mostCitedPaper: null,
        breakthroughPapers: [],
        firstPublicationAt: currentTick,
        lastPublicationAt: currentTick,
        yearsActive: 0,
      };
      this.authors.set(agentId, author);
    }

    // Update paper lists
    author.papers.push(paperId);
    if (isFirstAuthor) {
      author.papersAsFirstAuthor.push(paperId);
    } else {
      author.papersAsCoAuthor.push(paperId);
    }

    // Update fields
    author.fieldsPublishedIn.add(field);
    author.lastPublicationAt = currentTick;

    // Update primary field (most papers)
    const fieldCounts = new Map<ResearchField, number>();
    for (const pid of author.papers) {
      const paper = this.papers.get(pid);
      if (paper) {
        fieldCounts.set(paper.field, (fieldCounts.get(paper.field) || 0) + 1);
      }
    }
    let maxCount = 0;
    for (const [f, count] of fieldCounts) {
      if (count > maxCount) {
        maxCount = count;
        author.primaryField = f;
      }
    }

    // Update co-author relationships
    for (const coAuthorId of coAuthorIds) {
      const count = author.coAuthors.get(coAuthorId) || 0;
      author.coAuthors.set(coAuthorId, count + 1);

      // Mentor/mentee relationship
      const coAuthor = this.authors.get(coAuthorId);
      if (coAuthor) {
        if (
          author.papers.length > coAuthor.papers.length * 2 &&
          !author.mentees.includes(coAuthorId)
        ) {
          author.mentees.push(coAuthorId);
        }
        if (
          coAuthor.papers.length > author.papers.length * 2 &&
          !author.mentors.includes(coAuthorId)
        ) {
          author.mentors.push(coAuthorId);
        }
      }
    }

    // Check for breakthrough
    const paper = this.papers.get(paperId);
    if (paper?.isBreakthrough) {
      author.breakthroughPapers.push(paperId);
    }

    // Recalculate h-index
    this.recalculateHIndex(author);
  }

  private updateAuthorCitations(authorId: string): void {
    const author = this.authors.get(authorId);
    if (!author) return;

    // Recalculate total citations
    let totalCitations = 0;
    let mostCited: AcademicPaper | null = null;
    let maxCitations = 0;

    for (const paperId of author.papers) {
      const paper = this.papers.get(paperId);
      if (paper) {
        totalCitations += paper.citedByCount;
        if (paper.citedByCount > maxCitations) {
          maxCitations = paper.citedByCount;
          mostCited = paper;
        }
      }
    }

    author.totalCitations = totalCitations;
    author.mostCitedPaper = mostCited?.id || null;

    // Recalculate h-index and i10
    this.recalculateHIndex(author);
  }

  private recalculateHIndex(author: Author): void {
    // Get citation counts for all papers
    const citationCounts = author.papers
      .map((pid) => this.papers.get(pid)?.citedByCount || 0)
      .sort((a, b) => b - a);

    // Calculate h-index
    let h = 0;
    for (let i = 0; i < citationCounts.length; i++) {
      if (citationCounts[i]! >= i + 1) {
        h = i + 1;
      } else {
        break;
      }
    }
    author.hIndex = h;

    // Calculate i10-index
    author.i10Index = citationCounts.filter((c) => c >= 10).length;
  }

  // ---------------------------------------------------------------------------
  // Queries
  // ---------------------------------------------------------------------------

  getPaper(paperId: string): AcademicPaper | undefined {
    return this.papers.get(paperId);
  }

  getAuthor(authorId: string): Author | undefined {
    return this.authors.get(authorId);
  }

  getBibliography(researchId: string): ResearchBibliography | undefined {
    return this.bibliographies.get(researchId);
  }

  getResearchProgress(researchId: string): {
    papersPublished: number;
    papersRequired: number;
    percentComplete: number;
  } {
    const bib = this.bibliographies.get(researchId);
    if (!bib) {
      const research = this.registry.tryGet(researchId);
      const required = research ? calculatePapersRequired(research.tier) : 5;
      return { papersPublished: 0, papersRequired: required, percentComplete: 0 };
    }

    return {
      papersPublished: bib.papers.length,
      papersRequired: bib.papersRequired,
      percentComplete: (bib.papers.length / bib.papersRequired) * 100,
    };
  }

  getTopAuthors(limit: number = 10): Author[] {
    return Array.from(this.authors.values())
      .sort((a, b) => {
        // Sort by h-index, then total citations, then paper count
        if (b.hIndex !== a.hIndex) return b.hIndex - a.hIndex;
        if (b.totalCitations !== a.totalCitations)
          return b.totalCitations - a.totalCitations;
        return b.papers.length - a.papers.length;
      })
      .slice(0, limit);
  }

  getMostCitedPapers(limit: number = 10): AcademicPaper[] {
    return Array.from(this.papers.values())
      .sort((a, b) => b.citedByCount - a.citedByCount)
      .slice(0, limit);
  }

  getPapersByAuthor(authorId: string): AcademicPaper[] {
    const author = this.authors.get(authorId);
    if (!author) return [];

    return author.papers
      .map((id) => this.papers.get(id))
      .filter((p): p is AcademicPaper => p !== undefined);
  }

  getPapersByField(field: ResearchField): AcademicPaper[] {
    return Array.from(this.papers.values()).filter((p) => p.field === field);
  }

  getRecentCitations(limit: number = 20): CitationEvent[] {
    return this.citationEvents.slice(-limit).reverse();
  }

  // ---------------------------------------------------------------------------
  // Stats
  // ---------------------------------------------------------------------------

  getStats(): {
    totalPapers: number;
    totalAuthors: number;
    totalCitations: number;
    averageCitations: number;
    completedResearch: number;
    papersByField: Record<string, number>;
    averageHIndex: number;
  } {
    const papers = Array.from(this.papers.values());
    const authors = Array.from(this.authors.values());

    const totalCitations = papers.reduce((sum, p) => sum + p.citedByCount, 0);
    const avgCitations = papers.length > 0 ? totalCitations / papers.length : 0;

    const papersByField: Record<string, number> = {};
    for (const paper of papers) {
      papersByField[paper.field] = (papersByField[paper.field] || 0) + 1;
    }

    const completedResearch = Array.from(this.bibliographies.values()).filter(
      (b) => b.isComplete
    ).length;

    const avgHIndex =
      authors.length > 0
        ? authors.reduce((sum, a) => sum + a.hIndex, 0) / authors.length
        : 0;

    return {
      totalPapers: papers.length,
      totalAuthors: authors.length,
      totalCitations,
      averageCitations: Math.round(avgCitations * 100) / 100,
      completedResearch,
      papersByField,
      averageHIndex: Math.round(avgHIndex * 100) / 100,
    };
  }

  // ---------------------------------------------------------------------------
  // Reset
  // ---------------------------------------------------------------------------

  reset(): void {
    this.papers.clear();
    this.authors.clear();
    this.bibliographies.clear();
    this.citationEvents = [];
  }
}

// =============================================================================
// ACADEMIC PAPER SYSTEM
// =============================================================================

export class AcademicPaperSystem extends BaseSystem {
  readonly id = 'AcademicPaperSystem';
  readonly priority = 56; // Between ResearchSystem (55) and InventorFameSystem (54)
  readonly requiredComponents = [] as const;
  protected readonly throttleInterval = 200; // VERY_SLOW - 10 seconds for paper processing

  private manager: AcademicPaperManager = new AcademicPaperManager();
  private tickCounter = 0;

  protected async onInitialize(_world: World, eventBus: EventBus): Promise<void> {

    // Subscribe to research progress events
    this.events.onGeneric('research:progress', (data: unknown) => {
      const eventData = data as {
        researchId?: string;
        progress?: number;
        researchers?: string[];
      };
      if (eventData.researchId && eventData.researchers && eventData.researchers.length > 0) {
        this.handleResearchProgress(eventData.researchId, eventData.researchers);
      }
    });
  }

  private handleResearchProgress(
    _researchId: string,
    _researchers: string[]
  ): void {
    // For now, papers are published via explicit calls to publishPaper()
    // This handler can be expanded to auto-publish based on progress milestones
  }

  protected onUpdate(ctx: SystemContext): void {
    this.tickCounter++;
    // Periodic updates if needed
  }

  protected onCleanup(): void {
    this.manager.reset();
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  getManager(): AcademicPaperManager {
    return this.manager;
  }

  /**
   * Publish a paper for a research project.
   * Call this when researchers make a significant contribution.
   */
  publishPaper(
    researchId: string,
    firstAuthorId: string,
    firstAuthorName: string,
    coAuthorIds: string[] = [],
    coAuthorNames: string[] = [],
    isBreakthrough: boolean = false
  ): { paper: AcademicPaper; researchComplete: boolean } {
    const result = this.manager.publishPaper(
      researchId,
      firstAuthorId,
      firstAuthorName,
      coAuthorIds,
      coAuthorNames,
      this.tickCounter,
      isBreakthrough
    );

    // Emit paper published event
    this.events.emitGeneric('paper:published', {
      paperId: result.paper.id,
      title: result.paper.title,
      firstAuthor: firstAuthorName,
      coAuthors: coAuthorNames,
      researchId,
      tier: result.paper.tier,
      citationCount: result.paper.citations.length,
      isBreakthrough,
    });

    // Emit citation events
    for (const citedPaperId of result.paper.citations) {
      const citedPaper = this.manager.getPaper(citedPaperId);
      if (citedPaper) {
        this.events.emitGeneric('paper:cited', {
          citingPaperId: result.paper.id,
          citedPaperId,
          citedAuthorId: citedPaper.firstAuthorId,
          citedAuthorName: citedPaper.firstAuthorName,
        });
      }
    }

    // If research complete, emit completion event
    if (result.researchComplete) {
      const bib = this.manager.getBibliography(researchId);
      this.events.emitGeneric('research:completed', {
        researchId,
        researchers: [firstAuthorId, ...coAuthorIds],
        paperCount: bib?.papers.length || 0,
      });
    }

    return result;
  }

  /**
   * Get author metrics for fame calculation
   */
  getAuthorMetrics(authorId: string): {
    hIndex: number;
    totalCitations: number;
    paperCount: number;
    firstAuthorCount: number;
    breakthroughCount: number;
  } | null {
    const author = this.manager.getAuthor(authorId);
    if (!author) return null;

    return {
      hIndex: author.hIndex,
      totalCitations: author.totalCitations,
      paperCount: author.papers.length,
      firstAuthorCount: author.papersAsFirstAuthor.length,
      breakthroughCount: author.breakthroughPapers.length,
    };
  }
}

// =============================================================================
// SINGLETON
// =============================================================================

let systemInstance: AcademicPaperSystem | null = null;

export function getAcademicPaperSystem(): AcademicPaperSystem {
  if (!systemInstance) {
    systemInstance = new AcademicPaperSystem();
  }
  return systemInstance;
}

export function resetAcademicPaperSystem(): void {
  if (systemInstance) {
    systemInstance.cleanup();
    systemInstance = null;
  }
}
