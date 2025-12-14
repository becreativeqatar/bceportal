/**
 * Tests for Task Management Validation Schemas
 * @see src/lib/validations/tasks.ts
 */

import { BoardMemberRole, TaskPriority } from '@prisma/client';
import {
  createBoardSchema,
  updateBoardSchema,
  addBoardMemberSchema,
  updateBoardMemberSchema,
  createColumnSchema,
  updateColumnSchema,
  reorderColumnsSchema,
  createLabelSchema,
  updateLabelSchema,
  createTaskSchema,
  updateTaskSchema,
  moveTaskSchema,
  reorderTasksSchema,
  assignTaskSchema,
  setTaskLabelsSchema,
  createChecklistItemSchema,
  updateChecklistItemSchema,
  reorderChecklistSchema,
  createCommentSchema,
  updateCommentSchema,
  boardQuerySchema,
  taskQuerySchema,
  myTasksQuerySchema,
} from '@/lib/validations/tasks';

describe('Task Management Validation Schemas', () => {
  // ===== Board Schemas =====
  describe('createBoardSchema', () => {
    it('should validate a valid board', () => {
      const validBoard = {
        title: 'Project Board',
        description: 'A board for managing project tasks',
      };
      const result = createBoardSchema.safeParse(validBoard);
      expect(result.success).toBe(true);
    });

    it('should validate minimal board (title only)', () => {
      const minimalBoard = { title: 'My Board' };
      const result = createBoardSchema.safeParse(minimalBoard);
      expect(result.success).toBe(true);
    });

    it('should fail when title is missing', () => {
      const result = createBoardSchema.safeParse({ description: 'Some description' });
      expect(result.success).toBe(false);
    });

    it('should fail when title is empty', () => {
      const result = createBoardSchema.safeParse({ title: '' });
      expect(result.success).toBe(false);
    });

    it('should fail when title exceeds 100 characters', () => {
      const result = createBoardSchema.safeParse({ title: 'a'.repeat(101) });
      expect(result.success).toBe(false);
    });

    it('should fail when description exceeds 500 characters', () => {
      const result = createBoardSchema.safeParse({
        title: 'Valid Title',
        description: 'a'.repeat(501)
      });
      expect(result.success).toBe(false);
    });

    it('should accept null description', () => {
      const result = createBoardSchema.safeParse({ title: 'Board', description: null });
      expect(result.success).toBe(true);
    });
  });

  describe('updateBoardSchema', () => {
    it('should allow partial updates', () => {
      const result = updateBoardSchema.safeParse({ title: 'New Title' });
      expect(result.success).toBe(true);
    });

    it('should allow empty update', () => {
      const result = updateBoardSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should validate isArchived field', () => {
      const result = updateBoardSchema.safeParse({ isArchived: true });
      expect(result.success).toBe(true);
    });

    it('should fail with empty title', () => {
      const result = updateBoardSchema.safeParse({ title: '' });
      expect(result.success).toBe(false);
    });
  });

  describe('addBoardMemberSchema', () => {
    it('should validate member with default role', () => {
      const result = addBoardMemberSchema.safeParse({ userId: 'user-123' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.role).toBe(BoardMemberRole.MEMBER);
      }
    });

    it('should validate member with ADMIN role', () => {
      const result = addBoardMemberSchema.safeParse({
        userId: 'user-123',
        role: BoardMemberRole.ADMIN
      });
      expect(result.success).toBe(true);
    });

    it('should fail without userId', () => {
      const result = addBoardMemberSchema.safeParse({ role: BoardMemberRole.MEMBER });
      expect(result.success).toBe(false);
    });

    it('should fail with empty userId', () => {
      const result = addBoardMemberSchema.safeParse({ userId: '' });
      expect(result.success).toBe(false);
    });

    it('should fail with invalid role', () => {
      const result = addBoardMemberSchema.safeParse({
        userId: 'user-123',
        role: 'INVALID_ROLE'
      });
      expect(result.success).toBe(false);
    });
  });

  describe('updateBoardMemberSchema', () => {
    it('should validate role update', () => {
      const result = updateBoardMemberSchema.safeParse({ role: BoardMemberRole.ADMIN });
      expect(result.success).toBe(true);
    });

    it('should fail without role', () => {
      const result = updateBoardMemberSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  // ===== Column Schemas =====
  describe('createColumnSchema', () => {
    it('should validate a valid column', () => {
      const result = createColumnSchema.safeParse({ title: 'To Do', position: 0 });
      expect(result.success).toBe(true);
    });

    it('should validate column without position', () => {
      const result = createColumnSchema.safeParse({ title: 'In Progress' });
      expect(result.success).toBe(true);
    });

    it('should fail with empty title', () => {
      const result = createColumnSchema.safeParse({ title: '' });
      expect(result.success).toBe(false);
    });

    it('should fail when title exceeds 50 characters', () => {
      const result = createColumnSchema.safeParse({ title: 'a'.repeat(51) });
      expect(result.success).toBe(false);
    });

    it('should fail with negative position', () => {
      const result = createColumnSchema.safeParse({ title: 'Column', position: -1 });
      expect(result.success).toBe(false);
    });
  });

  describe('updateColumnSchema', () => {
    it('should allow partial update', () => {
      const result = updateColumnSchema.safeParse({ title: 'Updated Column' });
      expect(result.success).toBe(true);
    });

    it('should allow empty update', () => {
      const result = updateColumnSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe('reorderColumnsSchema', () => {
    it('should validate column reorder', () => {
      const result = reorderColumnsSchema.safeParse({
        columnIds: ['col-1', 'col-2', 'col-3']
      });
      expect(result.success).toBe(true);
    });

    it('should fail with empty array', () => {
      const result = reorderColumnsSchema.safeParse({ columnIds: [] });
      expect(result.success).toBe(false);
    });

    it('should fail without columnIds', () => {
      const result = reorderColumnsSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  // ===== Label Schemas =====
  describe('createLabelSchema', () => {
    it('should validate a valid label', () => {
      const result = createLabelSchema.safeParse({ name: 'Bug', color: '#ef4444' });
      expect(result.success).toBe(true);
    });

    it('should fail with empty name', () => {
      const result = createLabelSchema.safeParse({ name: '', color: '#ef4444' });
      expect(result.success).toBe(false);
    });

    it('should fail when name exceeds 30 characters', () => {
      const result = createLabelSchema.safeParse({ name: 'a'.repeat(31), color: '#ef4444' });
      expect(result.success).toBe(false);
    });

    it('should fail with invalid hex color', () => {
      const invalidColors = ['red', '#fff', '#GGGGGG', '123456', '#12345'];
      invalidColors.forEach(color => {
        const result = createLabelSchema.safeParse({ name: 'Label', color });
        expect(result.success).toBe(false);
      });
    });

    it('should accept valid hex colors', () => {
      const validColors = ['#000000', '#ffffff', '#3b82f6', '#AABBCC'];
      validColors.forEach(color => {
        const result = createLabelSchema.safeParse({ name: 'Label', color });
        expect(result.success).toBe(true);
      });
    });
  });

  describe('updateLabelSchema', () => {
    it('should allow partial update', () => {
      const result = updateLabelSchema.safeParse({ name: 'Updated Label' });
      expect(result.success).toBe(true);
    });

    it('should allow updating only color', () => {
      const result = updateLabelSchema.safeParse({ color: '#10b981' });
      expect(result.success).toBe(true);
    });

    it('should allow empty update', () => {
      const result = updateLabelSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  // ===== Task Schemas =====
  describe('createTaskSchema', () => {
    it('should validate a complete task', () => {
      const validTask = {
        title: 'Implement feature X',
        description: 'Detailed description of the task',
        columnId: 'col-123',
        priority: TaskPriority.HIGH,
        dueDate: '2025-01-15',
        assigneeIds: ['user-1', 'user-2'],
        labelIds: ['label-1'],
        position: 0,
      };
      const result = createTaskSchema.safeParse(validTask);
      expect(result.success).toBe(true);
    });

    it('should validate minimal task', () => {
      const minimalTask = {
        title: 'Simple task',
        columnId: 'col-123',
      };
      const result = createTaskSchema.safeParse(minimalTask);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.priority).toBe(TaskPriority.MEDIUM);
        expect(result.data.assigneeIds).toEqual([]);
        expect(result.data.labelIds).toEqual([]);
      }
    });

    it('should fail without title', () => {
      const result = createTaskSchema.safeParse({ columnId: 'col-123' });
      expect(result.success).toBe(false);
    });

    it('should fail with empty title', () => {
      const result = createTaskSchema.safeParse({ title: '', columnId: 'col-123' });
      expect(result.success).toBe(false);
    });

    it('should fail when title exceeds 200 characters', () => {
      const result = createTaskSchema.safeParse({
        title: 'a'.repeat(201),
        columnId: 'col-123'
      });
      expect(result.success).toBe(false);
    });

    it('should fail without columnId', () => {
      const result = createTaskSchema.safeParse({ title: 'Task' });
      expect(result.success).toBe(false);
    });

    it('should fail with empty columnId', () => {
      const result = createTaskSchema.safeParse({ title: 'Task', columnId: '' });
      expect(result.success).toBe(false);
    });

    it('should fail when description exceeds 5000 characters', () => {
      const result = createTaskSchema.safeParse({
        title: 'Task',
        columnId: 'col-123',
        description: 'a'.repeat(5001)
      });
      expect(result.success).toBe(false);
    });

    it('should validate all priority values', () => {
      Object.values(TaskPriority).forEach(priority => {
        const result = createTaskSchema.safeParse({
          title: 'Task',
          columnId: 'col-123',
          priority
        });
        expect(result.success).toBe(true);
      });
    });

    it('should fail with invalid priority', () => {
      const result = createTaskSchema.safeParse({
        title: 'Task',
        columnId: 'col-123',
        priority: 'INVALID'
      });
      expect(result.success).toBe(false);
    });

    it('should accept null description', () => {
      const result = createTaskSchema.safeParse({
        title: 'Task',
        columnId: 'col-123',
        description: null
      });
      expect(result.success).toBe(true);
    });

    it('should fail with negative position', () => {
      const result = createTaskSchema.safeParse({
        title: 'Task',
        columnId: 'col-123',
        position: -1
      });
      expect(result.success).toBe(false);
    });
  });

  describe('updateTaskSchema', () => {
    it('should allow partial updates', () => {
      const result = updateTaskSchema.safeParse({ title: 'Updated Title' });
      expect(result.success).toBe(true);
    });

    it('should allow updating completion status', () => {
      const result = updateTaskSchema.safeParse({ isCompleted: true });
      expect(result.success).toBe(true);
    });

    it('should allow empty update', () => {
      const result = updateTaskSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should fail with empty title', () => {
      const result = updateTaskSchema.safeParse({ title: '' });
      expect(result.success).toBe(false);
    });
  });

  describe('moveTaskSchema', () => {
    it('should validate task move', () => {
      const result = moveTaskSchema.safeParse({ columnId: 'col-456', position: 2 });
      expect(result.success).toBe(true);
    });

    it('should fail without columnId', () => {
      const result = moveTaskSchema.safeParse({ position: 0 });
      expect(result.success).toBe(false);
    });

    it('should fail with empty columnId', () => {
      const result = moveTaskSchema.safeParse({ columnId: '', position: 0 });
      expect(result.success).toBe(false);
    });

    it('should fail without position', () => {
      const result = moveTaskSchema.safeParse({ columnId: 'col-123' });
      expect(result.success).toBe(false);
    });

    it('should fail with negative position', () => {
      const result = moveTaskSchema.safeParse({ columnId: 'col-123', position: -1 });
      expect(result.success).toBe(false);
    });
  });

  describe('reorderTasksSchema', () => {
    it('should validate task reorder', () => {
      const result = reorderTasksSchema.safeParse({ taskIds: ['task-1', 'task-2'] });
      expect(result.success).toBe(true);
    });

    it('should fail with empty array', () => {
      const result = reorderTasksSchema.safeParse({ taskIds: [] });
      expect(result.success).toBe(false);
    });
  });

  describe('assignTaskSchema', () => {
    it('should validate assignee assignment', () => {
      const result = assignTaskSchema.safeParse({ assigneeIds: ['user-1', 'user-2'] });
      expect(result.success).toBe(true);
    });

    it('should accept empty array for unassignment', () => {
      const result = assignTaskSchema.safeParse({ assigneeIds: [] });
      expect(result.success).toBe(true);
    });
  });

  describe('setTaskLabelsSchema', () => {
    it('should validate label assignment', () => {
      const result = setTaskLabelsSchema.safeParse({ labelIds: ['label-1', 'label-2'] });
      expect(result.success).toBe(true);
    });

    it('should accept empty array', () => {
      const result = setTaskLabelsSchema.safeParse({ labelIds: [] });
      expect(result.success).toBe(true);
    });
  });

  // ===== Checklist Schemas =====
  describe('createChecklistItemSchema', () => {
    it('should validate checklist item', () => {
      const result = createChecklistItemSchema.safeParse({ title: 'Review code' });
      expect(result.success).toBe(true);
    });

    it('should validate with position', () => {
      const result = createChecklistItemSchema.safeParse({ title: 'Review code', position: 0 });
      expect(result.success).toBe(true);
    });

    it('should fail with empty title', () => {
      const result = createChecklistItemSchema.safeParse({ title: '' });
      expect(result.success).toBe(false);
    });

    it('should fail when title exceeds 200 characters', () => {
      const result = createChecklistItemSchema.safeParse({ title: 'a'.repeat(201) });
      expect(result.success).toBe(false);
    });
  });

  describe('updateChecklistItemSchema', () => {
    it('should allow updating title', () => {
      const result = updateChecklistItemSchema.safeParse({ title: 'Updated' });
      expect(result.success).toBe(true);
    });

    it('should allow updating completion', () => {
      const result = updateChecklistItemSchema.safeParse({ isCompleted: true });
      expect(result.success).toBe(true);
    });

    it('should allow empty update', () => {
      const result = updateChecklistItemSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe('reorderChecklistSchema', () => {
    it('should validate item reorder', () => {
      const result = reorderChecklistSchema.safeParse({ itemIds: ['item-1', 'item-2'] });
      expect(result.success).toBe(true);
    });

    it('should fail with empty array', () => {
      const result = reorderChecklistSchema.safeParse({ itemIds: [] });
      expect(result.success).toBe(false);
    });
  });

  // ===== Comment Schemas =====
  describe('createCommentSchema', () => {
    it('should validate comment', () => {
      const result = createCommentSchema.safeParse({ content: 'This is a comment' });
      expect(result.success).toBe(true);
    });

    it('should fail with empty content', () => {
      const result = createCommentSchema.safeParse({ content: '' });
      expect(result.success).toBe(false);
    });

    it('should fail when content exceeds 2000 characters', () => {
      const result = createCommentSchema.safeParse({ content: 'a'.repeat(2001) });
      expect(result.success).toBe(false);
    });
  });

  describe('updateCommentSchema', () => {
    it('should validate comment update', () => {
      const result = updateCommentSchema.safeParse({ content: 'Updated comment' });
      expect(result.success).toBe(true);
    });
  });

  // ===== Query Schemas =====
  describe('boardQuerySchema', () => {
    it('should validate empty query with defaults', () => {
      const result = boardQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.includeArchived).toBe(false);
      }
    });

    it('should validate includeArchived', () => {
      const result = boardQuerySchema.safeParse({ includeArchived: true });
      expect(result.success).toBe(true);
    });

    it('should coerce string to boolean', () => {
      const result = boardQuerySchema.safeParse({ includeArchived: 'true' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.includeArchived).toBe(true);
      }
    });
  });

  describe('taskQuerySchema', () => {
    it('should validate empty query', () => {
      const result = taskQuerySchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should validate complete query', () => {
      const result = taskQuerySchema.safeParse({
        assigneeId: 'user-123',
        priority: TaskPriority.HIGH,
        dueFrom: '2025-01-01',
        dueTo: '2025-12-31',
        isCompleted: false,
        labelIds: 'label-1,label-2',
        q: 'search term',
      });
      expect(result.success).toBe(true);
    });

    it('should fail with invalid priority', () => {
      const result = taskQuerySchema.safeParse({ priority: 'INVALID' });
      expect(result.success).toBe(false);
    });
  });

  describe('myTasksQuerySchema', () => {
    it('should validate empty query with defaults', () => {
      const result = myTasksQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.p).toBe(1);
        expect(result.data.ps).toBe(50);
      }
    });

    it('should validate pagination', () => {
      const result = myTasksQuerySchema.safeParse({ p: 2, ps: 25 });
      expect(result.success).toBe(true);
    });

    it('should coerce string pagination', () => {
      const result = myTasksQuerySchema.safeParse({ p: '3', ps: '10' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.p).toBe(3);
        expect(result.data.ps).toBe(10);
      }
    });

    it('should fail with page < 1', () => {
      const result = myTasksQuerySchema.safeParse({ p: 0 });
      expect(result.success).toBe(false);
    });

    it('should fail with pageSize > 100', () => {
      const result = myTasksQuerySchema.safeParse({ ps: 101 });
      expect(result.success).toBe(false);
    });

    it('should validate boardId filter', () => {
      const result = myTasksQuerySchema.safeParse({ boardId: 'board-123' });
      expect(result.success).toBe(true);
    });
  });
});
