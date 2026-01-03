import type { ResearchPaper } from './types.js';

/**
 * Publishing & Library Research Papers
 *
 * Papers that unlock the knowledge infrastructure:
 * - Libraries, bookstores, university libraries
 * - Printing presses, printing companies
 * - Academic journals, biographies
 */

// ============================================================================
// TIER 1: WRITING & LIBRARIES (Ancient/Medieval)
// ============================================================================

export const MANUSCRIPT_PRESERVATION: ResearchPaper = {
  paperId: 'manuscript_preservation',
  title: 'On the Preservation of Written Knowledge',
  field: 'society',
  paperSets: ['writing_systems', 'library_science'],
  prerequisitePapers: [],
  complexity: 2,
  minimumAge: 'teen',
  skillGrants: { society: 5, library_science: 10 },
  //   contributesTo: [
  //     { setId: 'writing_systems', technologyId: 'public_libraries' }
  //   ],
  description: `A treatise on protecting manuscripts from decay, moisture, pests, and fire*.

*The most feared enemy of knowledge. Ancient libraries have been lost to flames more often than to ignorance, though the two are closely related**.

**Some argue that burning a library is the ultimate act of ignorance, but this seems circular.`,
  abstract: 'Methods for long-term storage and protection of written materials including climate control, pest prevention, and fire safety.',
  published: false
};

export const LIBRARY_ORGANIZATION: ResearchPaper = {
  paperId: 'library_organization',
  title: 'Systematic Cataloging and the Organization of Knowledge',
  field: 'society',
  paperSets: ['writing_systems', 'library_science'],
  prerequisitePapers: ['manuscript_preservation'],
  complexity: 3,
  minimumAge: 'teen',
  skillGrants: { society: 8, library_science: 15 },
  //   contributesTo: [
  //     { setId: 'writing_systems', technologyId: 'public_libraries' }
  //   ],
  description: `Without organization, a library is merely a pile of books in a building*. This work proposes systematic methods for categorization, including:

- Arrangement by subject matter
- Author indexing
- Cross-referencing systems
- The controversial "numerical classification scheme"**

*Technically true of any collection exceeding seven manuscripts, according to extensive research involving seventeen librarians and one very patient abacus.

**Later generations would call this the "Dewey Decimal System," though Dewey had not yet been decimal, or indeed, born.`,
  abstract: 'Comprehensive system for organizing written materials by subject, author, and cross-references.',
  published: false
};

export const SCRIBE_TRAINING: ResearchPaper = {
  paperId: 'scribe_training',
  title: 'The Art of Manual Transcription: A Scribe\'s Guide',
  field: 'society',
  paperSets: ['writing_systems', 'manuscript_production'],
  prerequisitePapers: [],
  complexity: 2,
  minimumAge: 'teen',
  skillGrants: { society: 5, calligraphy: 10 },
  //   contributesTo: [
  //     { setId: 'manuscript_production', technologyId: 'scribe_workshops' }
  //   ],
  description: `Copying manuscripts by hand requires more than literacy. It demands:

- Steady hands (preferably two)
- Endless patience*
- Resistance to eyestrain
- The ability to work by candlelight**
- Immunity to boredom†

*One senior scribe reports achieving "endless patience" after only forty-seven years of practice.

**Causes of eyestrain. Candles are not helpful.

†No scribe in recorded history has achieved this. The goal remains aspirational.`,
  abstract: 'Training methodology for professional scribes including penmanship, accuracy verification, and error prevention.',
  published: false
};

export const INK_PRODUCTION: ResearchPaper = {
  paperId: 'ink_production',
  title: 'Permanent Inks: Chemistry of Longevity',
  field: 'alchemy',
  paperSets: ['writing_systems', 'manuscript_production'],
  prerequisitePapers: [],
  complexity: 3,
  minimumAge: 'teen',
  skillGrants: { alchemy: 10, society: 3 },
  //   contributesTo: [
  //     { setId: 'manuscript_production', technologyId: 'scribe_workshops' }
  //   ],
  description: `Not all inks are created equal. Some fade within years, rendering precious manuscripts unreadable*. This research identifies formulations that resist:

- Fading from light exposure
- Degradation from moisture
- Chemical breakdown over centuries

The iron gall ink formula presented herein has been tested for durability and found acceptable for the next thousand years**.

*A tragedy discovered by monks who spent decades copying texts that would become illegible before the copier died. Several career changes resulted.

**Testing methodology: "We wrote something, waited a year, and it's still there. Seems promising."`,
  abstract: 'Chemical formulations for permanent iron gall ink resistant to fading and degradation.',
  published: false
};

