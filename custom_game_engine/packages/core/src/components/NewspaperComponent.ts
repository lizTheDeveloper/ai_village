/**
 * NewspaperComponent - Daily/weekly newspaper organization
 *
 * Newspapers are living organizations staffed by ensouled LLM agents.
 * They investigate stories, write articles, and publish editions regularly.
 */

import type { Component } from '../ecs/Component.js';

// ============================================================================
// EMPLOYEE TYPES
// ============================================================================

export type NewspaperRole =
  | 'editor_in_chief' // Head of newsroom
  | 'managing_editor' // Day-to-day operations
  | 'news_editor' // Oversees news section
  | 'investigative_reporter' // Deep dives
  | 'beat_reporter' // Covers specific topics
  | 'columnist' // Opinion pieces
  | 'photographer' // Images
  | 'copy_editor' // Grammar and style
  | 'fact_checker' // Verifies claims
  | 'layout_editor' // Page design
  | 'cartoonist' // Comics and editorial cartoons
  | 'sports_reporter' // Sports coverage
  | 'critic' // Reviews (food, art, etc.)
  | 'obituary_writer'; // Death notices

export type NewspaperDepartment =
  | 'newsroom'
  | 'editorial'
  | 'photography'
  | 'production'
  | 'circulation';

export interface NewspaperEmployee {
  agentId: string;
  role: NewspaperRole;
  department: NewspaperDepartment;
  salary: number;
  hireTick: number;
  performance: number; // 0-1
  articlesWritten: string[]; // Article IDs
  awardsWon: string[];
  beat?: string; // For beat reporters (politics, crime, education, etc.)
}

// ============================================================================
// ARTICLE TYPES
// ============================================================================

export type ArticleType =
  | 'breaking_news'
  | 'investigative'
  | 'feature'
  | 'opinion'
  | 'editorial'
  | 'review'
  | 'obituary'
  | 'sports'
  | 'weather'
  | 'classifieds';

export type ArticleStatus =
  | 'pitch'
  | 'assignment'
  | 'researching'
  | 'writing'
  | 'editing'
  | 'fact_checking'
  | 'ready'
  | 'published';

export interface Article {
  id: string;
  headline: string;
  byline: string; // Author name
  authorId: string;
  type: ArticleType;
  status: ArticleStatus;
  wordCount: number;
  writtenTick: number;
  publishedTick?: number;
  editorId?: string;
  photographerId?: string;
  /** Quality/impact score */
  quality: number; // 0-1
  /** Reader engagement */
  readCount: number;
  /** Sources cited */
  sources: string[];
  /** Is this above the fold? */
  priority: number; // 1-10
}

export interface Edition {
  id: string;
  issueNumber: number;
  publishedTick: number;
  /** Articles in this edition */
  articles: string[]; // Article IDs
  /** Front page article */
  leadStory: string;
  /** Circulation (copies distributed) */
  circulation: number;
  /** Revenue from sales */
  revenue: number;
  /** Advertising revenue for this edition */
  adRevenue: number;
}

// ============================================================================
// NEWSPAPER COMPONENT
// ============================================================================

export interface NewspaperComponent extends Component {
  type: 'newspaper';

  /** Identity */
  newspaperName: string;
  slogan?: string; // e.g., "All the News Fit to Print"
  foundedTick: number;
  reputation: number; // 0-100

  /** Building reference */
  buildingId: string;

  /** Publishing schedule */
  frequency: 'daily' | 'weekly' | 'biweekly';
  lastPublishedTick: number;
  nextPublishingTick: number;

  /** Staff */
  employees: NewspaperEmployee[];
  maxEmployees: number;

  /** Content */
  activeArticles: Article[]; // In progress
  publishedArticles: Article[]; // Archive
  editions: Edition[]; // Past editions

  /** Sections */
  sections: string[]; // News, Sports, Opinion, Arts, etc.

  /** Finances */
  budget: number;
  subscriptionRevenue: number;
  advertisingRevenue: number;
  monthlyOperatingCosts: number;

  /** Distribution */
  circulationCount: number; // Regular subscribers
  peakCirculation: number;
  distributionRange: number; // How far the paper reaches

