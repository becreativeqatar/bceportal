/**
 * Tests for Accreditation Validation Schemas
 * @see src/lib/validations/accreditation.ts
 */

import { AccreditationStatus } from '@prisma/client';
import {
  createAccreditationProjectSchema,
  updateAccreditationProjectSchema,
  createAccreditationSchema,
  updateAccreditationSchema,
  submitAccreditationSchema,
  approveAccreditationSchema,
  rejectAccreditationSchema,
  accreditationQuerySchema,
} from '@/lib/validations/accreditation';

// Mock the qatar-timezone module
jest.mock('@/lib/qatar-timezone', () => ({
  dateInputToQatarDate: (dateString: string) => {
    if (!dateString) return null;
    const date = new Date(dateString + 'T12:00:00');
    return isNaN(date.getTime()) ? null : date;
  },
}));

describe('Accreditation Validation Schemas', () => {
  // Helper to create valid sequential dates
  const createSequentialDates = () => {
    const now = new Date();
    return {
      bumpInStart: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      bumpInEnd: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      liveStart: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      liveEnd: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      bumpOutStart: new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      bumpOutEnd: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    };
  };

  describe('createAccreditationProjectSchema', () => {
    it('should validate a complete valid project', () => {
      const dates = createSequentialDates();
      const validProject = {
        name: 'Qatar Sports Event 2025',
        code: 'QSE-2025',
        ...dates,
        accessGroups: ['VIP', 'Media', 'Contractor', 'Security'],
        isActive: true,
      };

      const result = createAccreditationProjectSchema.safeParse(validProject);
      expect(result.success).toBe(true);
    });

    it('should fail when name is missing', () => {
      const dates = createSequentialDates();
      const invalidProject = {
        code: 'QSE-2025',
        ...dates,
        accessGroups: ['VIP'],
      };

      const result = createAccreditationProjectSchema.safeParse(invalidProject);
      expect(result.success).toBe(false);
    });

    it('should fail when name is empty', () => {
      const dates = createSequentialDates();
      const invalidProject = {
        name: '',
        code: 'QSE-2025',
        ...dates,
        accessGroups: ['VIP'],
      };

      const result = createAccreditationProjectSchema.safeParse(invalidProject);
      expect(result.success).toBe(false);
    });

    it('should fail when code is missing', () => {
      const dates = createSequentialDates();
      const invalidProject = {
        name: 'Test Event',
        ...dates,
        accessGroups: ['VIP'],
      };

      const result = createAccreditationProjectSchema.safeParse(invalidProject);
      expect(result.success).toBe(false);
    });

    it('should fail when code exceeds 20 characters', () => {
      const dates = createSequentialDates();
      const invalidProject = {
        name: 'Test Event',
        code: 'A'.repeat(21),
        ...dates,
        accessGroups: ['VIP'],
      };

      const result = createAccreditationProjectSchema.safeParse(invalidProject);
      expect(result.success).toBe(false);
    });

    it('should fail when accessGroups is empty', () => {
      const dates = createSequentialDates();
      const invalidProject = {
        name: 'Test Event',
        code: 'TEST-001',
        ...dates,
        accessGroups: [],
      };

      const result = createAccreditationProjectSchema.safeParse(invalidProject);
      expect(result.success).toBe(false);
    });

    it('should fail when dates are not sequential', () => {
      const invalidProject = {
        name: 'Test Event',
        code: 'TEST-001',
        bumpInStart: '2025-06-10',
        bumpInEnd: '2025-06-08', // Before bumpInStart
        liveStart: '2025-06-12',
        liveEnd: '2025-06-15',
        bumpOutStart: '2025-06-16',
        bumpOutEnd: '2025-06-18',
        accessGroups: ['VIP'],
      };

      const result = createAccreditationProjectSchema.safeParse(invalidProject);
      expect(result.success).toBe(false);
    });

    it('should default isActive to true', () => {
      const dates = createSequentialDates();
      const project = {
        name: 'Test Event',
        code: 'TEST-001',
        ...dates,
        accessGroups: ['VIP'],
      };

      const result = createAccreditationProjectSchema.safeParse(project);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isActive).toBe(true);
      }
    });
  });

  describe('updateAccreditationProjectSchema', () => {
    it('should allow partial updates', () => {
      const dates = createSequentialDates();
      const partialUpdate = {
        bumpInStart: dates.bumpInStart,
        bumpInEnd: dates.bumpInEnd,
      };

      const result = updateAccreditationProjectSchema.safeParse(partialUpdate);
      expect(result.success).toBe(true);
    });

    it('should allow empty object', () => {
      const result = updateAccreditationProjectSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should not allow name or code updates', () => {
      const update = {
        name: 'New Name',
        code: 'NEW-CODE',
      };

      const result = updateAccreditationProjectSchema.safeParse(update);
      // These fields should be stripped since they're omitted from the schema
      if (result.success) {
        expect(result.data).not.toHaveProperty('name');
        expect(result.data).not.toHaveProperty('code');
      }
    });
  });

  describe('createAccreditationSchema', () => {
    const createValidAccreditation = (identificationType: 'qid' | 'passport' = 'qid') => {
      const dates = createSequentialDates();
      const base = {
        firstName: 'John',
        lastName: 'Doe',
        organization: 'Test Organization',
        jobTitle: 'Event Coordinator',
        accessGroup: 'VIP',
        projectId: 'project-123',
        identificationType,
        hasBumpInAccess: true,
        bumpInStart: dates.bumpInStart,
        bumpInEnd: dates.bumpInEnd,
        hasLiveAccess: false,
        hasBumpOutAccess: false,
      };

      if (identificationType === 'qid') {
        return {
          ...base,
          qidNumber: '12345678901',
          qidExpiry: '2026-12-31',
        };
      } else {
        return {
          ...base,
          passportNumber: 'AB1234567',
          passportCountry: 'United Kingdom',
          passportExpiry: '2028-12-31',
          hayyaVisaNumber: 'HV123456',
          hayyaVisaExpiry: '2025-12-31',
        };
      }
    };

    it('should validate a complete accreditation with QID', () => {
      const validAccreditation = createValidAccreditation('qid');
      const result = createAccreditationSchema.safeParse(validAccreditation);
      expect(result.success).toBe(true);
    });

    it('should validate a complete accreditation with Passport', () => {
      const validAccreditation = createValidAccreditation('passport');
      const result = createAccreditationSchema.safeParse(validAccreditation);
      expect(result.success).toBe(true);
    });

    it('should fail when firstName is missing', () => {
      const accreditation = createValidAccreditation();
      delete (accreditation as any).firstName;

      const result = createAccreditationSchema.safeParse(accreditation);
      expect(result.success).toBe(false);
    });

    it('should fail when lastName is missing', () => {
      const accreditation = createValidAccreditation();
      delete (accreditation as any).lastName;

      const result = createAccreditationSchema.safeParse(accreditation);
      expect(result.success).toBe(false);
    });

    it('should fail when organization is missing', () => {
      const accreditation = createValidAccreditation();
      delete (accreditation as any).organization;

      const result = createAccreditationSchema.safeParse(accreditation);
      expect(result.success).toBe(false);
    });

    it('should fail when jobTitle is missing', () => {
      const accreditation = createValidAccreditation();
      delete (accreditation as any).jobTitle;

      const result = createAccreditationSchema.safeParse(accreditation);
      expect(result.success).toBe(false);
    });

    it('should fail when projectId is missing', () => {
      const accreditation = createValidAccreditation();
      delete (accreditation as any).projectId;

      const result = createAccreditationSchema.safeParse(accreditation);
      expect(result.success).toBe(false);
    });

    it('should fail when QID number is not 11 digits', () => {
      const accreditation = createValidAccreditation('qid');
      (accreditation as any).qidNumber = '123456789'; // Only 9 digits

      const result = createAccreditationSchema.safeParse(accreditation);
      expect(result.success).toBe(false);
    });

    it('should fail when QID selected but QID fields missing', () => {
      const accreditation = createValidAccreditation('qid');
      delete (accreditation as any).qidNumber;
      delete (accreditation as any).qidExpiry;

      const result = createAccreditationSchema.safeParse(accreditation);
      expect(result.success).toBe(false);
    });

    it('should fail when Passport selected but passport fields missing', () => {
      const accreditation = createValidAccreditation('passport');
      delete (accreditation as any).passportNumber;

      const result = createAccreditationSchema.safeParse(accreditation);
      expect(result.success).toBe(false);
    });

    it('should fail when passport number is too short', () => {
      const accreditation = createValidAccreditation('passport');
      (accreditation as any).passportNumber = 'ABC12'; // Only 5 characters

      const result = createAccreditationSchema.safeParse(accreditation);
      expect(result.success).toBe(false);
    });

    it('should fail when passport number is too long', () => {
      const accreditation = createValidAccreditation('passport');
      (accreditation as any).passportNumber = 'A'.repeat(13); // 13 characters

      const result = createAccreditationSchema.safeParse(accreditation);
      expect(result.success).toBe(false);
    });

    it('should fail when passport number contains special characters', () => {
      const accreditation = createValidAccreditation('passport');
      (accreditation as any).passportNumber = 'AB-123456'; // Contains hyphen

      const result = createAccreditationSchema.safeParse(accreditation);
      expect(result.success).toBe(false);
    });

    it('should fail when no access phase is selected', () => {
      const dates = createSequentialDates();
      const accreditation = {
        firstName: 'John',
        lastName: 'Doe',
        organization: 'Test',
        jobTitle: 'Coordinator',
        accessGroup: 'VIP',
        projectId: 'project-123',
        identificationType: 'qid',
        qidNumber: '12345678901',
        qidExpiry: '2026-12-31',
        hasBumpInAccess: false,
        hasLiveAccess: false,
        hasBumpOutAccess: false,
      };

      const result = createAccreditationSchema.safeParse(accreditation);
      expect(result.success).toBe(false);
    });

    it('should fail when bump-in access enabled but dates missing', () => {
      const accreditation = {
        firstName: 'John',
        lastName: 'Doe',
        organization: 'Test',
        jobTitle: 'Coordinator',
        accessGroup: 'VIP',
        projectId: 'project-123',
        identificationType: 'qid',
        qidNumber: '12345678901',
        qidExpiry: '2026-12-31',
        hasBumpInAccess: true,
        // Missing bumpInStart and bumpInEnd
        hasLiveAccess: false,
        hasBumpOutAccess: false,
      };

      const result = createAccreditationSchema.safeParse(accreditation);
      expect(result.success).toBe(false);
    });

    it('should default status to DRAFT', () => {
      const accreditation = createValidAccreditation();
      const result = createAccreditationSchema.safeParse(accreditation);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe(AccreditationStatus.DRAFT);
      }
    });
  });

  describe('updateAccreditationSchema', () => {
    it('should allow partial updates', () => {
      const partialUpdate = {
        firstName: 'Jane',
        lastName: 'Smith',
      };

      const result = updateAccreditationSchema.safeParse(partialUpdate);
      expect(result.success).toBe(true);
    });

    it('should allow empty object', () => {
      const result = updateAccreditationSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should not allow projectId update', () => {
      const update = {
        projectId: 'new-project-id',
      };

      const result = updateAccreditationSchema.safeParse(update);
      if (result.success) {
        expect(result.data).not.toHaveProperty('projectId');
      }
    });
  });

  describe('submitAccreditationSchema', () => {
    it('should validate with accreditation ID', () => {
      const submission = {
        accreditationId: 'accred-123',
      };

      const result = submitAccreditationSchema.safeParse(submission);
      expect(result.success).toBe(true);
    });

    it('should fail without accreditation ID', () => {
      const result = submitAccreditationSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should fail with empty accreditation ID', () => {
      const result = submitAccreditationSchema.safeParse({ accreditationId: '' });
      expect(result.success).toBe(false);
    });
  });

  describe('approveAccreditationSchema', () => {
    it('should validate with optional notes', () => {
      const approval = {
        notes: 'Approved after document verification',
      };

      const result = approveAccreditationSchema.safeParse(approval);
      expect(result.success).toBe(true);
    });

    it('should validate without notes', () => {
      const result = approveAccreditationSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should accept null notes', () => {
      const result = approveAccreditationSchema.safeParse({ notes: null });
      expect(result.success).toBe(true);
    });
  });

  describe('rejectAccreditationSchema', () => {
    it('should validate with rejection notes', () => {
      const rejection = {
        notes: 'Invalid documentation provided',
      };

      const result = rejectAccreditationSchema.safeParse(rejection);
      expect(result.success).toBe(true);
    });

    it('should fail without notes', () => {
      const result = rejectAccreditationSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should fail with empty notes', () => {
      const result = rejectAccreditationSchema.safeParse({ notes: '' });
      expect(result.success).toBe(false);
    });
  });

  describe('accreditationQuerySchema', () => {
    it('should validate empty query (use defaults)', () => {
      const result = accreditationQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.p).toBe(1);
        expect(result.data.ps).toBe(20);
        expect(result.data.sort).toBe('createdAt');
        expect(result.data.order).toBe('desc');
      }
    });

    it('should validate query with filters', () => {
      const query = {
        projectId: 'project-123',
        status: AccreditationStatus.APPROVED,
        accessGroup: 'VIP',
        q: 'john',
        p: 2,
        ps: 50,
      };

      const result = accreditationQuerySchema.safeParse(query);
      expect(result.success).toBe(true);
    });

    it('should validate all status options', () => {
      const statuses = [
        AccreditationStatus.DRAFT,
        AccreditationStatus.PENDING,
        AccreditationStatus.APPROVED,
        AccreditationStatus.REJECTED,
        AccreditationStatus.REVOKED,
        AccreditationStatus.ISSUED,
      ];

      statuses.forEach(status => {
        const result = accreditationQuerySchema.safeParse({ status });
        expect(result.success).toBe(true);
      });
    });

    it('should coerce page and pageSize from strings', () => {
      const query = {
        p: '3',
        ps: '25',
      };

      const result = accreditationQuerySchema.safeParse(query);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.p).toBe(3);
        expect(result.data.ps).toBe(25);
      }
    });

    it('should fail with invalid page number', () => {
      const query = { p: 0 };
      const result = accreditationQuerySchema.safeParse(query);
      expect(result.success).toBe(false);
    });

    it('should fail with page size over 100', () => {
      const query = { ps: 101 };
      const result = accreditationQuerySchema.safeParse(query);
      expect(result.success).toBe(false);
    });

    it('should validate sort options', () => {
      const validSorts = ['accreditationNumber', 'firstName', 'organization', 'createdAt'];

      validSorts.forEach(sort => {
        const result = accreditationQuerySchema.safeParse({ sort });
        expect(result.success).toBe(true);
      });
    });

    it('should fail with invalid sort option', () => {
      const query = { sort: 'invalidField' };
      const result = accreditationQuerySchema.safeParse(query);
      expect(result.success).toBe(false);
    });
  });
});