// ============================================================================
// TIER 2: BINDING & BOOKMAKING (Medieval/Renaissance)
// ============================================================================

export const BINDING_TECHNIQUES: ResearchPaper = {
  paperId: 'binding_techniques',
  title: 'The Bound Codex: Superior to Scrolls in Every Way',
  field: 'society',
  paperSets: ['bookmaking', 'manuscript_production'],
  prerequisitePapers: ['manuscript_preservation'],
  complexity: 4,
  minimumAge: 'teen',
  skillGrants: { society: 10, crafting: 8 },
  //   contributesTo: [
  //     { setId: 'bookmaking', technologyId: 'binder_workshops' }
  //   ],
  description: `The scroll is dead. Long live the codex!*

Advantages of bound books over scrolls:
- Random access to any page**
- Compact storage (both sides of page used)
- Durability (covers protect contents)
- Can be held in one hand†

This paper describes string binding, leather covers, and the revolutionary "spine."

*Scrolls continue to be produced, suggesting this declaration was premature.

**Revolutionary concept: You can open a book to page 47 without first passing pages 1-46. Scroll manufacturers deeply concerned.

†The other hand free for ale. This is not mentioned in the academic literature but appears frequently in marginalia.`,
  abstract: 'Comprehensive guide to book binding including signatures, sewing, covers, and spine construction.',
  published: false
};

export const PAPER_PRODUCTION: ResearchPaper = {
  paperId: 'paper_production',
  title: 'From Rags to Riches: The Mass Production of Paper',
  field: 'machinery',
  paperSets: ['bookmaking', 'printing_technology'],
  prerequisitePapers: [],
  complexity: 4,
  minimumAge: 'adult',
  skillGrants: { machinery: 12, society: 5 },
  //   contributesTo: [
  //     { setId: 'printing_technology', technologyId: 'printing_press_device' }
  //   ],
  description: `Parchment is expensive. Paper is cheap*. This fundamental economic fact will revolutionize the written word.

The paper-making process:
1. Collect rags (cotton, linen)
2. Pulp into fiber slurry**
3. Form sheets on wire screens
4. Press and dry
5. Achieve literacy for the masses†

*Relatively speaking. Still costs more than not having paper.

**The most important step, according to mill workers who spend eight hours daily operating the pulping mallets. Their opinions on other steps were deemed "too colorful" for academic publication.

†Optimistic projection. Literacy rates did not, in fact, immediately skyrocket. The paper sat unused for a surprisingly long time.`,
  abstract: 'Industrial process for producing paper from textile fibers using pulping, forming, and pressing techniques.',
  published: false
};

// ============================================================================
// TIER 3: PRINTING PRESS (Renaissance)
// ============================================================================

export const MOVABLE_TYPE: ResearchPaper = {
  paperId: 'movable_type',
  title: 'Movable Type: The Death of the Scribe',
  field: 'machinery',
  paperSets: ['printing_technology'],
  prerequisitePapers: ['paper_production'],
  complexity: 6,
  minimumAge: 'adult',
  skillGrants: { machinery: 20, society: 10 },
  //   contributesTo: [
  //     { setId: 'printing_technology', technologyId: 'printing_press_device' }
  //   ],
  description: `Individual metal letters that can be arranged, inked, and pressed upon paper. Repeatedly. It seems almost too simple*, yet this invention will end an entire profession**.

Each letter cast in lead alloy:
- Durable for thousands of impressions
- Reusable in infinite combinations
- Faster than any scribe†
- Uniform (no handwriting variance)

*The scribes' guild initially dismissed the invention as "unnecessarily complicated quill work."

**The Scribe's Guild was not pleased. Strongly worded scrolls were issued. Ironically, these were later mass-produced by printing press for wider distribution.

†Ten times faster, according to careful measurements. One hundred times faster, according to printing press salesmen.`,
  abstract: 'Design and metallurgy of reusable movable type including letter casting, composition, and durability.',
  published: false
};

