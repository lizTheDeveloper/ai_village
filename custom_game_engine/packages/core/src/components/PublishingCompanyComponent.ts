/**
 * PublishingCompanyComponent - Book publishing house organization
 *
 * Publishing companies are living organizations staffed by ensouled LLM agents.
 * They handle manuscript acquisition, editing, printing, and distribution.
 */

import type { Component } from '../ecs/Component.js';

// ============================================================================
// EMPLOYEE TYPES
// ============================================================================

export type PublishingRole =
  | 'publisher' // CEO/owner
  | 'acquisitions_editor' // Finds and signs authors
  | 'developmental_editor' // Major content editing
  | 'copy_editor' // Grammar, style, consistency
  | 'proofreader' // Final pass for errors
  | 'art_director' // Cover design oversight
  | 'cover_designer' // Creates cover art
  | 'typesetter' // Layout and formatting
  | 'printing_manager' // Oversees printing
  | 'marketing_director' // Promotion strategy
  | 'publicist' // Media relations
  | 'sales_rep' // Bookstore relations
  | 'rights_manager'; // Foreign/subsidiary rights

export type PublishingDepartment =
  | 'editorial'
  | 'production'
  | 'marketing'
  | 'sales'
  | 'administration';

export interface PublishingEmployee {
  agentId: string;
  role: PublishingRole;
  department: PublishingDepartment;
  salary: number;
  hireTick: number;
  performance: number; // 0-1
  booksEdited: string[]; // Book IDs worked on
  awardsWon: string[];
}

// ============================================================================
// MANUSCRIPT & BOOK TYPES
// ============================================================================

export type ManuscriptStatus =
  | 'submitted'
  | 'under_review'
  | 'accepted'
  | 'rejected'
  | 'in_editing'
  | 'in_production'
  | 'printed'
  | 'published';

export interface Manuscript {
  id: string;
  title: string;
  authorId: string;
  authorName: string;
  genre: string;
  wordCount: number;
  submittedTick: number;
  status: ManuscriptStatus;
  /** Assigned editor */
  editorId?: string;
  /** Quality rating 0-1 (from editorial review) */
  quality: number;
  /** Advance payment to author */
  advance?: number;
  /** Royalty percentage */
  royaltyRate?: number;
}

export interface PublishedBook {
  id: string;
  manuscriptId: string;
  title: string;
  authorId: string;
  authorName: string;
  genre: string;
  isbn: string;
  publishedTick: number;
  /** Print run size */
  printRun: number;
  /** Copies sold */
  copiesSold: number;
  /** Revenue from sales */
  revenue: number;
  /** Production cost per copy */
  unitCost: number;
  /** Retail price */
  retailPrice: number;
  /** Cover designer ID */
  coverDesignerId?: string;
  /** Reviews/ratings */
  averageRating: number;
  reviewCount: number;
}

export interface PrintingJob {
  id: string;
  bookId: string;
  copies: number;
  startedTick: number;
  completionTick: number;
  status: 'queued' | 'printing' | 'complete';
  cost: number;
}

// ============================================================================
// PUBLISHING COMPANY COMPONENT
// ============================================================================

export interface PublishingCompanyComponent extends Component {
  type: 'publishing_company';

  /** Company identity */
  companyName: string;
  foundedTick: number;
  reputation: number; // 0-100

  /** Building reference */
  buildingId: string;

  /** Staff */
  employees: PublishingEmployee[];
  maxEmployees: number;

  /** Manuscript slush pile */
  submissions: Manuscript[];
  /** Books currently being edited/produced */
  inProduction: Manuscript[];
  /** Published books catalog */
  catalog: PublishedBook[];

  /** Active printing jobs */
  printingQueue: PrintingJob[];

  /** Imprints/subdivisions */
  imprints: string[]; // Names of imprints for different genres

  /** Finances */
  budget: number;
  monthlyRevenue: number;
  monthlyOperatingCosts: number;

  /** Distribution network */
  bookstorePartners: string[]; // Bookstore entity IDs
  distributionRange: number; // How far books can be distributed

  /** Success metrics */
  totalBooksSold: number;
  bestsellerCount: number;
  awardsWon: string[];

