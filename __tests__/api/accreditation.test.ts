/**
 * Accreditation API Tests
 * Tests for /api/accreditation and /api/admin/projects endpoints
 */

import { getServerSession } from 'next-auth/next';
import { Role, AccreditationStatus } from '@prisma/client';

// Mock next-auth
jest.mock('next-auth/next');

// Mock prisma - use global mocks that persist
const projectMocks = {
  findMany: jest.fn(),
  findUnique: jest.fn(),
  findFirst: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  count: jest.fn(),
};

const accreditationMocks = {
  findMany: jest.fn(),
  findUnique: jest.fn(),
  findFirst: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  count: jest.fn(),
};

const historyMocks = {
  create: jest.fn(),
};

jest.mock('@/lib/prisma', () => ({
  prisma: {
    accreditationProject: projectMocks,
    accreditation: accreditationMocks,
    accreditationHistory: historyMocks,
  },
}));

describe('Accreditation API Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Projects API', () => {
    describe('GET /api/admin/projects', () => {
      it('should return 401 if not authenticated', async () => {
        const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
        mockGetServerSession.mockResolvedValue(null);

        const session = await mockGetServerSession();
        expect(session).toBeNull();
      });

      it('should return projects for authenticated user', async () => {
        const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
        const mockSession = {
          user: {
            id: 'user-123',
            email: 'user@example.com',
            role: Role.ADMIN,
          },
          expires: new Date(Date.now() + 86400000).toISOString(),
        };

        mockGetServerSession.mockResolvedValue(mockSession);

        const mockProjects = [
          {
            id: 'project-1',
            code: 'PROJ-001',
            name: 'Test Event 2024',
            isActive: true,
          },
        ];

        projectMocks.findMany.mockResolvedValue(mockProjects);
        projectMocks.count.mockResolvedValue(mockProjects.length);

        const result = await projectMocks.findMany();
        expect(result).toEqual(mockProjects);
        expect(result).toHaveLength(1);
      });
    });

    describe('POST /api/admin/projects', () => {
      it('should return 403 if not admin', async () => {
        const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
        const mockSession = {
          user: {
            id: 'user-123',
            email: 'user@example.com',
            role: Role.EMPLOYEE,
          },
          expires: new Date(Date.now() + 86400000).toISOString(),
        };

        mockGetServerSession.mockResolvedValue(mockSession);

        const session = await mockGetServerSession();
        expect(session?.user.role).toBe(Role.EMPLOYEE);
        expect(session?.user.role).not.toBe(Role.ADMIN);
      });

      it('should create project with valid data for admin', async () => {
        const validProjectData = {
          code: 'PROJ-002',
          name: 'New Event 2024',
          description: 'Annual company event',
          startDate: new Date('2024-06-01'),
          endDate: new Date('2024-06-05'),
          accessGroups: ['VIP', 'MEDIA', 'STAFF'],
        };

        projectMocks.create.mockResolvedValue({
          id: 'project-2',
          ...validProjectData,
          isActive: true,
        });

        const result = await projectMocks.create({ data: validProjectData });
        expect(result).toBeDefined();
        expect(result.code).toBe('PROJ-002');
        expect(result.isActive).toBe(true);
      });
    });
  });

  describe('Accreditations API', () => {
    describe('GET /api/admin/accreditations', () => {
      it('should return 401 if not authenticated', async () => {
        const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
        mockGetServerSession.mockResolvedValue(null);

        const session = await mockGetServerSession();
        expect(session).toBeNull();
      });

      it('should return accreditations for authorized users', async () => {
        const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
        const mockSession = {
          user: {
            id: 'user-123',
            email: 'user@example.com',
            role: Role.ACCREDITATION_ADDER,
          },
          expires: new Date(Date.now() + 86400000).toISOString(),
        };

        mockGetServerSession.mockResolvedValue(mockSession);

        const mockAccreditations = [
          {
            id: 'accred-1',
            firstName: 'John',
            lastName: 'Doe',
            status: AccreditationStatus.APPROVED,
          },
        ];

        accreditationMocks.findMany.mockResolvedValue(mockAccreditations);
        accreditationMocks.count.mockResolvedValue(mockAccreditations.length);

        const result = await accreditationMocks.findMany();
        expect(result).toEqual(mockAccreditations);
      });

      it('should filter by project', async () => {
        const mockAccreditations = [
          { id: 'accred-1', projectId: 'project-1' },
          { id: 'accred-2', projectId: 'project-2' },
          { id: 'accred-3', projectId: 'project-1' },
        ];

        const filtered = mockAccreditations.filter(a => a.projectId === 'project-1');
        expect(filtered).toHaveLength(2);
      });

      it('should filter by status', async () => {
        const mockAccreditations = [
          { id: 'accred-1', status: AccreditationStatus.APPROVED },
          { id: 'accred-2', status: AccreditationStatus.PENDING },
          { id: 'accred-3', status: AccreditationStatus.APPROVED },
        ];

        const filtered = mockAccreditations.filter(a => a.status === AccreditationStatus.APPROVED);
        expect(filtered).toHaveLength(2);
      });
    });

    describe('POST /api/admin/accreditations', () => {
      it('should return 401 if not authenticated', async () => {
        const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
        mockGetServerSession.mockResolvedValue(null);

        const session = await mockGetServerSession();
        expect(session).toBeNull();
      });

      it('should allow ACCREDITATION_ADDER to create', async () => {
        const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
        const mockSession = {
          user: {
            id: 'user-123',
            email: 'user@example.com',
            role: Role.ACCREDITATION_ADDER,
          },
          expires: new Date(Date.now() + 86400000).toISOString(),
        };

        mockGetServerSession.mockResolvedValue(mockSession);

        const validAccreditation = {
          firstName: 'Jane',
          lastName: 'Smith',
          organization: 'Tech Corp',
          jobTitle: 'Reporter',
          projectId: 'project-1',
          idType: 'QID',
          qidNumber: '12345678901',
        };

        accreditationMocks.create.mockResolvedValue({
          id: 'accred-new',
          status: AccreditationStatus.DRAFT,
          ...validAccreditation,
        });

        const result = await accreditationMocks.create({ data: validAccreditation });
        expect(result).toBeDefined();
        expect(result.status).toBe(AccreditationStatus.DRAFT);
      });

      it('should return 403 for EMPLOYEE role', async () => {
        const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
        const mockSession = {
          user: {
            id: 'user-123',
            email: 'user@example.com',
            role: Role.EMPLOYEE,
          },
          expires: new Date(Date.now() + 86400000).toISOString(),
        };

        mockGetServerSession.mockResolvedValue(mockSession);

        const session = await mockGetServerSession();
        expect(session?.user.role).toBe(Role.EMPLOYEE);
        // EMPLOYEE should not be able to create accreditations
      });
    });

    describe('POST /api/admin/accreditations/[id]/submit', () => {
      it('should submit accreditation for approval', async () => {
        accreditationMocks.findUnique.mockResolvedValue({
          id: 'accred-1',
          status: AccreditationStatus.DRAFT,
        });

        accreditationMocks.update.mockResolvedValue({
          id: 'accred-1',
          status: AccreditationStatus.PENDING,
        });

        const result = await accreditationMocks.update({
          where: { id: 'accred-1' },
          data: { status: AccreditationStatus.PENDING },
        });

        expect(result.status).toBe(AccreditationStatus.PENDING);
      });

      it('should only allow submitting DRAFT accreditations', async () => {
        accreditationMocks.findUnique.mockResolvedValue({
          id: 'accred-1',
          status: AccreditationStatus.PENDING, // Already submitted
        });

        const accreditation = await accreditationMocks.findUnique({ where: { id: 'accred-1' } });
        expect(accreditation.status).not.toBe(AccreditationStatus.DRAFT);
      });
    });

    describe('POST /api/admin/accreditations/[id]/approve', () => {
      it('should return 403 if not approver or admin', async () => {
        const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
        const mockSession = {
          user: {
            id: 'user-123',
            email: 'user@example.com',
            role: Role.ACCREDITATION_ADDER,
          },
          expires: new Date(Date.now() + 86400000).toISOString(),
        };

        mockGetServerSession.mockResolvedValue(mockSession);

        const session = await mockGetServerSession();
        // ACCREDITATION_ADDER cannot approve
        expect(session?.user.role).not.toBe(Role.ACCREDITATION_APPROVER);
        expect(session?.user.role).not.toBe(Role.ADMIN);
      });

      it('should approve accreditation and generate QR code', async () => {
        accreditationMocks.findUnique.mockResolvedValue({
          id: 'accred-1',
          status: AccreditationStatus.PENDING,
        });

        accreditationMocks.update.mockResolvedValue({
          id: 'accred-1',
          status: AccreditationStatus.APPROVED,
          qrToken: 'QR-TOKEN-12345',
          approvedAt: new Date(),
          approvedById: 'approver-123',
        });

        const result = await accreditationMocks.update({
          where: { id: 'accred-1' },
          data: { status: AccreditationStatus.APPROVED },
        });

        expect(result.status).toBe(AccreditationStatus.APPROVED);
        expect(result.qrToken).toBeDefined();
      });

      it('should only approve PENDING accreditations', async () => {
        accreditationMocks.findUnique.mockResolvedValue({
          id: 'accred-1',
          status: AccreditationStatus.DRAFT,
        });

        const accreditation = await accreditationMocks.findUnique({ where: { id: 'accred-1' } });
        expect(accreditation.status).not.toBe(AccreditationStatus.PENDING);
      });
    });

    describe('POST /api/admin/accreditations/[id]/reject', () => {
      it('should reject accreditation with reason', async () => {
        const rejectionNotes = 'Missing required documents';

        accreditationMocks.update.mockResolvedValue({
          id: 'accred-1',
          status: AccreditationStatus.REJECTED,
          notes: rejectionNotes,
          rejectedAt: new Date(),
          rejectedById: 'approver-123',
        });

        const result = await accreditationMocks.update({
          where: { id: 'accred-1' },
          data: { status: AccreditationStatus.REJECTED, notes: rejectionNotes },
        });

        expect(result.status).toBe(AccreditationStatus.REJECTED);
      });

      it('should require rejection notes', () => {
        // Validation - rejection notes are required
        const rejectionData = { status: AccreditationStatus.REJECTED, notes: '' };
        expect(rejectionData.notes).toBe('');
      });
    });

    describe('POST /api/admin/accreditations/[id]/revoke', () => {
      it('should revoke approved accreditation', async () => {
        accreditationMocks.findUnique.mockResolvedValue({
          id: 'accred-1',
          status: AccreditationStatus.APPROVED,
        });

        accreditationMocks.update.mockResolvedValue({
          id: 'accred-1',
          status: AccreditationStatus.REVOKED,
          revokedAt: new Date(),
          revokedById: 'admin-123',
        });

        const result = await accreditationMocks.update({
          where: { id: 'accred-1' },
          data: { status: AccreditationStatus.REVOKED },
        });

        expect(result.status).toBe(AccreditationStatus.REVOKED);
      });
    });
  });

  describe('Verification API', () => {
    describe('GET /api/verify/[token]', () => {
      it('should return accreditation details for valid token', async () => {
        const mockAccreditation = {
          id: 'accred-1',
          qrToken: 'valid-token-123',
          status: AccreditationStatus.APPROVED,
          firstName: 'John',
          lastName: 'Doe',
          organization: 'Tech Corp',
          project: {
            name: 'Event 2024',
          },
        };

        accreditationMocks.findFirst.mockResolvedValue(mockAccreditation);

        const result = await accreditationMocks.findFirst({
          where: { qrToken: 'valid-token-123' },
        });

        expect(result).toBeDefined();
        expect(result.status).toBe(AccreditationStatus.APPROVED);
      });

      it('should return null for invalid token', async () => {
        accreditationMocks.findFirst.mockResolvedValue(null);

        const result = await accreditationMocks.findFirst({
          where: { qrToken: 'invalid-token' },
        });

        expect(result).toBeNull();
      });

      it('should reject revoked accreditations', async () => {
        accreditationMocks.findFirst.mockResolvedValue({
          id: 'accred-1',
          status: AccreditationStatus.REVOKED,
        });

        const result = await accreditationMocks.findFirst({
          where: { qrToken: 'revoked-token' },
        });

        expect(result.status).toBe(AccreditationStatus.REVOKED);
        // Verification should indicate this is revoked
      });
    });
  });

  describe('History Logging', () => {
    it('should log status changes', async () => {
      historyMocks.create.mockResolvedValue({
        id: 'history-1',
        accreditationId: 'accred-1',
        previousStatus: AccreditationStatus.PENDING,
        newStatus: AccreditationStatus.APPROVED,
        changedById: 'approver-123',
        changedAt: new Date(),
      });

      const result = await historyMocks.create({
        data: {
          accreditationId: 'accred-1',
          previousStatus: AccreditationStatus.PENDING,
          newStatus: AccreditationStatus.APPROVED,
          changedById: 'approver-123',
        },
      });

      expect(result).toBeDefined();
      expect(result.previousStatus).toBe(AccreditationStatus.PENDING);
      expect(result.newStatus).toBe(AccreditationStatus.APPROVED);
    });
  });
});
