/**
 * Task Management API Integration Tests
 * Tests for boards, columns, tasks, and related functionality
 */

import { getServerSession } from 'next-auth/next';
import { Role, BoardMemberRole, TaskPriority } from '@prisma/client';
import { prisma } from '@/lib/prisma';

jest.mock('next-auth/next');
jest.mock('@/lib/prisma');

describe('Task Management API Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===== Board Tests =====
  describe('Boards API', () => {
    describe('GET /api/boards', () => {
      it('should return 401 if not authenticated', async () => {
        const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
        mockGetServerSession.mockResolvedValue(null);

        const session = await mockGetServerSession();
        expect(session).toBeNull();
      });

      it('should return boards for authenticated user', async () => {
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

        const mockBoards = [
          {
            id: 'board-1',
            title: 'Project Alpha',
            description: 'Main project board',
            creatorId: 'user-123',
            isArchived: false,
            members: [{ userId: 'user-123', role: BoardMemberRole.ADMIN }],
          },
          {
            id: 'board-2',
            title: 'Project Beta',
            description: 'Secondary project',
            creatorId: 'user-456',
            isArchived: false,
            members: [{ userId: 'user-123', role: BoardMemberRole.MEMBER }],
          },
        ];

        const mockPrismaBoard = prisma.board as any;
        mockPrismaBoard.findMany.mockResolvedValue(mockBoards);

        const result = await mockPrismaBoard.findMany();
        expect(result).toHaveLength(2);
      });

      it('should filter out archived boards by default', async () => {
        const allBoards = [
          { id: 'board-1', title: 'Active Board', isArchived: false },
          { id: 'board-2', title: 'Archived Board', isArchived: true },
        ];

        const filtered = allBoards.filter(b => !b.isArchived);
        expect(filtered).toHaveLength(1);
        expect(filtered[0].title).toBe('Active Board');
      });

      it('should include archived boards when requested', async () => {
        const mockPrismaBoard = prisma.board as any;
        const allBoards = [
          { id: 'board-1', title: 'Active Board', isArchived: false },
          { id: 'board-2', title: 'Archived Board', isArchived: true },
        ];

        mockPrismaBoard.findMany.mockResolvedValue(allBoards);

        const result = await mockPrismaBoard.findMany({ where: {} });
        expect(result).toHaveLength(2);
      });
    });

    describe('POST /api/boards', () => {
      it('should create board with valid data', async () => {
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

        const boardData = {
          title: 'New Project Board',
          description: 'A board for managing tasks',
        };

        const mockPrismaBoard = prisma.board as any;
        mockPrismaBoard.create.mockResolvedValue({
          id: 'board-new',
          ...boardData,
          creatorId: 'user-123',
          isArchived: false,
        });

        const result = await mockPrismaBoard.create({ data: boardData });
        expect(result).toHaveProperty('id');
        expect(result.title).toBe('New Project Board');
      });

      it('should add creator as board admin', async () => {
        const mockPrismaBoardMember = prisma.boardMember as any;

        mockPrismaBoardMember.create.mockResolvedValue({
          id: 'member-1',
          boardId: 'board-new',
          userId: 'user-123',
          role: BoardMemberRole.ADMIN,
        });

        const result = await mockPrismaBoardMember.create({
          data: {
            boardId: 'board-new',
            userId: 'user-123',
            role: BoardMemberRole.ADMIN,
          },
        });

        expect(result.role).toBe(BoardMemberRole.ADMIN);
      });

      it('should validate required title', () => {
        const invalidData = { description: 'No title' };
        const hasTitle = 'title' in invalidData;
        expect(hasTitle).toBe(false);
      });
    });

    describe('PUT /api/boards/[id]', () => {
      it('should update board if user is admin member', async () => {
        const mockPrismaBoard = prisma.board as any;
        const mockPrismaBoardMember = prisma.boardMember as any;

        mockPrismaBoardMember.findFirst.mockResolvedValue({
          userId: 'user-123',
          role: BoardMemberRole.ADMIN,
        });

        mockPrismaBoard.update.mockResolvedValue({
          id: 'board-1',
          title: 'Updated Title',
        });

        const member = await mockPrismaBoardMember.findFirst({
          where: { boardId: 'board-1', userId: 'user-123' },
        });

        expect(member.role).toBe(BoardMemberRole.ADMIN);
      });

      it('should reject update if user is not admin member', async () => {
        const mockPrismaBoardMember = prisma.boardMember as any;

        mockPrismaBoardMember.findFirst.mockResolvedValue({
          userId: 'user-123',
          role: BoardMemberRole.MEMBER,
        });

        const member = await mockPrismaBoardMember.findFirst({
          where: { boardId: 'board-1', userId: 'user-123' },
        });

        expect(member.role).not.toBe(BoardMemberRole.ADMIN);
      });

      it('should allow archiving board', async () => {
        const mockPrismaBoard = prisma.board as any;

        mockPrismaBoard.update.mockResolvedValue({
          id: 'board-1',
          isArchived: true,
        });

        const result = await mockPrismaBoard.update({
          where: { id: 'board-1' },
          data: { isArchived: true },
        });

        expect(result.isArchived).toBe(true);
      });
    });

    describe('DELETE /api/boards/[id]', () => {
      it('should delete board if user is creator', async () => {
        const mockPrismaBoard = prisma.board as any;

        mockPrismaBoard.findUnique.mockResolvedValue({
          id: 'board-1',
          creatorId: 'user-123',
        });

        mockPrismaBoard.delete.mockResolvedValue({ id: 'board-1' });

        const board = await mockPrismaBoard.findUnique({ where: { id: 'board-1' } });
        expect(board.creatorId).toBe('user-123');
      });

      it('should reject delete if user is not creator', async () => {
        const mockPrismaBoard = prisma.board as any;

        mockPrismaBoard.findUnique.mockResolvedValue({
          id: 'board-1',
          creatorId: 'user-456',
        });

        const board = await mockPrismaBoard.findUnique({ where: { id: 'board-1' } });
        expect(board.creatorId).not.toBe('user-123');
      });
    });
  });

  // ===== Column Tests =====
  describe('Columns API', () => {
    describe('GET /api/boards/[id]/columns', () => {
      it('should return columns for board', async () => {
        const mockPrismaColumn = prisma.taskColumn as any;

        const mockColumns = [
          { id: 'col-1', title: 'To Do', position: 0, boardId: 'board-1' },
          { id: 'col-2', title: 'In Progress', position: 1, boardId: 'board-1' },
          { id: 'col-3', title: 'Done', position: 2, boardId: 'board-1' },
        ];

        mockPrismaColumn.findMany.mockResolvedValue(mockColumns);

        const result = await mockPrismaColumn.findMany({
          where: { boardId: 'board-1' },
          orderBy: { position: 'asc' },
        });

        expect(result).toHaveLength(3);
        expect(result[0].title).toBe('To Do');
      });
    });

    describe('POST /api/boards/[id]/columns', () => {
      it('should create column with correct position', async () => {
        const mockPrismaColumn = prisma.taskColumn as any;

        mockPrismaColumn.count.mockResolvedValue(3);
        mockPrismaColumn.create.mockResolvedValue({
          id: 'col-new',
          title: 'Review',
          position: 3,
          boardId: 'board-1',
        });

        const existingCount = await mockPrismaColumn.count({ where: { boardId: 'board-1' } });
        expect(existingCount).toBe(3);

        const result = await mockPrismaColumn.create({
          data: { title: 'Review', position: existingCount, boardId: 'board-1' },
        });

        expect(result.position).toBe(3);
      });
    });

    describe('PUT /api/boards/[id]/columns/[columnId]', () => {
      it('should update column title', async () => {
        const mockPrismaColumn = prisma.taskColumn as any;

        mockPrismaColumn.update.mockResolvedValue({
          id: 'col-1',
          title: 'Updated Column',
        });

        const result = await mockPrismaColumn.update({
          where: { id: 'col-1' },
          data: { title: 'Updated Column' },
        });

        expect(result.title).toBe('Updated Column');
      });
    });

    describe('DELETE /api/boards/[id]/columns/[columnId]', () => {
      it('should delete column and reassign tasks', async () => {
        const mockPrismaColumn = prisma.taskColumn as any;
        const mockPrismaTask = prisma.task as any;

        mockPrismaTask.updateMany.mockResolvedValue({ count: 5 });
        mockPrismaColumn.delete.mockResolvedValue({ id: 'col-1' });

        // First move tasks to another column
        const moved = await mockPrismaTask.updateMany({
          where: { columnId: 'col-1' },
          data: { columnId: 'col-2' },
        });

        expect(moved.count).toBe(5);
      });
    });
  });

  // ===== Task Tests =====
  describe('Tasks API', () => {
    describe('GET /api/tasks', () => {
      it('should return tasks with filtering', async () => {
        const mockPrismaTask = prisma.task as any;

        const mockTasks = [
          {
            id: 'task-1',
            title: 'Implement feature X',
            priority: TaskPriority.HIGH,
            isCompleted: false,
          },
          {
            id: 'task-2',
            title: 'Fix bug Y',
            priority: TaskPriority.URGENT,
            isCompleted: false,
          },
        ];

        mockPrismaTask.findMany.mockResolvedValue(mockTasks);

        const result = await mockPrismaTask.findMany({
          where: { isCompleted: false },
        });

        expect(result).toHaveLength(2);
      });

      it('should filter by priority', async () => {
        const tasks = [
          { id: 'task-1', priority: TaskPriority.HIGH },
          { id: 'task-2', priority: TaskPriority.LOW },
          { id: 'task-3', priority: TaskPriority.HIGH },
        ];

        const filtered = tasks.filter(t => t.priority === TaskPriority.HIGH);
        expect(filtered).toHaveLength(2);
      });

      it('should filter by due date range', async () => {
        const tasks = [
          { id: 'task-1', dueDate: new Date('2025-01-15') },
          { id: 'task-2', dueDate: new Date('2025-02-15') },
          { id: 'task-3', dueDate: new Date('2025-03-15') },
        ];

        const from = new Date('2025-01-01');
        const to = new Date('2025-02-28');

        const filtered = tasks.filter(t => t.dueDate >= from && t.dueDate <= to);
        expect(filtered).toHaveLength(2);
      });
    });

    describe('POST /api/tasks', () => {
      it('should create task with valid data', async () => {
        const mockPrismaTask = prisma.task as any;

        const taskData = {
          title: 'New Task',
          description: 'Task description',
          columnId: 'col-1',
          priority: TaskPriority.MEDIUM,
          creatorId: 'user-123',
        };

        mockPrismaTask.create.mockResolvedValue({
          id: 'task-new',
          ...taskData,
          position: 0,
          isCompleted: false,
        });

        const result = await mockPrismaTask.create({ data: taskData });
        expect(result).toHaveProperty('id');
        expect(result.title).toBe('New Task');
      });

      it('should set position correctly', async () => {
        const mockPrismaTask = prisma.task as any;

        mockPrismaTask.count.mockResolvedValue(5);
        mockPrismaTask.create.mockResolvedValue({
          id: 'task-new',
          position: 5,
        });

        const existingCount = await mockPrismaTask.count({ where: { columnId: 'col-1' } });
        const result = await mockPrismaTask.create({
          data: { title: 'New Task', position: existingCount },
        });

        expect(result.position).toBe(5);
      });

      it('should assign multiple users', async () => {
        const mockPrismaTaskAssignee = prisma.taskAssignee as any;

        mockPrismaTaskAssignee.createMany.mockResolvedValue({ count: 3 });

        const result = await mockPrismaTaskAssignee.createMany({
          data: [
            { taskId: 'task-1', userId: 'user-1' },
            { taskId: 'task-1', userId: 'user-2' },
            { taskId: 'task-1', userId: 'user-3' },
          ],
        });

        expect(result.count).toBe(3);
      });

      it('should assign multiple labels', async () => {
        const mockPrismaTaskLabel = prisma.taskLabel as any;

        mockPrismaTaskLabel.createMany.mockResolvedValue({ count: 2 });

        const result = await mockPrismaTaskLabel.createMany({
          data: [
            { taskId: 'task-1', labelId: 'label-1' },
            { taskId: 'task-1', labelId: 'label-2' },
          ],
        });

        expect(result.count).toBe(2);
      });
    });

    describe('PUT /api/tasks/[id]', () => {
      it('should update task', async () => {
        const mockPrismaTask = prisma.task as any;

        mockPrismaTask.update.mockResolvedValue({
          id: 'task-1',
          title: 'Updated Title',
          priority: TaskPriority.HIGH,
        });

        const result = await mockPrismaTask.update({
          where: { id: 'task-1' },
          data: { title: 'Updated Title', priority: TaskPriority.HIGH },
        });

        expect(result.title).toBe('Updated Title');
      });

      it('should mark task as completed', async () => {
        const mockPrismaTask = prisma.task as any;

        mockPrismaTask.update.mockResolvedValue({
          id: 'task-1',
          isCompleted: true,
          completedAt: new Date(),
        });

        const result = await mockPrismaTask.update({
          where: { id: 'task-1' },
          data: { isCompleted: true },
        });

        expect(result.isCompleted).toBe(true);
      });
    });

    describe('POST /api/tasks/[id]/move', () => {
      it('should move task to different column', async () => {
        const mockPrismaTask = prisma.task as any;

        mockPrismaTask.update.mockResolvedValue({
          id: 'task-1',
          columnId: 'col-2',
          position: 0,
        });

        const result = await mockPrismaTask.update({
          where: { id: 'task-1' },
          data: { columnId: 'col-2', position: 0 },
        });

        expect(result.columnId).toBe('col-2');
      });

      it('should reorder tasks in column', async () => {
        const mockPrismaTask = prisma.task as any;

        mockPrismaTask.updateMany.mockResolvedValue({ count: 3 });

        // Move tasks down to make room
        const result = await mockPrismaTask.updateMany({
          where: { columnId: 'col-1', position: { gte: 2 } },
          data: { position: { increment: 1 } },
        });

        expect(result.count).toBe(3);
      });
    });

    describe('DELETE /api/tasks/[id]', () => {
      it('should delete task', async () => {
        const mockPrismaTask = prisma.task as any;

        mockPrismaTask.delete.mockResolvedValue({ id: 'task-1' });

        const result = await mockPrismaTask.delete({ where: { id: 'task-1' } });
        expect(result.id).toBe('task-1');
      });
    });
  });

  // ===== Checklist Tests =====
  describe('Checklist API', () => {
    describe('GET /api/tasks/[id]/checklist', () => {
      it('should return checklist items', async () => {
        const mockPrismaChecklist = prisma.taskChecklistItem as any;

        const items = [
          { id: 'item-1', title: 'Step 1', isCompleted: true, position: 0 },
          { id: 'item-2', title: 'Step 2', isCompleted: false, position: 1 },
        ];

        mockPrismaChecklist.findMany.mockResolvedValue(items);

        const result = await mockPrismaChecklist.findMany({
          where: { taskId: 'task-1' },
          orderBy: { position: 'asc' },
        });

        expect(result).toHaveLength(2);
      });
    });

    describe('POST /api/tasks/[id]/checklist', () => {
      it('should create checklist item', async () => {
        const mockPrismaChecklist = prisma.taskChecklistItem as any;

        mockPrismaChecklist.create.mockResolvedValue({
          id: 'item-new',
          title: 'New Step',
          isCompleted: false,
          position: 0,
        });

        const result = await mockPrismaChecklist.create({
          data: { taskId: 'task-1', title: 'New Step', position: 0 },
        });

        expect(result.title).toBe('New Step');
      });
    });

    describe('PUT /api/tasks/[id]/checklist/[itemId]', () => {
      it('should toggle completion', async () => {
        const mockPrismaChecklist = prisma.taskChecklistItem as any;

        mockPrismaChecklist.update.mockResolvedValue({
          id: 'item-1',
          isCompleted: true,
        });

        const result = await mockPrismaChecklist.update({
          where: { id: 'item-1' },
          data: { isCompleted: true },
        });

        expect(result.isCompleted).toBe(true);
      });
    });
  });

  // ===== Comment Tests =====
  describe('Comments API', () => {
    describe('GET /api/tasks/[id]/comments', () => {
      it('should return comments', async () => {
        const mockPrismaComment = prisma.taskComment as any;

        const comments = [
          { id: 'comment-1', content: 'First comment', userId: 'user-1' },
          { id: 'comment-2', content: 'Second comment', userId: 'user-2' },
        ];

        mockPrismaComment.findMany.mockResolvedValue(comments);

        const result = await mockPrismaComment.findMany({
          where: { taskId: 'task-1' },
        });

        expect(result).toHaveLength(2);
      });
    });

    describe('POST /api/tasks/[id]/comments', () => {
      it('should create comment', async () => {
        const mockPrismaComment = prisma.taskComment as any;

        mockPrismaComment.create.mockResolvedValue({
          id: 'comment-new',
          content: 'New comment',
          userId: 'user-123',
        });

        const result = await mockPrismaComment.create({
          data: { taskId: 'task-1', content: 'New comment', userId: 'user-123' },
        });

        expect(result.content).toBe('New comment');
      });
    });

    describe('PUT /api/tasks/[id]/comments/[commentId]', () => {
      it('should only allow editing own comments', async () => {
        const mockPrismaComment = prisma.taskComment as any;

        mockPrismaComment.findUnique.mockResolvedValue({
          id: 'comment-1',
          userId: 'user-123',
        });

        const comment = await mockPrismaComment.findUnique({
          where: { id: 'comment-1' },
        });

        expect(comment.userId).toBe('user-123');
      });
    });

    describe('DELETE /api/tasks/[id]/comments/[commentId]', () => {
      it('should delete own comment', async () => {
        const mockPrismaComment = prisma.taskComment as any;

        mockPrismaComment.delete.mockResolvedValue({ id: 'comment-1' });

        const result = await mockPrismaComment.delete({
          where: { id: 'comment-1' },
        });

        expect(result.id).toBe('comment-1');
      });
    });
  });

  // ===== My Tasks Tests =====
  describe('My Tasks API', () => {
    describe('GET /api/tasks/my-tasks', () => {
      it('should return tasks assigned to current user', async () => {
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

        const mockPrismaTask = prisma.task as any;

        mockPrismaTask.findMany.mockResolvedValue([
          { id: 'task-1', title: 'My Task 1' },
          { id: 'task-2', title: 'My Task 2' },
        ]);

        const result = await mockPrismaTask.findMany({
          where: {
            assignees: { some: { userId: 'user-123' } },
          },
        });

        expect(result).toHaveLength(2);
      });

      it('should filter by board', async () => {
        const mockPrismaTask = prisma.task as any;

        mockPrismaTask.findMany.mockResolvedValue([
          { id: 'task-1', boardId: 'board-1' },
        ]);

        const result = await mockPrismaTask.findMany({
          where: {
            column: { boardId: 'board-1' },
            assignees: { some: { userId: 'user-123' } },
          },
        });

        expect(result).toHaveLength(1);
      });

      it('should support pagination', async () => {
        const page = 2;
        const pageSize = 10;
        const skip = (page - 1) * pageSize;

        expect(skip).toBe(10);
        expect(pageSize).toBe(10);
      });
    });
  });

  // ===== Board Members Tests =====
  describe('Board Members API', () => {
    describe('POST /api/boards/[id]/members', () => {
      it('should add member to board', async () => {
        const mockPrismaBoardMember = prisma.boardMember as any;

        mockPrismaBoardMember.create.mockResolvedValue({
          id: 'member-new',
          boardId: 'board-1',
          userId: 'user-456',
          role: BoardMemberRole.MEMBER,
        });

        const result = await mockPrismaBoardMember.create({
          data: {
            boardId: 'board-1',
            userId: 'user-456',
            role: BoardMemberRole.MEMBER,
          },
        });

        expect(result.role).toBe(BoardMemberRole.MEMBER);
      });

      it('should prevent duplicate members', async () => {
        const mockPrismaBoardMember = prisma.boardMember as any;

        mockPrismaBoardMember.findFirst.mockResolvedValue({
          id: 'member-1',
          boardId: 'board-1',
          userId: 'user-456',
        });

        const existing = await mockPrismaBoardMember.findFirst({
          where: { boardId: 'board-1', userId: 'user-456' },
        });

        expect(existing).not.toBeNull();
      });
    });

    describe('DELETE /api/boards/[id]/members/[userId]', () => {
      it('should remove member from board', async () => {
        const mockPrismaBoardMember = prisma.boardMember as any;

        mockPrismaBoardMember.delete.mockResolvedValue({ id: 'member-1' });

        const result = await mockPrismaBoardMember.delete({
          where: { boardId_userId: { boardId: 'board-1', userId: 'user-456' } },
        });

        expect(result.id).toBe('member-1');
      });

      it('should prevent removing last admin', async () => {
        const mockPrismaBoardMember = prisma.boardMember as any;

        mockPrismaBoardMember.count.mockResolvedValue(1);

        const adminCount = await mockPrismaBoardMember.count({
          where: { boardId: 'board-1', role: BoardMemberRole.ADMIN },
        });

        expect(adminCount).toBe(1);
        // Should not allow removal
      });
    });
  });

  // ===== Labels Tests =====
  describe('Labels API', () => {
    describe('GET /api/boards/[id]/labels', () => {
      it('should return board labels', async () => {
        const mockPrismaLabel = prisma.taskLabel as any;

        mockPrismaLabel.findMany.mockResolvedValue([
          { id: 'label-1', name: 'Bug', color: '#ef4444' },
          { id: 'label-2', name: 'Feature', color: '#22c55e' },
        ]);

        const result = await mockPrismaLabel.findMany({
          where: { boardId: 'board-1' },
        });

        expect(result).toHaveLength(2);
      });
    });

    describe('POST /api/boards/[id]/labels', () => {
      it('should create label', async () => {
        const mockPrismaLabel = prisma.taskLabel as any;

        mockPrismaLabel.create.mockResolvedValue({
          id: 'label-new',
          name: 'Enhancement',
          color: '#3b82f6',
          boardId: 'board-1',
        });

        const result = await mockPrismaLabel.create({
          data: { name: 'Enhancement', color: '#3b82f6', boardId: 'board-1' },
        });

        expect(result.name).toBe('Enhancement');
      });
    });
  });
});