  /** Specialization */
  primaryGenres: string[]; // Genres this publisher focuses on
  acceptanceRate: number; // % of submissions accepted
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

let companyIdCounter = 0;
let isbnCounter = 1000;

export function createPublishingCompanyComponent(
  companyName: string,
  buildingId: string,
  tick: number,
  primaryGenres: string[] = ['fiction', 'non-fiction']
): PublishingCompanyComponent {
  return {
    type: 'publishing_company',
    version: 1,

    companyName,
    foundedTick: tick,
    reputation: 50,
    buildingId,

    employees: [],
    maxEmployees: 30,

    submissions: [],
    inProduction: [],
    catalog: [],

    printingQueue: [],

    imprints: [],

    budget: 50000,
    monthlyRevenue: 0,
    monthlyOperatingCosts: 0,

    bookstorePartners: [],
    distributionRange: 1000,

    totalBooksSold: 0,
    bestsellerCount: 0,
    awardsWon: [],

    primaryGenres,
    acceptanceRate: 0.1, // 10% of submissions
  };
}

export function createManuscript(
  title: string,
  authorId: string,
  authorName: string,
  genre: string,
  wordCount: number,
  tick: number
): Manuscript {
  return {
    id: `ms_${++companyIdCounter}`,
    title,
    authorId,
    authorName,
    genre,
    wordCount,
    submittedTick: tick,
    status: 'submitted',
    quality: 0.5, // Will be rated during review
  };
}

export function createPublishedBook(
  manuscript: Manuscript,
  printRun: number,
  unitCost: number,
  retailPrice: number,
  tick: number,
  coverDesignerId?: string
): PublishedBook {
  return {
    id: `book_${manuscript.id}`,
    manuscriptId: manuscript.id,
    title: manuscript.title,
    authorId: manuscript.authorId,
    authorName: manuscript.authorName,
    genre: manuscript.genre,
    isbn: `978-0-${String(++isbnCounter).padStart(6, '0')}`,
    publishedTick: tick,
    printRun,
    copiesSold: 0,
    revenue: 0,
    unitCost,
    retailPrice,
    coverDesignerId,
    averageRating: 0,
    reviewCount: 0,
  };
}

export function createPrintingJob(
  bookId: string,
  copies: number,
  tick: number,
  costPerCopy: number
): PrintingJob {
  return {
    id: `print_${++companyIdCounter}`,
    bookId,
    copies,
    startedTick: tick,
    completionTick: tick + 2000, // ~100 seconds
    status: 'queued',
    cost: copies * costPerCopy,
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function submitManuscript(
  company: PublishingCompanyComponent,
  manuscript: Manuscript
): void {
  company.submissions.push(manuscript);
}

export function reviewManuscript(
  company: PublishingCompanyComponent,
  manuscriptId: string,
  accept: boolean,
  quality: number,
  editorId?: string
): Manuscript | null {
  const index = company.submissions.findIndex(m => m.id === manuscriptId);
  if (index === -1) return null;

  const manuscript = company.submissions[index]!;
  manuscript.quality = quality;
  manuscript.editorId = editorId;

  if (accept) {
    manuscript.status = 'accepted';
    company.submissions.splice(index, 1);
    company.inProduction.push(manuscript);
  } else {
    manuscript.status = 'rejected';
    company.submissions.splice(index, 1);
  }

  return manuscript;
}

export function publishBook(
  company: PublishingCompanyComponent,
  manuscriptId: string,
  printRun: number,
  unitCost: number,
  retailPrice: number,
  tick: number,
  coverDesignerId?: string
): PublishedBook | null {
  const index = company.inProduction.findIndex(m => m.id === manuscriptId);
  if (index === -1) return null;

  const manuscript = company.inProduction[index]!;
  const book = createPublishedBook(
    manuscript,
    printRun,
    unitCost,
    retailPrice,
    tick,
    coverDesignerId
  );

  company.inProduction.splice(index, 1);
  company.catalog.push(book);

  return book;
}

export function hirePublishingEmployee(
  company: PublishingCompanyComponent,
  agentId: string,
  role: PublishingRole,
  department: PublishingDepartment,
  salary: number,
  tick: number
): PublishingEmployee | null {
  if (company.employees.length >= company.maxEmployees) {
    return null;
  }

  if (company.employees.some(e => e.agentId === agentId)) {
    return null;
  }

  const employee: PublishingEmployee = {
    agentId,
    role,
    department,
    salary,
    hireTick: tick,
    performance: 0.5,
    booksEdited: [],
    awardsWon: [],
  };

  company.employees.push(employee);
  company.monthlyOperatingCosts += salary;

  return employee;
}

export function firePublishingEmployee(
  company: PublishingCompanyComponent,
  agentId: string
): boolean {
  const index = company.employees.findIndex(e => e.agentId === agentId);
  if (index === -1) return false;

  const employee = company.employees[index]!;
  company.monthlyOperatingCosts -= employee.salary;
  company.employees.splice(index, 1);

  return true;
}

export function getEmployeesByRole(
  company: PublishingCompanyComponent,
  role: PublishingRole
): PublishingEmployee[] {
  return company.employees.filter(e => e.role === role);
}

export function getEmployeesByDepartment(
  company: PublishingCompanyComponent,
  department: PublishingDepartment
): PublishingEmployee[] {
  return company.employees.filter(e => e.department === department);
}

export function addBookstorePartner(
  company: PublishingCompanyComponent,
  bookstoreId: string
): void {
  if (!company.bookstorePartners.includes(bookstoreId)) {
    company.bookstorePartners.push(bookstoreId);
  }
}

export function queuePrintJob(
  company: PublishingCompanyComponent,
  bookId: string,
  copies: number,
  tick: number,
  costPerCopy: number
): PrintingJob {
  const job = createPrintingJob(bookId, copies, tick, costPerCopy);
  company.printingQueue.push(job);
  return job;
}

export function completePrintJob(
  company: PublishingCompanyComponent,
  jobId: string
): boolean {
  const index = company.printingQueue.findIndex(j => j.id === jobId);
  if (index === -1) return false;

  const job = company.printingQueue[index]!;
  job.status = 'complete';

  // Update book print run
  const book = company.catalog.find(b => b.id === job.bookId);
  if (book) {
    book.printRun += job.copies;
  }

  company.printingQueue.splice(index, 1);
  return true;
}

export function recordSale(
  company: PublishingCompanyComponent,
  bookId: string,
  copies: number
): void {
  const book = company.catalog.find(b => b.id === bookId);
  if (!book) return;

  book.copiesSold += copies;
  const revenue = copies * book.retailPrice;
  book.revenue += revenue;
  company.totalBooksSold += copies;

  // Track bestsellers (100+ copies)
  if (book.copiesSold >= 100 && book.copiesSold - copies < 100) {
    company.bestsellerCount++;
  }
}

export function calculateMonthlyProfit(
  company: PublishingCompanyComponent
): number {
  return company.monthlyRevenue - company.monthlyOperatingCosts;
}

export function updateReputation(
  company: PublishingCompanyComponent,
  delta: number
): void {
  company.reputation = Math.max(0, Math.min(100, company.reputation + delta));
}