export const PRINTING_PRESS_MECHANICS: ResearchPaper = {
  paperId: 'printing_press_mechanics',
  title: 'The Mechanical Press: Harnessing Pressure for Production',
  field: 'machinery',
  paperSets: ['printing_technology'],
  prerequisitePapers: ['movable_type'],
  complexity: 7,
  minimumAge: 'adult',
  minimumSkills: { machinery: 15 },
  skillGrants: { machinery: 25, society: 8 },
  //   contributesTo: [
  //     { setId: 'printing_technology', technologyId: 'printing_press_device' }
  //   ],
  description: `The screw press, previously used for wine and olives*, now revolutionizes knowledge distribution.

Key innovations:
- Even pressure distribution across page
- Adjustable for paper thickness
- Rapid ink transfer
- Repeatable results**

A single press can produce 3,600 pages per day. A scribe produces perhaps four.

*Wine makers concerned about reputational damage from association with books. "Books don't get you drunk," one vintner noted. "What's the point?"

**"Repeatable" defined as "mostly the same." Early quality control was... optimistic.`,
  abstract: 'Engineering design of the printing press including pressure mechanisms, ink distribution, and operational procedures.',
  published: false
};

// ============================================================================
// TIER 4: PRINTING COMPANIES & PUBLISHING (Early Modern)
// ============================================================================

export const MASS_PRODUCTION_THEORY: ResearchPaper = {
  paperId: 'mass_production_theory',
  title: 'Economies of Scale in Book Production',
  field: 'society',
  paperSets: ['publishing_industry'],
  prerequisitePapers: ['printing_press_mechanics'],
  complexity: 6,
  minimumAge: 'adult',
  skillGrants: { society: 18, economics: 12 },
  //   contributesTo: [
  //     { setId: 'publishing_industry', technologyId: 'printing_companies' }
  //   ],
  description: `One printing press is useful. Ten printing presses working in concert is transformative*.

This paper introduces:
- Economies of scale (cost per book decreases with volume)
- Parallel production (multiple presses, one book)
- Distribution networks (getting books to readers)
- The concept of "bestsellers"**

*Unless they're all printing different books, in which case it's just ten useful presses. Coordination matters.

**Initially a shipping term referring to books that sold before leaving the warehouse. Later adopted for marketing purposes with significantly reduced accuracy.`,
  abstract: 'Economic analysis of large-scale book production including cost structures, distribution, and market dynamics.',
  published: false
};

export const PUBLISHING_BUSINESS: ResearchPaper = {
  paperId: 'publishing_business',
  title: 'The Publishing House: A Business Model for Knowledge',
  field: 'society',
  paperSets: ['publishing_industry'],
  prerequisitePapers: ['mass_production_theory'],
  complexity: 7,
  minimumAge: 'adult',
  minimumSkills: { society: 20, economics: 10 },
  skillGrants: { society: 22, economics: 15 },
  //   contributesTo: [
  //     { setId: 'publishing_industry', technologyId: 'printing_companies' }
  //   ],
  description: `Publishing is more than printing. It requires:

- Author acquisition* (finding writers)
- Manuscript evaluation** (choosing what to print)
- Capital investment (presses are expensive)
- Distribution channels
- Marketing† (convincing people to buy)
- Inventory management

The modern publishing house integrates all functions under one roof. Preferably a large roof.

*"Acquisition" sounds better than "persuading authors to accept insulting payment terms." Both are accurate.

**The rejection letter was invented during this era. Its format ("We regret to inform you...") remains unchanged to this day.

†Early marketing consisted of shouting book titles in the marketplace. Surprisingly effective, though hard on the voice.`,
  abstract: 'Comprehensive business model for publishing houses including operations, economics, and organizational structure.',
  published: false
};

export const BOOKSTORE_ECONOMICS: ResearchPaper = {
  paperId: 'bookstore_economics',
  title: 'Retail Distribution of Knowledge: The Bookstore Model',
  field: 'society',
  paperSets: ['publishing_industry'],
  prerequisitePapers: ['mass_production_theory'],
  complexity: 5,
  minimumAge: 'adult',
  skillGrants: { society: 15, economics: 12 },
  //   contributesTo: [
  //     { setId: 'publishing_industry', technologyId: 'bookstores' }
  //   ],
  description: `Books are products. Bookstores are shops. Simple, yet revolutionary*.

The bookstore model:
- Inventory management (stock popular titles)
- Customer browsing** (let them touch books!)
- Special orders (any book, on demand)
- Bestseller displays†
- Coffee shops‡

*Previous distribution: monasteries and extremely patient scribes. Market penetration was limited.

**Revolutionary concept: Customers may examine merchandise before purchase. Other industries watching nervously.

†Circular logic: Popular books displayed prominently, becoming more popular, justifying prominence. Publishers delighted. Logic purists appalled.

‡This addition came later but proved surprisingly essential to the business model. No one knows why.`,
  abstract: 'Business model for retail book sales including inventory, customer service, and special ordering.',
  published: false
};

