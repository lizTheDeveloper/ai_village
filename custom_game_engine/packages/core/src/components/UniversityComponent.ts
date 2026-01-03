/**
 * UniversityComponent - Higher education and research institution
 *
 * Universities are living organizations staffed by ensouled LLM agents.
 * They conduct research, teach students, and advance knowledge.
 *
 * Key mechanics:
 * - Researchers: Autonomic NPCs who conduct research projects
 * - Lecturers/Professors: LLM-enabled agents who teach and write papers
 * - Teaching system: Skills transfer through lectures and seminars
 * - Research collaboration: Share findings with other universities
 * - Publication: Write and publish research papers
 */

import type { Component } from '../ecs/Component.js';

// ============================================================================
// EMPLOYEE TYPES
// ============================================================================

export type UniversityRole =
  | 'chancellor'              // Head of university
  | 'dean'                    // Head of a faculty/department
  | 'professor'               // Senior researcher and teacher (LLM-enabled)
  | 'associate_professor'     // Mid-level researcher and teacher (LLM-enabled)
  | 'assistant_professor'     // Junior researcher and teacher (LLM-enabled)
  | 'lecturer'                // Teaching-focused (LLM-enabled)
  | 'researcher'              // Research-focused (autonomic)
  | 'postdoc'                 // Post-doctoral researcher (autonomic)
  | 'phd_student'             // Doctoral student (autonomic)
  | 'lab_technician'          // Lab support (autonomic)
  | 'librarian'               // Manages university library
  | 'administrator';          // Administrative support

export type AcademicDepartment =
  | 'natural_sciences'        // Physics, Chemistry, Biology
  | 'mathematics'             // Pure and Applied Math
  | 'engineering'             // Various engineering disciplines
  | 'medicine'                // Medical research and training
  | 'social_sciences'         // Sociology, Psychology, Economics
  | 'humanities'              // Literature, Philosophy, History
  | 'agriculture'             // Farming, Animal Science
  | 'magic_studies'           // Magical research (if magic exists)
  | 'administration';         // Non-academic staff

export interface UniversityEmployee {
  agentId: string;
  role: UniversityRole;
  department: AcademicDepartment;
  salary: number;
  hireTick: number;
  tenure: boolean; // Permanent position?

  // Academic metrics
  teachingSkill: number; // 0-100
  researchSkill: number; // 0-100
  publicationCount: number;
  citationCount: number;

  // Current activities
  activeResearchProjects: string[]; // Project IDs
  teachingCourses: string[]; // Course IDs

  // History
  papersPublished: string[]; // Paper IDs
  studentsSupervised: string[]; // Student agent IDs
  lecturesGiven: number;
}

// ============================================================================
// PUBLISHING & DISSEMINATION TYPES
// ============================================================================

export type PublicationVenue =
  | 'academic_journal'    // Peer-reviewed journal
  | 'preprint_server'     // arXiv-style preprint
  | 'conference'          // Conference proceedings
  | 'university_press'    // University's own press
  | 'social_media'        // Twitter/Reddit/academic social networks
  | 'blog'                // Research blog
  | 'newsletter';         // Email newsletter

export interface PublicationChannel {
  id: string;
  type: PublicationVenue;
  name: string; // e.g., "Nature", "arXiv", "UniversityPress"

  // Server infrastructure (for digital venues)
  hasServer: boolean;
  serverUrl?: string; // e.g., "research.university.edu"

  // Metrics
  totalPublications: number;
  totalViews: number;
  totalCitations: number;

  // Access
  isOpenAccess: boolean;
  requiresSubscription: boolean;
  subscriptionCost?: number;
}

export interface PublicationRecord {
  paperId: string;
  projectId: string;
  venue: PublicationVenue;
  channelId: string; // Which journal/server/platform

  publishedTick: number;

  // Reach
  views: number;
  downloads: number;
  citations: number;
  socialShares: number;

  // Impact
  impactFactor: number; // Venue-dependent
  altmetricScore: number; // Social media impact
}

// ============================================================================
// RESEARCH TYPES
// ============================================================================