  /** Success metrics */
  pulitzerCount: number; // Investigative journalism awards
  totalReadership: number;
  controversies: number; // Retractions, scandals

  /** Editorial stance */
  politicalLean: number; // -1 (left) to 1 (right)
  focusAreas: string[]; // Topics the paper emphasizes
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

let newspaperIdCounter = 0;
let issueCounter = 0;

export function createNewspaperComponent(
  newspaperName: string,
  buildingId: string,
  tick: number,
  frequency: 'daily' | 'weekly' | 'biweekly' = 'daily',
  slogan?: string
): NewspaperComponent {
  return {
    type: 'newspaper',
    version: 1,

    newspaperName,
    slogan,
    foundedTick: tick,
    reputation: 50,
    buildingId,

    frequency,
    lastPublishedTick: tick,
    nextPublishingTick: tick + getPublishingInterval(frequency),

    employees: [],
    maxEmployees: 40,

    activeArticles: [],
    publishedArticles: [],
    editions: [],

    sections: ['News', 'Opinion', 'Sports', 'Arts', 'Business'],

    budget: 30000,
    subscriptionRevenue: 0,
    advertisingRevenue: 0,
    monthlyOperatingCosts: 0,

    circulationCount: 0,
    peakCirculation: 0,
    distributionRange: 800,

    pulitzerCount: 0,
    totalReadership: 0,
    controversies: 0,

    politicalLean: 0, // Neutral
    focusAreas: ['local_news', 'politics', 'community'],
  };
}

function getPublishingInterval(frequency: 'daily' | 'weekly' | 'biweekly'): number {
  switch (frequency) {
    case 'daily':
      return 20 * 60 * 60 * 24; // 1 day in ticks (20 TPS)
    case 'weekly':
      return 20 * 60 * 60 * 24 * 7; // 1 week
    case 'biweekly':
      return 20 * 60 * 60 * 24 * 14; // 2 weeks
  }
}

export function createArticle(
  headline: string,
  authorId: string,
  authorName: string,
  type: ArticleType,
  tick: number,
  priority: number = 5
): Article {
  return {
    id: `article_${++newspaperIdCounter}`,
    headline,
    byline: authorName,
    authorId,
    type,
    status: 'pitch',
    wordCount: 0,
    writtenTick: tick,
    quality: 0,
    readCount: 0,
    sources: [],
    priority,
  };
}

export function createEdition(
  newspaper: NewspaperComponent,
  leadStoryId: string,
  articleIds: string[],
  tick: number
): Edition {
  return {
    id: `edition_${newspaper.newspaperName}_${++issueCounter}`,
    issueNumber: issueCounter,
    publishedTick: tick,
    articles: articleIds,
    leadStory: leadStoryId,
    circulation: newspaper.circulationCount,
    revenue: 0,
    adRevenue: 0,
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function hireNewspaperEmployee(
  newspaper: NewspaperComponent,
  agentId: string,
  role: NewspaperRole,
  department: NewspaperDepartment,
  salary: number,
  tick: number,
  beat?: string
): NewspaperEmployee | null {
  if (newspaper.employees.length >= newspaper.maxEmployees) {
    return null;
  }

  if (newspaper.employees.some(e => e.agentId === agentId)) {
    return null;
  }

  const employee: NewspaperEmployee = {
    agentId,
    role,
    department,
    salary,
    hireTick: tick,
    performance: 0.5,
    articlesWritten: [],
    awardsWon: [],
    beat,
  };

  newspaper.employees.push(employee);
  newspaper.monthlyOperatingCosts += salary;

  return employee;
}

export function fireNewspaperEmployee(
  newspaper: NewspaperComponent,
  agentId: string
): boolean {
  const index = newspaper.employees.findIndex(e => e.agentId === agentId);
  if (index === -1) return false;

  const employee = newspaper.employees[index]!;
  newspaper.monthlyOperatingCosts -= employee.salary;
  newspaper.employees.splice(index, 1);

  return true;
}

export function assignArticle(
  newspaper: NewspaperComponent,
  article: Article,
  editorId?: string
): void {
  article.status = 'assignment';
  article.editorId = editorId;
  newspaper.activeArticles.push(article);
}

export function submitArticle(
  article: Article,
  wordCount: number,
  sources: string[]
): void {
  article.status = 'editing';
  article.wordCount = wordCount;
  article.sources = sources;
}

export function publishArticle(
  newspaper: NewspaperComponent,
  articleId: string,
  quality: number,
  tick: number
): Article | null {
  const index = newspaper.activeArticles.findIndex(a => a.id === articleId);
  if (index === -1) return null;

  const article = newspaper.activeArticles[index]!;
  article.status = 'published';
  article.quality = quality;
  article.publishedTick = tick;

  newspaper.activeArticles.splice(index, 1);
  newspaper.publishedArticles.push(article);

  // Update employee credits
  const employee = newspaper.employees.find(e => e.agentId === article.authorId);
  if (employee && !employee.articlesWritten.includes(articleId)) {
    employee.articlesWritten.push(articleId);
  }

  return article;
}

export function publishEdition(
  newspaper: NewspaperComponent,
  leadStoryId: string,
  articleIds: string[],
  tick: number,
  adRevenue: number
): Edition {
  const edition = createEdition(newspaper, leadStoryId, articleIds, tick);
  edition.adRevenue = adRevenue;
  edition.revenue = edition.circulation * 2; // $2 per copy

  newspaper.editions.push(edition);
  newspaper.lastPublishedTick = tick;
  newspaper.nextPublishingTick = tick + getPublishingInterval(newspaper.frequency);

  // Update peak circulation
  if (edition.circulation > newspaper.peakCirculation) {
    newspaper.peakCirculation = edition.circulation;
  }

  return edition;
}

export function addSubscriber(newspaper: NewspaperComponent, count: number = 1): void {
  newspaper.circulationCount += count;
}

export function removeSubscriber(newspaper: NewspaperComponent, count: number = 1): void {
  newspaper.circulationCount = Math.max(0, newspaper.circulationCount - count);
}

export function recordReadership(
  newspaper: NewspaperComponent,
  articleId: string,
  readers: number
): void {
  const article = newspaper.publishedArticles.find(a => a.id === articleId);
  if (article) {
    article.readCount += readers;
    newspaper.totalReadership += readers;
  }
}

export function awardPulitzer(
  newspaper: NewspaperComponent,
  employeeId: string,
  articleId: string
): void {
  newspaper.pulitzerCount++;

  const employee = newspaper.employees.find(e => e.agentId === employeeId);
  if (employee) {
    employee.awardsWon.push(`Pulitzer_${articleId}`);
  }
}

export function recordControversy(newspaper: NewspaperComponent): void {
  newspaper.controversies++;
  updateNewspaperReputation(newspaper, -5);
}

export function updateNewspaperReputation(
  newspaper: NewspaperComponent,
  delta: number
): void {
  newspaper.reputation = Math.max(0, Math.min(100, newspaper.reputation + delta));
}

export function getEmployeesByRole(
  newspaper: NewspaperComponent,
  role: NewspaperRole
): NewspaperEmployee[] {
  return newspaper.employees.filter(e => e.role === role);
}

export function getEmployeesByDepartment(
  newspaper: NewspaperComponent,
  department: NewspaperDepartment
): NewspaperEmployee[] {
  return newspaper.employees.filter(e => e.department === department);
}

export function getBeatReporters(
  newspaper: NewspaperComponent,
  beat: string
): NewspaperEmployee[] {
  return newspaper.employees.filter(
    e => e.role === 'beat_reporter' && e.beat === beat
  );
}

export function getArticlesByType(
  newspaper: NewspaperComponent,
  type: ArticleType
): Article[] {
  return newspaper.publishedArticles.filter(a => a.type === type);
}

export function getTopArticles(
  newspaper: NewspaperComponent,
  limit: number = 10
): Article[] {
  return [...newspaper.publishedArticles]
    .sort((a, b) => b.readCount - a.readCount)
    .slice(0, limit);
}

export function calculateMonthlyProfit(newspaper: NewspaperComponent): number {
  return (
    newspaper.subscriptionRevenue +
    newspaper.advertisingRevenue -
    newspaper.monthlyOperatingCosts
  );
}