// ============================================================================
// TIER 5: ACADEMIC JOURNALS (Enlightenment)
// ============================================================================

export const PEER_REVIEW_SYSTEM: ResearchPaper = {
  paperId: 'peer_review_system',
  title: 'Quality Control Through Collective Skepticism',
  field: 'society',
  paperSets: ['academic_publishing'],
  prerequisitePapers: ['publishing_business'],
  complexity: 7,
  minimumAge: 'adult',
  minimumSkills: { society: 25 },
  skillGrants: { society: 20, critical_thinking: 15 },
  //   contributesTo: [
  //     { setId: 'academic_publishing', technologyId: 'academic_journals' }
  //   ],
  description: `Not all research is created equal*. Peer review filters truth from nonsense**.

The process:
1. Author submits paper to journal
2. Editor sends to expert reviewers
3. Reviewers tear paper apart†
4. Author revises (or gives up)
5. Repeat until acceptable‡

Result: Higher quality published research, fewer embarrassing retractions, bitter academic feuds.

*Though all researchers believe their own work to be exceptional. Peer review corrects this delusion.

**In theory. In practice, peer review occasionally mistakes nonsense for truth and truth for nonsense. The system is imperfect but better than alternatives.

†Professional term: "constructive criticism." Actual content: "This is fundamentally flawed in ways that should have been obvious to a reasonably intelligent undergraduate."

‡"Acceptable" defined as "the reviewers are too exhausted to suggest further changes."`,
  abstract: 'System for quality control in academic publishing through expert review and revision.',
  published: false
};

export const ACADEMIC_PUBLISHING: ResearchPaper = {
  paperId: 'academic_publishing',
  title: 'The Academic Journal: Organizing Scientific Progress',
  field: 'society',
  paperSets: ['academic_publishing'],
  prerequisitePapers: ['peer_review_system', 'library_organization'],
  complexity: 8,
  minimumAge: 'adult',
  minimumSkills: { society: 30 },
  skillGrants: { society: 25, research: 20 },
  //   contributesTo: [
  //     { setId: 'academic_publishing', technologyId: 'academic_journals' }
  //   ],
  description: `Science needs infrastructure. The academic journal provides:

- Regular publication schedule* (monthly, quarterly)
- Field organization (one journal per discipline)
- Archival permanence**
- Citation tracking†
- Academic prestige‡

Without journals, science is conversation. With journals, science is cumulative progress.

*Theoretical. Journals frequently run late. "Quarterly" becomes "whenever we feel like it" more often than editorial boards care to admit.

**Assuming libraries don't burn down. This assumption has been violated more times than is comfortable.

†Who cited whom becomes a competitive sport. Citations are academic currency. Citation counting is undignified but universal.

‡Publications in prestigious journals advance careers. Publications in lesser journals also advance careers, just slower. The hierarchy is strict and arbitrary in equal measure.`,
  abstract: 'Comprehensive system for academic publishing including peer review, archiving, and citation standards.',
  published: false
};

export const JOURNAL_DISTRIBUTION: ResearchPaper = {
  paperId: 'journal_distribution',
  title: 'Subscription Networks and the Distribution of Scholarly Work',
  field: 'society',
  paperSets: ['academic_publishing'],
  prerequisitePapers: ['academic_publishing'],
  complexity: 6,
  minimumAge: 'adult',
  skillGrants: { society: 15, economics: 10 },
  //   contributesTo: [
  //     { setId: 'academic_publishing', technologyId: 'university_libraries' }
  //   ],
  description: `Individual researchers cannot afford every journal*. Libraries solve this through subscriptions.

The subscription model:
- Libraries pay annual fees
- Journals delivered automatically
- Researchers access for free**
- Publishers guaranteed income†

This creates a symbiotic relationship between publishers, libraries, and researchers. Everyone benefits. Probably.

*Journal prices increase faster than inflation. This will become a major problem, but currently everyone is too excited about having journals to notice.

**"Free" from the researcher's perspective. The library paid. The library's budget comes from university fees. The students paid. Economics is complicated.

†"Guaranteed income" leads to "guaranteed price increases." Publishers discover inelastic demand with predictable results.`,
  abstract: 'Distribution model for academic journals using library subscriptions and automated delivery.',
  published: false
};

