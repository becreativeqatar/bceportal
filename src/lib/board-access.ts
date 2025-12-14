import { prisma } from './prisma';
import { BoardMemberRole } from '@prisma/client';

/**
 * Get user's role in a board
 * Returns OWNER if they own the board, or their membership role, or null if not a member
 */
export async function getUserBoardRole(
  boardId: string,
  userId: string
): Promise<BoardMemberRole | null> {
  // Check if user is the owner
  const board = await prisma.board.findUnique({
    where: { id: boardId },
    select: { ownerId: true },
  });

  if (!board) {
    return null;
  }

  if (board.ownerId === userId) {
    return BoardMemberRole.OWNER;
  }

  // Check membership
  const membership = await prisma.boardMember.findUnique({
    where: {
      boardId_userId: { boardId, userId },
    },
    select: { role: true },
  });

  return membership?.role || null;
}

/**
 * Check if user can access a board (owner or member)
 */
export async function canAccessBoard(
  boardId: string,
  userId: string
): Promise<boolean> {
  const role = await getUserBoardRole(boardId, userId);
  return role !== null;
}

/**
 * Check if user can manage a board (owner or admin)
 */
export async function canManageBoard(
  boardId: string,
  userId: string
): Promise<boolean> {
  const role = await getUserBoardRole(boardId, userId);
  return role === BoardMemberRole.OWNER || role === BoardMemberRole.ADMIN;
}

/**
 * Check if user is the owner of a board
 */
export async function isBoardOwner(
  boardId: string,
  userId: string
): Promise<boolean> {
  const role = await getUserBoardRole(boardId, userId);
  return role === BoardMemberRole.OWNER;
}

/**
 * Check if a task is accessible to a user (via board membership)
 */
export async function isTaskAccessible(
  taskId: string,
  userId: string
): Promise<boolean> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      column: {
        select: { boardId: true },
      },
    },
  });

  if (!task) {
    return false;
  }

  return canAccessBoard(task.column.boardId, userId);
}

/**
 * Get board ID for a task
 */
export async function getBoardIdForTask(taskId: string): Promise<string | null> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      column: {
        select: { boardId: true },
      },
    },
  });

  return task?.column.boardId || null;
}

/**
 * Check if a column belongs to a specific board
 */
export async function isColumnInBoard(
  columnId: string,
  boardId: string
): Promise<boolean> {
  const column = await prisma.taskColumn.findUnique({
    where: { id: columnId },
    select: { boardId: true },
  });

  return column?.boardId === boardId;
}

/**
 * Get all board members including the owner
 */
export async function getBoardMembers(boardId: string) {
  const board = await prisma.board.findUnique({
    where: { id: boardId },
    select: {
      ownerId: true,
      owner: {
        select: { id: true, name: true, email: true, image: true },
      },
      members: {
        include: {
          user: {
            select: { id: true, name: true, email: true, image: true },
          },
        },
      },
    },
  });

  if (!board) {
    return [];
  }

  // Combine owner and members
  const members = [
    {
      userId: board.ownerId,
      user: board.owner,
      role: BoardMemberRole.OWNER,
      joinedAt: null,
    },
    ...board.members.map((m) => ({
      userId: m.userId,
      user: m.user,
      role: m.role,
      joinedAt: m.joinedAt,
    })),
  ];

  return members;
}

/**
 * Check if a user is a member of any boards (for "My Tasks" access)
 */
export async function getUserBoardIds(userId: string): Promise<string[]> {
  // Get boards where user is owner
  const ownedBoards = await prisma.board.findMany({
    where: { ownerId: userId, isArchived: false },
    select: { id: true },
  });

  // Get boards where user is member
  const memberBoards = await prisma.boardMember.findMany({
    where: { userId },
    select: {
      board: {
        select: { id: true, isArchived: true },
      },
    },
  });

  const memberBoardIds = memberBoards
    .filter((m) => !m.board.isArchived)
    .map((m) => m.board.id);

  return [...new Set([...ownedBoards.map((b) => b.id), ...memberBoardIds])];
}