export type ResearchStatus =
  | 'proposed'        // Funding request submitted
  | 'approved'        // Funded and ready to start
  | 'active'          // Currently being researched
  | 'analysis'        // Data analysis phase
  | 'writing'         // Writing the paper
  | 'peer_review'     // Under review
  | 'published'       // Paper published
  | 'abandoned';      // Project cancelled

export interface ResearchProject {
  id: string;
  title: string;
  field: string; // Research field (biology, physics, etc.)
  department: AcademicDepartment;

  // Personnel
  principalInvestigator: string; // Employee agent ID
  researchers: string[]; // Employee agent IDs
  students: string[]; // Student agent IDs

  // Progress
  status: ResearchStatus;
  startedTick: number;
  expectedDuration: number; // Ticks
  progress: number; // 0-100

  // Funding
  fundingRequired: number;
  fundingReceived: number;

  // Output
  paperId?: string; // Published paper ID if completed
  discoveries: string[]; // Discoveries made

  // Quality
  quality: number; // 0-1 (affects paper impact)
  novelty: number; // 0-1 (how groundbreaking)
}

// ============================================================================
// TEACHING TYPES
// ============================================================================

export type CourseLevel =
  | 'undergraduate'
  | 'graduate'
  | 'doctoral';

export interface Course {
  id: string;
  name: string;
  field: string;
  department: AcademicDepartment;
  level: CourseLevel;

  // Teaching
  instructor: string; // Employee agent ID (must be LLM-enabled)
  assistants: string[]; // TA agent IDs

  // Schedule
  meetingsPerWeek: number;
  lastLectureTick: number;
  nextLectureTick: number;

  // Students
  enrolledStudents: string[]; // Agent IDs
  maxEnrollment: number;

  // Skills taught
  skillsTaught: string[]; // Skill IDs from skills system
  skillBonus: number; // How much skill gain per lecture

  // Metrics
  lecturesGiven: number;
  averageAttendance: number;
  studentSatisfaction: number; // 0-100
}

export interface Lecture {
  id: string;
  courseId: string;
  instructor: string; // Agent ID
  topic: string;
  givenTick: number;

  // Attendance
  studentsPresent: string[]; // Agent IDs
  attendanceRate: number;

  // Skills transferred
  skillTransfers: SkillTransfer[];

  // Quality
  quality: number; // 0-1 (based on instructor teaching skill)
  engagement: number; // 0-1 (student engagement)
}

export interface SkillTransfer {
  studentId: string;
  skillId: string;
  xpGained: number;
  levelBefore: number;
  levelAfter: number;
}

// ============================================================================
// UNIVERSITY COMPONENT
// ============================================================================

export interface UniversityComponent extends Component {
  type: 'university';

  /** Identity */
  universityName: string;
  motto?: string; // e.g., "Lux et Veritas" (Light and Truth)
  foundedTick: number;
  reputation: number; // 0-100 (affects student enrollment, funding)

  /** Building reference */
  buildingId: string;

  /** Staff */
  employees: UniversityEmployee[];
  maxEmployees: number;

  /** Academic structure */
  departments: AcademicDepartment[];

  /** Research */
  activeProjects: ResearchProject[];
  completedProjects: ResearchProject[];
  publishedPapers: string[]; // Paper IDs

  /** Teaching */
  courses: Course[];
  lectures: Lecture[]; // Recent lectures (last 100)
  currentStudents: string[]; // All enrolled student agent IDs
  maxStudents: number;

  /** Collaboration */
  partnerUniversities: string[]; // Other university entity IDs
  researchCollaborationEnabled: boolean; // Unlocked globally

  /** Publishing infrastructure */
  publicationChannels: PublicationChannel[]; // Journals, servers, social media
  publications: PublicationRecord[]; // All published works
  hasPreprintServer: boolean; // arXiv-style preprint server
  hasResearchBlog: boolean; // Public-facing blog
  socialMediaAccounts: string[]; // Platform account IDs

  /** Servers */
  webServerUrl?: string; // e.g., "www.university.edu"
  researchServerUrl?: string; // e.g., "research.university.edu"
  hasEmailServer: boolean; // For newsletters

