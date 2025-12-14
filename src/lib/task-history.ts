import { prisma } from './prisma';
import { TaskHistoryAction } from '@prisma/client';

/**
 * Record an action in the task history
 */
export async function recordTaskHistory(
  taskId: string,
  action: TaskHistoryAction,
  performedById: string,
  changes?: Record<string, unknown>
) {
  return prisma.taskHistory.create({
    data: {
      taskId,
      action,
      performedById,
      changes: changes ? JSON.parse(JSON.stringify(changes)) : null,
    },
  });
}

/**
 * Record task creation
 */
export async function recordTaskCreated(
  taskId: string,
  userId: string,
  taskData: {
    title: string;
    columnId: string;
    priority?: string;
    dueDate?: Date | null;
    assigneeIds?: string[];
  }
) {
  return recordTaskHistory(taskId, TaskHistoryAction.CREATED, userId, {
    title: taskData.title,
    columnId: taskData.columnId,
    priority: taskData.priority,
    dueDate: taskData.dueDate?.toISOString(),
    assigneeCount: taskData.assigneeIds?.length || 0,
  });
}

/**
 * Record task update with before/after values
 */
export async function recordTaskUpdated(
  taskId: string,
  userId: string,
  changes: {
    field: string;
    oldValue: unknown;
    newValue: unknown;
  }[]
) {
  if (changes.length === 0) return null;

  return recordTaskHistory(taskId, TaskHistoryAction.UPDATED, userId, {
    changes: changes.map((c) => ({
      field: c.field,
      from: c.oldValue,
      to: c.newValue,
    })),
  });
}

/**
 * Record task moved between columns
 */
export async function recordTaskMoved(
  taskId: string,
  userId: string,
  fromColumnId: string,
  toColumnId: string,
  fromColumnTitle?: string,
  toColumnTitle?: string
) {
  return recordTaskHistory(taskId, TaskHistoryAction.MOVED, userId, {
    fromColumnId,
    toColumnId,
    fromColumnTitle,
    toColumnTitle,
  });
}

/**
 * Record task assignment
 */
export async function recordTaskAssigned(
  taskId: string,
  userId: string,
  assignedUserId: string,
  assignedUserName?: string
) {
  return recordTaskHistory(taskId, TaskHistoryAction.ASSIGNED, userId, {
    assignedUserId,
    assignedUserName,
  });
}

/**
 * Record task unassignment
 */
export async function recordTaskUnassigned(
  taskId: string,
  userId: string,
  unassignedUserId: string,
  unassignedUserName?: string
) {
  return recordTaskHistory(taskId, TaskHistoryAction.UNASSIGNED, userId, {
    unassignedUserId,
    unassignedUserName,
  });
}

/**
 * Record task completion
 */
export async function recordTaskCompleted(taskId: string, userId: string) {
  return recordTaskHistory(taskId, TaskHistoryAction.COMPLETED, userId);
}

/**
 * Record task reopened
 */
export async function recordTaskReopened(taskId: string, userId: string) {
  return recordTaskHistory(taskId, TaskHistoryAction.REOPENED, userId);
}

/**
 * Record comment added
 */
export async function recordCommentAdded(
  taskId: string,
  userId: string,
  commentId: string
) {
  return recordTaskHistory(taskId, TaskHistoryAction.COMMENTED, userId, {
    commentId,
  });
}

/**
 * Record attachment added
 */
export async function recordAttachmentAdded(
  taskId: string,
  userId: string,
  attachmentId: string,
  fileName: string
) {
  return recordTaskHistory(taskId, TaskHistoryAction.ATTACHMENT_ADDED, userId, {
    attachmentId,
    fileName,
  });
}

/**
 * Record attachment removed
 */
export async function recordAttachmentRemoved(
  taskId: string,
  userId: string,
  attachmentId: string,
  fileName: string
) {
  return recordTaskHistory(taskId, TaskHistoryAction.ATTACHMENT_REMOVED, userId, {
    attachmentId,
    fileName,
  });
}

/**
 * Record checklist update
 */
export async function recordChecklistUpdated(
  taskId: string,
  userId: string,
  action: 'added' | 'removed' | 'completed' | 'uncompleted',
  itemTitle: string
) {
  return recordTaskHistory(taskId, TaskHistoryAction.CHECKLIST_UPDATED, userId, {
    action,
    itemTitle,
  });
}

/**
 * Get task history with performer details
 */
export async function getTaskHistory(taskId: string) {
  return prisma.taskHistory.findMany({
    where: { taskId },
    include: {
      performedBy: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}
