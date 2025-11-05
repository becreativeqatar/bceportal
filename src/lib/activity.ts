import { prisma } from './prisma';

export async function logAction(
  actorUserId: string | null,
  action: string,
  entityType?: string,
  entityId?: string,
  payload?: unknown
) {
  try {
    const activity = await prisma.activityLog.create({
      data: {
        actorUserId,
        action,
        entityType,
        entityId,
        payload: payload ? JSON.parse(JSON.stringify(payload)) : null,
      },
    });

    console.log(`Activity logged: ${action} by ${actorUserId || 'system'}`);
    return activity;
  } catch (error) {
    console.error('Failed to log activity:', error);
    // Don't throw - logging should not break the main operation
    return null;
  }
}

// Convenience functions for common actions
export const ActivityActions = {
  ASSET_CREATED: 'ASSET_CREATED',
  ASSET_UPDATED: 'ASSET_UPDATED',
  ASSET_DELETED: 'ASSET_DELETED',
  ASSET_ASSIGNED: 'ASSET_ASSIGNED',
  ASSET_LINKED_PROJECT: 'ASSET_LINKED_PROJECT',
  
  SUBSCRIPTION_CREATED: 'SUBSCRIPTION_CREATED',
  SUBSCRIPTION_UPDATED: 'SUBSCRIPTION_UPDATED',
  SUBSCRIPTION_DELETED: 'SUBSCRIPTION_DELETED',

  PROJECT_CREATED: 'PROJECT_CREATED',
  PROJECT_UPDATED: 'PROJECT_UPDATED',
  PROJECT_ARCHIVED: 'PROJECT_ARCHIVED',

  ALERT_SUBSCRIPTION_RENEWAL: 'ALERT_SUBSCRIPTION_RENEWAL',
  ALERT_WARRANTY_EXPIRY: 'ALERT_WARRANTY_EXPIRY',
  
  USER_CREATED: 'USER_CREATED',
  USER_UPDATED: 'USER_UPDATED',
  USER_DELETED: 'USER_DELETED',
} as const;

export type ActivityAction = typeof ActivityActions[keyof typeof ActivityActions];