  /** Finances */
  budget: number;
  researchFunding: number; // Dedicated research budget
  tuitionRevenue: number; // From students
  grantIncome: number; // From research grants
  monthlyOperatingCosts: number;

  /** Success metrics */
  totalPublications: number;
  totalCitations: number; // Sum of all paper citations
  nobelPrizes: number; // Top-tier awards
  studentsGraduated: number;

  /** Library */
  librarySize: number; // Books and papers in collection
  libraryQuality: number; // 0-100 (affects research quality)

  /** Research output multiplier (from tech unlocks) */
  researchMultiplier: number; // Base 1.0, boosted by collaboration/internet
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

let universityIdCounter = 0;

export function createUniversityComponent(
  universityName: string,
  buildingId: string,
  tick: number,
  motto?: string
): UniversityComponent {
  return {
    type: 'university',
    version: 1,

    universityName,
    motto,
    foundedTick: tick,
    reputation: 50,
    buildingId,

    employees: [],
    maxEmployees: 100,

    departments: [
      'natural_sciences',
      'mathematics',
      'engineering',
      'social_sciences',
      'humanities',
    ],

    activeProjects: [],
    completedProjects: [],
    publishedPapers: [],

    courses: [],
    lectures: [],
    currentStudents: [],
    maxStudents: 500,

    partnerUniversities: [],
    researchCollaborationEnabled: false,

    publicationChannels: [],
    publications: [],
    hasPreprintServer: false,
    hasResearchBlog: false,
    socialMediaAccounts: [],

    hasEmailServer: false,

    budget: 100000,
    researchFunding: 50000,
    tuitionRevenue: 0,
    grantIncome: 0,
    monthlyOperatingCosts: 0,

    totalPublications: 0,
    totalCitations: 0,
    nobelPrizes: 0,
    studentsGraduated: 0,

    librarySize: 100, // Start with some basic books
    libraryQuality: 30,

    researchMultiplier: 1.0,
  };
}

export function createResearchProject(
  title: string,
  field: string,
  department: AcademicDepartment,
  principalInvestigator: string,
  fundingRequired: number,
  expectedDuration: number,
  tick: number
): ResearchProject {
  return {
    id: `research_${++universityIdCounter}`,
    title,
    field,
    department,
    principalInvestigator,
    researchers: [],
    students: [],
    status: 'proposed',
    startedTick: tick,
    expectedDuration,
    progress: 0,
    fundingRequired,
    fundingReceived: 0,
    discoveries: [],
    quality: 0.5, // Will improve based on team
    novelty: 0.5, // Will be determined during research
  };
}

export function createCourse(
  name: string,
  field: string,
  department: AcademicDepartment,
  level: CourseLevel,
  instructor: string,
  skillsTaught: string[],
  tick: number
): Course {
  return {
    id: `course_${++universityIdCounter}`,
    name,
    field,
    department,
    level,
    instructor,
    assistants: [],
    meetingsPerWeek: 2, // Typical: 2-3 lectures per week
    lastLectureTick: tick,
    nextLectureTick: tick + 3 * 24 * 60 * 60 * 20, // 3 days (20 TPS)
    enrolledStudents: [],
    maxEnrollment: 50,
    skillsTaught,
    skillBonus: level === 'doctoral' ? 15 : level === 'graduate' ? 10 : 5,
    lecturesGiven: 0,
    averageAttendance: 0,
    studentSatisfaction: 50,
  };
}

export function createLecture(
  courseId: string,
  instructor: string,
  topic: string,
  tick: number
): Lecture {
  return {
    id: `lecture_${++universityIdCounter}`,
    courseId,
    instructor,
    topic,
    givenTick: tick,
    studentsPresent: [],
    attendanceRate: 0,
    skillTransfers: [],
    quality: 0.7, // Will be calculated based on instructor
    engagement: 0.7,
  };
}

// ============================================================================
// HELPER FUNCTIONS - EMPLOYMENT
// ============================================================================

export function hireUniversityEmployee(
  university: UniversityComponent,
  agentId: string,
  role: UniversityRole,
  department: AcademicDepartment,
  salary: number,
  tick: number,
  tenure: boolean = false
): UniversityEmployee | null {
  if (university.employees.length >= university.maxEmployees) {
    return null;
  }

  if (university.employees.some(e => e.agentId === agentId)) {
    return null; // Already employed
  }

  const employee: UniversityEmployee = {
    agentId,
    role,
    department,
    salary,
    hireTick: tick,
    tenure,
    teachingSkill: 50, // Will improve over time
    researchSkill: 50,
    publicationCount: 0,
    citationCount: 0,
    activeResearchProjects: [],
    teachingCourses: [],
    papersPublished: [],
    studentsSupervised: [],
    lecturesGiven: 0,
  };

  university.employees.push(employee);
  university.monthlyOperatingCosts += salary;

  return employee;
}

export function fireUniversityEmployee(
  university: UniversityComponent,
  agentId: string
): boolean {
  const index = university.employees.findIndex(e => e.agentId === agentId);
  if (index === -1) return false;

  const employee = university.employees[index]!;

  // Tenured employees are harder to fire
  if (employee.tenure) {
    return false; // Cannot fire tenured staff (need special process)
  }

  university.monthlyOperatingCosts -= employee.salary;
  university.employees.splice(index, 1);

  return true;
}

// ============================================================================
// HELPER FUNCTIONS - RESEARCH
// ============================================================================

export function proposeResearch(
  university: UniversityComponent,
  project: ResearchProject
): void {
  university.activeProjects.push(project);
}

export function fundResearch(
  university: UniversityComponent,
  projectId: string,
  amount: number
): boolean {
  const project = university.activeProjects.find(p => p.id === projectId);
  if (!project) return false;

  if (amount > university.researchFunding) {
    return false; // Insufficient funds
  }

  project.fundingReceived += amount;
  university.researchFunding -= amount;

  if (project.fundingReceived >= project.fundingRequired) {
    project.status = 'approved';
  }

  return true;
}

export function startResearch(
  university: UniversityComponent,
  projectId: string,
  tick: number
): boolean {
  const project = university.activeProjects.find(p => p.id === projectId);
  if (!project) return false;

  if (project.status !== 'approved') {
    return false; // Must be approved first
  }

  project.status = 'active';
  project.startedTick = tick;

  return true;
}

export function completeResearch(
  university: UniversityComponent,
  projectId: string,
  paperId: string,
  _tick: number
): ResearchProject | null {
  const index = university.activeProjects.findIndex(p => p.id === projectId);
  if (index === -1) return null;

  const project = university.activeProjects[index]!;
  project.status = 'published';
  project.paperId = paperId;
  project.progress = 100;

  university.activeProjects.splice(index, 1);
  university.completedProjects.push(project);
  university.publishedPapers.push(paperId);
  university.totalPublications++;

  // Update PI's stats
  const pi = university.employees.find(e => e.agentId === project.principalInvestigator);
  if (pi) {
    pi.publicationCount++;
    pi.papersPublished.push(paperId);
  }

  return project;
}

// ============================================================================
// HELPER FUNCTIONS - TEACHING
// ============================================================================

export function createUniversityCourse(
  university: UniversityComponent,
  course: Course
): void {
  university.courses.push(course);

  // Assign to instructor
  const instructor = university.employees.find(e => e.agentId === course.instructor);
  if (instructor) {
    instructor.teachingCourses.push(course.id);
  }
}

export function enrollStudent(
  university: UniversityComponent,
  courseId: string,
  studentId: string
): boolean {
  const course = university.courses.find(c => c.id === courseId);
  if (!course) return false;

  if (course.enrolledStudents.length >= course.maxEnrollment) {
    return false; // Course full
  }

  if (course.enrolledStudents.includes(studentId)) {
    return false; // Already enrolled
  }

  course.enrolledStudents.push(studentId);

  // Add to university's student list if not already there
  if (!university.currentStudents.includes(studentId)) {
    university.currentStudents.push(studentId);
  }

  return true;
}

export function giveLecture(
  university: UniversityComponent,
  lecture: Lecture,
  tick: number
): void {
  university.lectures.push(lecture);

  // Update course
  const course = university.courses.find(c => c.id === lecture.courseId);
  if (course) {
    course.lecturesGiven++;
    course.lastLectureTick = tick;
    course.nextLectureTick = tick + (7 * 24 * 60 * 60 * 20) / course.meetingsPerWeek; // Next lecture

    // Update attendance tracking
    const totalEnrolled = course.enrolledStudents.length;
    const attended = lecture.studentsPresent.length;
    lecture.attendanceRate = totalEnrolled > 0 ? attended / totalEnrolled : 0;

    // Rolling average attendance
    const weight = 0.8; // Weight for existing average
    course.averageAttendance = weight * course.averageAttendance + (1 - weight) * lecture.attendanceRate;
  }

  // Update instructor stats
  const instructor = university.employees.find(e => e.agentId === lecture.instructor);
  if (instructor) {
    instructor.lecturesGiven++;
  }

  // Keep only recent lectures (memory management)
  if (university.lectures.length > 100) {
    university.lectures.shift();
  }
}

export function recordSkillTransfer(
  lecture: Lecture,
  studentId: string,
  skillId: string,
  xpGained: number,
  levelBefore: number,
  levelAfter: number
): void {
  lecture.skillTransfers.push({
    studentId,
    skillId,
    xpGained,
    levelBefore,
    levelAfter,
  });
}

// ============================================================================
// HELPER FUNCTIONS - PUBLISHING
// ============================================================================

export function createPublicationChannel(
  type: PublicationVenue,
  name: string,
  isOpenAccess: boolean,
  hasServer: boolean = false
): PublicationChannel {
  return {
    id: `channel_${++universityIdCounter}`,
    type,
    name,
    hasServer,
    totalPublications: 0,
    totalViews: 0,
    totalCitations: 0,
    isOpenAccess,
    requiresSubscription: !isOpenAccess,
    subscriptionCost: isOpenAccess ? 0 : 50,
  };
}

export function addPublicationChannel(
  university: UniversityComponent,
  channel: PublicationChannel
): void {
  university.publicationChannels.push(channel);
}

export function publishResearch(
  university: UniversityComponent,
  paperId: string,
  projectId: string,
  venue: PublicationVenue,
  channelId: string,
  tick: number
): PublicationRecord {
  const channel = university.publicationChannels.find(c => c.id === channelId);

  const record: PublicationRecord = {
    paperId,
    projectId,
    venue,
    channelId,
    publishedTick: tick,
    views: 0,
    downloads: 0,
    citations: 0,
    socialShares: 0,
    impactFactor: channel?.type === 'academic_journal' ? 5.0 : 1.0,
    altmetricScore: 0,
  };

  university.publications.push(record);

  // Update channel stats
  if (channel) {
    channel.totalPublications++;
  }

  return record;
}

export function setupPreprintServer(
  university: UniversityComponent,
  serverUrl: string
): void {
  university.hasPreprintServer = true;
  university.researchServerUrl = serverUrl;

  // Create preprint channel
  const preprintChannel = createPublicationChannel(
    'preprint_server',
    `${university.universityName} Preprints`,
    true, // Open access
    true  // Has server
  );
  preprintChannel.serverUrl = serverUrl;

  university.publicationChannels.push(preprintChannel);
}

export function setupResearchBlog(
  university: UniversityComponent,
  blogUrl: string
): void {
  university.hasResearchBlog = true;

  const blogChannel = createPublicationChannel(
    'blog',
    `${university.universityName} Research Blog`,
    true,
    true
  );
  blogChannel.serverUrl = blogUrl;

  university.publicationChannels.push(blogChannel);
}

export function setupSocialMedia(
  university: UniversityComponent,
  platform: string,
  accountId: string
): void {
  university.socialMediaAccounts.push(accountId);

  // Create social media channel if not exists
  const existing = university.publicationChannels.find(
    c => c.type === 'social_media' && c.name === platform
  );

  if (!existing) {
    const socialChannel = createPublicationChannel(
      'social_media',
      platform,
      true,
      false
    );
    university.publicationChannels.push(socialChannel);
  }
}

export function shareOnSocialMedia(
  university: UniversityComponent,
  paperId: string,
  _platform: string
): void {
  const publication = university.publications.find(p => p.paperId === paperId);
  if (publication) {
    publication.socialShares++;
    publication.altmetricScore += 0.5; // Social sharing increases altmetric score
  }
}

export function recordCitation(
  university: UniversityComponent,
  paperId: string
): void {
  const publication = university.publications.find(p => p.paperId === paperId);
  if (publication) {
    publication.citations++;
    university.totalCitations++;

    // Update channel stats
    const channel = university.publicationChannels.find(c => c.id === publication.channelId);
    if (channel) {
      channel.totalCitations++;
    }
  }
}

export function recordPaperView(
  university: UniversityComponent,
  paperId: string
): void {
  const publication = university.publications.find(p => p.paperId === paperId);
  if (publication) {
    publication.views++;
    publication.downloads++; // Assume view = download for now

    // Update channel stats
    const channel = university.publicationChannels.find(c => c.id === publication.channelId);
    if (channel) {
      channel.totalViews++;
    }
  }
}

// ============================================================================
// HELPER FUNCTIONS - COLLABORATION
// ============================================================================

export function addPartnerUniversity(
  university: UniversityComponent,
  partnerId: string
): void {
  if (!university.partnerUniversities.includes(partnerId)) {
    university.partnerUniversities.push(partnerId);
  }
}

export function enableResearchCollaboration(
  university: UniversityComponent
): void {
  university.researchCollaborationEnabled = true;
  university.researchMultiplier *= 1.5; // 50% boost from collaboration
}

export function enableInternetResearch(
  university: UniversityComponent,
  internetMultiplier: number
): void {
  university.researchMultiplier *= internetMultiplier; // Additional boost from internet
}

// ============================================================================
// HELPER FUNCTIONS - QUERIES
// ============================================================================

export function getEmployeesByRole(
  university: UniversityComponent,
  role: UniversityRole
): UniversityEmployee[] {
  return university.employees.filter(e => e.role === role);
}

export function getEmployeesByDepartment(
  university: UniversityComponent,
  department: AcademicDepartment
): UniversityEmployee[] {
  return university.employees.filter(e => e.department === department);
}

export function getLLMEnabledStaff(
  university: UniversityComponent
): UniversityEmployee[] {
  // Professors, lecturers - these roles require LLM
  const llmRoles: UniversityRole[] = [
    'professor',
    'associate_professor',
    'assistant_professor',
    'lecturer',
  ];
  return university.employees.filter(e => llmRoles.includes(e.role));
}

export function getResearchers(
  university: UniversityComponent
): UniversityEmployee[] {
  // Researchers and research-capable staff
  const researchRoles: UniversityRole[] = [
    'professor',
    'associate_professor',
    'assistant_professor',
    'researcher',
    'postdoc',
  ];
  return university.employees.filter(e => researchRoles.includes(e.role));
}

export function getTopResearchers(
  university: UniversityComponent,
  limit: number = 10
): UniversityEmployee[] {
  return [...university.employees]
    .sort((a, b) => b.publicationCount - a.publicationCount)
    .slice(0, limit);
}

export function getActiveResearchProjects(
  university: UniversityComponent,
  department?: AcademicDepartment
): ResearchProject[] {
  if (department) {
    return university.activeProjects.filter(p =>
      p.department === department && p.status === 'active'
    );
  }
  return university.activeProjects.filter(p => p.status === 'active');
}

export function calculateResearchOutput(
  university: UniversityComponent
): number {
  // Base output from active projects
  const activeProjects = university.activeProjects.filter(p => p.status === 'active').length;
  const researchers = getResearchers(university).length;

  // Quality factors
  const avgResearchSkill = researchers > 0
    ? university.employees.reduce((sum, e) => sum + e.researchSkill, 0) / researchers
    : 0;

  const libraryBonus = university.libraryQuality / 100;

  return (activeProjects * avgResearchSkill / 100) *
         (1 + libraryBonus) *
         university.researchMultiplier;
}

export function calculateMonthlyProfit(
  university: UniversityComponent
): number {
  return (
    university.tuitionRevenue +
    university.grantIncome -
    university.monthlyOperatingCosts
  );
}

export function updateReputation(
  university: UniversityComponent,
  delta: number
): void {
  university.reputation = Math.max(0, Math.min(100, university.reputation + delta));
}
