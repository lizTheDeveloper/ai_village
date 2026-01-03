import { describe, it, expect } from 'vitest';
import {
  createUniversityComponent,
  hireUniversityEmployee,
  fireUniversityEmployee,
  proposeResearch,
  fundResearch,
  startResearch,
  completeResearch,
} from '../UniversityComponent.js';
import type { ResearchProject } from '../UniversityComponent.js';

describe('UniversityComponent', () => {
  describe('createUniversityComponent', () => {
    it('should create a university with all required fields', () => {
      const university = createUniversityComponent(
        'University of Test',
        'building-123',
        1000,
        'Per Sapientiam Ad Astra'
      );

      expect(university.type).toBe('university');
      expect(university.universityName).toBe('University of Test');
      expect(university.buildingId).toBe('building-123');
      expect(university.foundedTick).toBe(1000);
      expect(university.motto).toBe('Per Sapientiam Ad Astra');
      expect(university.employees).toEqual([]);
      expect(university.activeProjects).toEqual([]);
      expect(university.publications).toEqual([]);
      expect(university.researchMultiplier).toBe(1.0);
    });

    it('should have undefined motto if not provided', () => {
      const university = createUniversityComponent(
        'Test U',
        'building-456',
        2000
      );

      expect(university.motto).toBeUndefined();
    });
  });

  describe('hireUniversityEmployee', () => {
    it('should add employee to university', () => {
      const university = createUniversityComponent('Test U', 'b1', 1000);
      const employee = hireUniversityEmployee(
        university,
        'agent-123',
        'professor',
        'natural_sciences',
        1000,
        2000
      );

      expect(employee).toBeDefined();
      expect(employee).not.toBeNull();
      expect(university.employees).toHaveLength(1);
      expect(university.employees[0].agentId).toBe('agent-123');
      expect(university.employees[0].role).toBe('professor');
      expect(university.employees[0].department).toBe('natural_sciences');
      expect(university.employees[0].salary).toBe(1000);
      expect(university.employees[0].tenure).toBe(false);
    });

    it('should not hire duplicate employee', () => {
      const university = createUniversityComponent('Test U', 'b1', 1000);
      hireUniversityEmployee(university, 'agent-123', 'professor', 'natural_sciences', 1000, 2000);
      const duplicate = hireUniversityEmployee(university, 'agent-123', 'professor', 'natural_sciences', 1000, 2000);

      expect(duplicate).toBeNull();
      expect(university.employees).toHaveLength(1);
    });

    it('should increase monthly operating costs', () => {
      const university = createUniversityComponent('Test U', 'b1', 1000);
      const initialCosts = university.monthlyOperatingCosts;

      hireUniversityEmployee(university, 'agent-123', 'professor', 'natural_sciences', 500, 2000);

      expect(university.monthlyOperatingCosts).toBe(initialCosts + 500);
    });
  });

  describe('fireUniversityEmployee', () => {
    it('should remove non-tenured employee', () => {
      const university = createUniversityComponent('Test U', 'b1', 1000);
      hireUniversityEmployee(university, 'agent-123', 'professor', 'natural_sciences', 500, 2000);

      const removed = fireUniversityEmployee(university, 'agent-123');

      expect(removed).toBe(true);
      expect(university.employees).toHaveLength(0);
    });

    it('should decrease monthly operating costs', () => {
      const university = createUniversityComponent('Test U', 'b1', 1000);
      hireUniversityEmployee(university, 'agent-123', 'professor', 'natural_sciences', 500, 2000);
      const costsAfterHire = university.monthlyOperatingCosts;

      fireUniversityEmployee(university, 'agent-123');

      expect(university.monthlyOperatingCosts).toBe(costsAfterHire - 500);
    });

    it('should not remove tenured employee', () => {
      const university = createUniversityComponent('Test U', 'b1', 1000);
      hireUniversityEmployee(university, 'agent-123', 'professor', 'natural_sciences', 500, 2000);
      university.employees[0].tenure = true;

      const removed = fireUniversityEmployee(university, 'agent-123');

      expect(removed).toBe(false);
      expect(university.employees).toHaveLength(1);
    });

    it('should return false for non-existent employee', () => {
      const university = createUniversityComponent('Test U', 'b1', 1000);
      const removed = fireUniversityEmployee(university, 'agent-999');

      expect(removed).toBe(false);
    });
  });

  describe('proposeResearch', () => {
    it('should add research project to university', () => {
      const university = createUniversityComponent('Test U', 'b1', 1000);
      const project: ResearchProject = {
        id: 'proj-1',
        title: 'Test Research',
        field: 'biology',
        department: 'natural_sciences',
        principalInvestigator: 'agent-123',
        researchers: ['agent-456'],
        students: [],
        status: 'proposed',
        startedTick: 1000,
        expectedDuration: 2000,
        progress: 0,
        fundingRequired: 10000,
        fundingReceived: 0,
        discoveries: [],
        quality: 0.8,
        novelty: 0.7,
      };

      proposeResearch(university, project);

      expect(university.activeProjects).toHaveLength(1);
      expect(university.activeProjects[0].id).toBe('proj-1');
      expect(university.activeProjects[0].title).toBe('Test Research');
    });
  });

  describe('fundResearch', () => {
    it('should add funding to project', () => {
      const university = createUniversityComponent('Test U', 'b1', 1000);
      university.researchFunding = 10000;

      const project: ResearchProject = {
        id: 'proj-1',
        title: 'Test',
        field: 'physics',
        department: 'natural_sciences',
        principalInvestigator: 'agent-123',
        researchers: [],
        students: [],
        status: 'proposed',
        startedTick: 1000,
        expectedDuration: 2000,
        progress: 0,
        fundingRequired: 5000,
        fundingReceived: 0,
        discoveries: [],
        quality: 0.8,
        novelty: 0.7,
      };
      proposeResearch(university, project);

      const funded = fundResearch(university, 'proj-1', 3000);

      expect(funded).toBe(true);
      expect(project.fundingReceived).toBe(3000);
      expect(university.researchFunding).toBe(7000);
    });

    it('should approve project when fully funded', () => {
      const university = createUniversityComponent('Test U', 'b1', 1000);
      university.researchFunding = 10000;

      const project: ResearchProject = {
        id: 'proj-1',
        title: 'Test',
        field: 'physics',
        department: 'natural_sciences',
        principalInvestigator: 'agent-123',
        researchers: [],
        students: [],
        status: 'proposed',
        startedTick: 1000,
        expectedDuration: 2000,
        progress: 0,
        fundingRequired: 5000,
        fundingReceived: 0,
        discoveries: [],
        quality: 0.8,
        novelty: 0.7,
      };
      proposeResearch(university, project);

      fundResearch(university, 'proj-1', 5000);

      expect(project.status).toBe('approved');
    });

    it('should not fund if insufficient university funds', () => {
      const university = createUniversityComponent('Test U', 'b1', 1000);
      university.researchFunding = 1000;

      const project: ResearchProject = {
        id: 'proj-1',
        title: 'Test',
        field: 'physics',
        department: 'natural_sciences',
        principalInvestigator: 'agent-123',
        researchers: [],
        students: [],
        status: 'proposed',
        startedTick: 1000,
        expectedDuration: 2000,
        progress: 0,
        fundingRequired: 5000,
        fundingReceived: 0,
        discoveries: [],
        quality: 0.8,
        novelty: 0.7,
      };
      proposeResearch(university, project);

      const funded = fundResearch(university, 'proj-1', 3000);

      expect(funded).toBe(false);
      expect(project.fundingReceived).toBe(0);
    });
  });

  describe('startResearch', () => {
    it('should start approved research project', () => {
      const university = createUniversityComponent('Test U', 'b1', 1000);
      const project: ResearchProject = {
        id: 'proj-1',
        title: 'Test',
        field: 'physics',
        department: 'natural_sciences',
        principalInvestigator: 'agent-123',
        researchers: [],
        students: [],
        status: 'approved',
        startedTick: 1000,
        expectedDuration: 2000,
        progress: 0,
        fundingRequired: 0,
        fundingReceived: 0,
        discoveries: [],
        quality: 0.8,
        novelty: 0.7,
      };
      proposeResearch(university, project);

      const started = startResearch(university, 'proj-1', 2000);

      expect(started).toBe(true);
      expect(project.status).toBe('active');
      expect(project.startedTick).toBe(2000);
    });

    it('should not start non-approved project', () => {
      const university = createUniversityComponent('Test U', 'b1', 1000);
      const project: ResearchProject = {
        id: 'proj-1',
        title: 'Test',
        field: 'physics',
        department: 'natural_sciences',
        principalInvestigator: 'agent-123',
        researchers: [],
        students: [],
        status: 'proposed',
        startedTick: 1000,
        expectedDuration: 2000,
        progress: 0,
        fundingRequired: 5000,
        fundingReceived: 0,
        discoveries: [],
        quality: 0.8,
        novelty: 0.7,
      };
      proposeResearch(university, project);

      const started = startResearch(university, 'proj-1', 2000);

      expect(started).toBe(false);
      expect(project.status).toBe('proposed');
    });
  });

  describe('completeResearch', () => {
    it('should mark project as published and add publication', () => {
      const university = createUniversityComponent('Test U', 'b1', 1000);
      const project: ResearchProject = {
        id: 'proj-1',
        title: 'Revolutionary Physics',
        field: 'physics',
        department: 'natural_sciences',
        principalInvestigator: 'agent-123',
        researchers: ['agent-456'],
        students: [],
        status: 'active',
        startedTick: 1000,
        expectedDuration: 2000,
        progress: 100,
        fundingRequired: 0,
        fundingReceived: 0,
        discoveries: [],
        quality: 0.9,
        novelty: 0.85,
      };
      proposeResearch(university, project);

      const completed = completeResearch(university, 'proj-1', 'paper-1', 3000);

      expect(completed).toBeDefined();
      expect(completed).not.toBeNull();
      expect(completed!.status).toBe('published');
      expect(completed!.paperId).toBe('paper-1');
      expect(university.publishedPapers).toHaveLength(1);
      expect(university.publishedPapers[0]).toBe('paper-1');
      expect(university.totalPublications).toBe(1);
    });

    it('should return null for non-existent project', () => {
      const university = createUniversityComponent('Test U', 'b1', 1000);
      const completed = completeResearch(university, 'proj-999', 'paper-1', 3000);

      expect(completed).toBeNull();
    });
  });
});