// ============================================================================
// TIER 6: BIOGRAPHIES & CAREERS (Early Modern+)
// ============================================================================

export const BIOGRAPHICAL_WRITING: ResearchPaper = {
  paperId: 'biographical_writing',
  title: 'The Art of the Biography: Documenting Lives Well Lived',
  field: 'society',
  paperSets: ['biography_publishing'],
  prerequisitePapers: ['publishing_business'],
  complexity: 5,
  minimumAge: 'adult',
  skillGrants: { society: 12, writing: 15 },
  //   contributesTo: [
  //     { setId: 'biography_publishing', technologyId: 'biography_books' }
  //   ],
  description: `Biographies serve two purposes: historical record and inspiration*.

Essential elements:
- Chronological narrative of subject's life
- Major achievements and failures**
- Character development†
- Historical context
- Lessons for readers‡

Well-written biographies inspire future generations to pursue similar paths. Poorly-written ones inspire pity for the biographer's editor.

*Also: gossip, scandal, and settling old scores. These purposes are rarely acknowledged in academic literature but dominate actual practice.

**Failures are often omitted in authorized biographies. Unauthorized biographies consist primarily of failures. Truth lies somewhere between.

†"Character development" is code for "making the subject seem more interesting than they actually were." All biographers do this. It is expected.

‡The lesson "work yourself to death for ambiguous glory" appears frequently. Readers surprisingly undeterred.`,
  abstract: 'Methodology for biographical writing including narrative structure, research, and inspirational framing.',
  published: false
};

export const CAREER_DOCUMENTATION: ResearchPaper = {
  paperId: 'career_documentation',
  title: 'Pathways to Mastery: Documenting Professional Development',
  field: 'society',
  paperSets: ['biography_publishing'],
  prerequisitePapers: ['biographical_writing'],
  complexity: 6,
  minimumAge: 'adult',
  minimumSkills: { society: 20 },
  skillGrants: { society: 15, teaching: 12 },
  //   contributesTo: [
  //     { setId: 'biography_publishing', technologyId: 'biography_books' }
  //   ],
  description: `The most valuable biographies provide career blueprints*.

Key documentation:
- Initial training and education
- Milestone achievements (in chronological order)
- Skills acquired and when
- Mentors and influences**
- Resources required†
- Time investment

Young readers can follow similar paths to achieve similar results. Assuming similar talent, luck, and historical circumstances.

*"Valuable" defined as "useful for inspiring the next generation." Pure historical biographies are interesting. Career-focused biographies change lives.

**Every successful person attributes success to mentors. Mentors rarely receive equal credit. This is a statistical impossibility that no one questions.

†Often omitted: wealthy parents, inherited libraries, family connections, historical accidents. These factors are acknowledged obliquely: "through fortunate circumstances..."`,
  abstract: 'Framework for documenting career progression as educational blueprint including milestones, resources, and timeline.',
  published: false
};

// ============================================================================
// EXPORTS
// ============================================================================

export const ALL_PUBLISHING_PAPERS = [
  // Writing & Libraries (Tier 1)
  MANUSCRIPT_PRESERVATION,
  LIBRARY_ORGANIZATION,
  SCRIBE_TRAINING,
  INK_PRODUCTION,

  // Binding & Bookmaking (Tier 2)
  BINDING_TECHNIQUES,
  PAPER_PRODUCTION,

  // Printing Press (Tier 3)
  MOVABLE_TYPE,
  PRINTING_PRESS_MECHANICS,

  // Publishing Industry (Tier 4)
  MASS_PRODUCTION_THEORY,
  PUBLISHING_BUSINESS,
  BOOKSTORE_ECONOMICS,

  // Academic Publishing (Tier 5)
  PEER_REVIEW_SYSTEM,
  ACADEMIC_PUBLISHING,
  JOURNAL_DISTRIBUTION,

  // Biography (Tier 6)
  BIOGRAPHICAL_WRITING,
  CAREER_DOCUMENTATION
];
