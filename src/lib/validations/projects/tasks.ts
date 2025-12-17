import { z } from 'zod';
import { BoardMemberRole, TaskPriority } from '@prisma/client';

// ===== Board Schemas =====

export const createBoardSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title must be 100 characters or less'),
  description: z.string().max(500, 'Description must be 500 characters or less').optional().nullable(),
});

export const updateBoardSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title must be 100 characters or less').optional(),
  description: z.string().max(500, 'Description must be 500 characters or less').optional().nullable(),
  isArchived: z.boolean().optional(),
});

export const addBoardMemberSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  role: z.nativeEnum(BoardMemberRole).default(BoardMemberRole.MEMBER),
});

export const updateBoardMemberSchema = z.object({
  role: z.nativeEnum(BoardMemberRole),
});

// ===== Column Schemas =====

export const createColumnSchema = z.object({
  title: z.string().min(1, 'Title is required').max(50, 'Title must be 50 characters or less'),
  position: z.number().int().min(0).optional(),
});

export const updateColumnSchema = z.object({
  title: z.string().min(1, 'Title is required').max(50, 'Title must be 50 characters or less').optional(),
});

export const reorderColumnsSchema = z.object({
  columnIds: z.array(z.string()).min(1, 'At least one column is required'),
});

// ===== Label Schemas =====

export const createLabelSchema = z.object({
  name: z.string().min(1, 'Name is required').max(30, 'Name must be 30 characters or less'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color (e.g., #3b82f6)'),
});

export const updateLabelSchema = createLabelSchema.partial();

// ===== Task Schemas =====

export const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be 200 characters or less'),
  description: z.string().max(5000, 'Description must be 5000 characters or less').optional().nullable(),
  columnId: z.string().min(1, 'Column is required'),
  priority: z.nativeEnum(TaskPriority).default(TaskPriority.MEDIUM),
  dueDate: z.string().optional().nullable(),
  assigneeIds: z.array(z.string()).optional().default([]),
  labelIds: z.array(z.string()).optional().default([]),
  position: z.number().int().min(0).optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be 200 characters or less').optional(),
  description: z.string().max(5000, 'Description must be 5000 characters or less').optional().nullable(),
  priority: z.nativeEnum(TaskPriority).optional(),
  dueDate: z.string().optional().nullable(),
  isCompleted: z.boolean().optional(),
});

export const moveTaskSchema = z.object({
  columnId: z.string().min(1, 'Column is required'),
  position: z.number().int().min(0),
});

export const reorderTasksSchema = z.object({
  taskIds: z.array(z.string()).min(1, 'At least one task is required'),
});

export const assignTaskSchema = z.object({
  assigneeIds: z.array(z.string()),
});

export const setTaskLabelsSchema = z.object({
  labelIds: z.array(z.string()),
});

// ===== Checklist Schemas =====

export const createChecklistItemSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be 200 characters or less'),
  position: z.number().int().min(0).optional(),
});

export const updateChecklistItemSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be 200 characters or less').optional(),
  isCompleted: z.boolean().optional(),
});

export const reorderChecklistSchema = z.object({
  itemIds: z.array(z.string()).min(1, 'At least one item is required'),
});

// ===== Comment Schemas =====

export const createCommentSchema = z.object({
  content: z.string().min(1, 'Comment is required').max(2000, 'Comment must be 2000 characters or less'),
});

export const updateCommentSchema = createCommentSchema;

// ===== Query Schemas =====

export const boardQuerySchema = z.object({
  includeArchived: z.coerce.boolean().default(false),
});

export const taskQuerySchema = z.object({
  assigneeId: z.string().optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  dueFrom: z.string().optional(),
  dueTo: z.string().optional(),
  isCompleted: z.coerce.boolean().optional(),
  labelIds: z.string().optional(), // comma-separated
  q: z.string().optional(),
});

export const myTasksQuerySchema = z.object({
  priority: z.nativeEnum(TaskPriority).optional(),
  dueFrom: z.string().optional(),
  dueTo: z.string().optional(),
  isCompleted: z.coerce.boolean().optional(),
  boardId: z.string().optional(),
  q: z.string().optional(),
  p: z.coerce.number().min(1).default(1),
  ps: z.coerce.number().min(1).max(100).default(50),
});

// ===== Type Exports =====

export type CreateBoardRequest = z.infer<typeof createBoardSchema>;
export type UpdateBoardRequest = z.infer<typeof updateBoardSchema>;
export type AddBoardMemberRequest = z.infer<typeof addBoardMemberSchema>;
export type UpdateBoardMemberRequest = z.infer<typeof updateBoardMemberSchema>;

export type CreateColumnRequest = z.infer<typeof createColumnSchema>;
export type UpdateColumnRequest = z.infer<typeof updateColumnSchema>;
export type ReorderColumnsRequest = z.infer<typeof reorderColumnsSchema>;

export type CreateLabelRequest = z.infer<typeof createLabelSchema>;
export type UpdateLabelRequest = z.infer<typeof updateLabelSchema>;

export type CreateTaskRequest = z.infer<typeof createTaskSchema>;
export type UpdateTaskRequest = z.infer<typeof updateTaskSchema>;
export type MoveTaskRequest = z.infer<typeof moveTaskSchema>;
export type ReorderTasksRequest = z.infer<typeof reorderTasksSchema>;
export type AssignTaskRequest = z.infer<typeof assignTaskSchema>;
export type SetTaskLabelsRequest = z.infer<typeof setTaskLabelsSchema>;

export type CreateChecklistItemRequest = z.infer<typeof createChecklistItemSchema>;
export type UpdateChecklistItemRequest = z.infer<typeof updateChecklistItemSchema>;
export type ReorderChecklistRequest = z.infer<typeof reorderChecklistSchema>;

export type CreateCommentRequest = z.infer<typeof createCommentSchema>;
export type UpdateCommentRequest = z.infer<typeof updateCommentSchema>;

export type BoardQuery = z.infer<typeof boardQuerySchema>;
export type TaskQuery = z.infer<typeof taskQuerySchema>;
export type MyTasksQuery = z.infer<typeof myTasksQuerySchema>;
