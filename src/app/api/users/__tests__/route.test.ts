import { NextRequest } from 'next/server';
import { GET, POST } from '../route';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';
import { logAction } from '@/lib/activity';

// Mock dependencies
jest.mock('next-auth/next');
jest.mock('@/lib/prisma');
jest.mock('@/lib/activity');

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockLogAction = logAction as jest.MockedFunction<typeof logAction>;

describe('Users API Route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/users', () => {
    it('should return 401 if not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/users');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 401 if user is not admin', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: '1', role: Role.EMPLOYEE },
        expires: '2024-12-31',
      } as any);

      const request = new NextRequest('http://localhost:3000/api/users');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return users for admin', async () => {
      const mockUsers = [
        {
          id: '1',
          name: 'John Doe',
          email: 'john@example.com',
          role: Role.EMPLOYEE,
          _count: { assets: 5, subscriptions: 3 },
        },
        {
          id: '2',
          name: 'Jane Smith',
          email: 'jane@example.com',
          role: Role.ADMIN,
          _count: { assets: 0, subscriptions: 0 },
        },
      ];

      mockGetServerSession.mockResolvedValue({
        user: { id: '1', role: Role.ADMIN },
        expires: '2024-12-31',
      } as any);

      (prisma.user.findMany as jest.Mock).mockResolvedValue(mockUsers);

      const request = new NextRequest('http://localhost:3000/api/users');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockUsers);
      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: {},
        include: {
          _count: {
            select: {
              assets: true,
              subscriptions: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter users by role when role parameter provided', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: '1', role: Role.ADMIN },
        expires: '2024-12-31',
      } as any);

      (prisma.user.findMany as jest.Mock).mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/users?role=EMPLOYEE');
      const response = await GET(request);

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { role: 'EMPLOYEE' },
        })
      );
    });

    it('should handle errors gracefully', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: '1', role: Role.ADMIN },
        expires: '2024-12-31',
      } as any);

      (prisma.user.findMany as jest.Mock).mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/users');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch users');
    });
  });

  describe('POST /api/users', () => {
    it('should return 401 if not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/users', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test', email: 'test@example.com' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 for invalid request body', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: '1', role: Role.ADMIN },
        expires: '2024-12-31',
      } as any);

      const request = new NextRequest('http://localhost:3000/api/users', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test' }), // Missing email
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request body');
    });

    it('should return 409 if user with email already exists', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: '1', role: Role.ADMIN },
        expires: '2024-12-31',
      } as any);

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: '2',
        email: 'existing@example.com',
      });

      const request = new NextRequest('http://localhost:3000/api/users', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test User',
          email: 'existing@example.com',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe('User with this email already exists');
    });

    it('should create user successfully', async () => {
      const mockNewUser = {
        id: '3',
        name: 'New User',
        email: 'new@example.com',
        role: Role.EMPLOYEE,
        isTemporaryStaff: false,
        _count: { assets: 0, subscriptions: 0 },
      };

      mockGetServerSession.mockResolvedValue({
        user: { id: '1', role: Role.ADMIN },
        expires: '2024-12-31',
      } as any);

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue(mockNewUser);
      mockLogAction.mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost:3000/api/users', {
        method: 'POST',
        body: JSON.stringify({
          name: 'New User',
          email: 'new@example.com',
          role: Role.EMPLOYEE,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toEqual(mockNewUser);
      expect(prisma.user.create).toHaveBeenCalled();
      expect(mockLogAction).toHaveBeenCalledWith(
        '1',
        expect.any(String),
        'User',
        '3',
        expect.objectContaining({
          userName: 'New User',
          userEmail: 'new@example.com',
        })
      );
    });

    it('should handle database errors gracefully', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: '1', role: Role.ADMIN },
        expires: '2024-12-31',
      } as any);

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/users', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test User',
          email: 'test@example.com',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to create user');
      expect(data.details).toBe('Database error');
    });
  });
});
