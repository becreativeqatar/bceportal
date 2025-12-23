import { prisma } from '@/lib/core/prisma';
import { NotificationType } from '@prisma/client';

export interface CreateNotificationInput {
  recipientId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  entityType?: string;
  entityId?: string;
}

/**
 * Creates a single notification for a user.
 * Non-blocking: failures are logged but don't break operations.
 */
export async function createNotification(
  input: CreateNotificationInput
): Promise<boolean> {
  try {
    await prisma.notification.create({
      data: {
        recipientId: input.recipientId,
        type: input.type,
        title: input.title,
        message: input.message,
        link: input.link,
        entityType: input.entityType,
        entityId: input.entityId,
      },
    });
    return true;
  } catch (error) {
    console.error('Failed to create notification:', error);
    // Don't throw - notifications should not break main operations
    return false;
  }
}

/**
 * Creates notifications for multiple recipients.
 * Non-blocking: failures are logged but don't break operations.
 */
export async function createBulkNotifications(
  inputs: CreateNotificationInput[]
): Promise<number> {
  try {
    const result = await prisma.notification.createMany({
      data: inputs.map((input) => ({
        recipientId: input.recipientId,
        type: input.type,
        title: input.title,
        message: input.message,
        link: input.link,
        entityType: input.entityType,
        entityId: input.entityId,
      })),
    });
    return result.count;
  } catch (error) {
    console.error('Failed to create bulk notifications:', error);
    return 0;
  }
}

/**
 * Helper templates for common notification scenarios.
 * Returns the input object for createNotification().
 */
export const NotificationTemplates = {
  // Leave Management
  leaveApproved: (
    userId: string,
    requestNumber: string,
    leaveType: string,
    entityId?: string
  ): CreateNotificationInput => ({
    recipientId: userId,
    type: 'LEAVE_REQUEST_APPROVED',
    title: 'Leave Request Approved',
    message: `Your ${leaveType} request (${requestNumber}) has been approved.`,
    link: '/employee/leave',
    entityType: 'LeaveRequest',
    entityId,
  }),

  leaveRejected: (
    userId: string,
    requestNumber: string,
    leaveType: string,
    reason?: string,
    entityId?: string
  ): CreateNotificationInput => ({
    recipientId: userId,
    type: 'LEAVE_REQUEST_REJECTED',
    title: 'Leave Request Rejected',
    message: `Your ${leaveType} request (${requestNumber}) was rejected.${reason ? ` Reason: ${reason}` : ''}`,
    link: '/employee/leave',
    entityType: 'LeaveRequest',
    entityId,
  }),

  // Asset Management
  assetAssigned: (
    userId: string,
    assetTag: string,
    assetModel: string,
    entityId?: string
  ): CreateNotificationInput => ({
    recipientId: userId,
    type: 'ASSET_ASSIGNED',
    title: 'Asset Assigned',
    message: `${assetModel} (${assetTag}) has been assigned to you.`,
    link: '/employee/my-assets',
    entityType: 'Asset',
    entityId,
  }),

  assetUnassigned: (
    userId: string,
    assetTag: string,
    assetModel: string,
    entityId?: string
  ): CreateNotificationInput => ({
    recipientId: userId,
    type: 'ASSET_UNASSIGNED',
    title: 'Asset Returned',
    message: `${assetModel} (${assetTag}) has been unassigned from you.`,
    link: '/employee/my-assets',
    entityType: 'Asset',
    entityId,
  }),

  // Asset Requests
  assetRequestApproved: (
    userId: string,
    assetTag: string,
    requestNumber: string,
    entityId?: string
  ): CreateNotificationInput => ({
    recipientId: userId,
    type: 'ASSET_REQUEST_APPROVED',
    title: 'Asset Request Approved',
    message: `Your request for asset ${assetTag} (${requestNumber}) has been approved.`,
    link: '/employee/asset-requests',
    entityType: 'AssetRequest',
    entityId,
  }),

  assetRequestRejected: (
    userId: string,
    assetTag: string,
    requestNumber: string,
    reason?: string,
    entityId?: string
  ): CreateNotificationInput => ({
    recipientId: userId,
    type: 'ASSET_REQUEST_REJECTED',
    title: 'Asset Request Rejected',
    message: `Your request for asset ${assetTag} (${requestNumber}) was rejected.${reason ? ` Reason: ${reason}` : ''}`,
    link: '/employee/asset-requests',
    entityType: 'AssetRequest',
    entityId,
  }),

  // Purchase Requests
  purchaseRequestApproved: (
    userId: string,
    referenceNumber: string,
    entityId?: string
  ): CreateNotificationInput => ({
    recipientId: userId,
    type: 'PURCHASE_REQUEST_APPROVED',
    title: 'Purchase Request Approved',
    message: `Your purchase request (${referenceNumber}) has been approved.`,
    link: `/employee/purchase-requests`,
    entityType: 'PurchaseRequest',
    entityId,
  }),

  purchaseRequestRejected: (
    userId: string,
    referenceNumber: string,
    reason?: string,
    entityId?: string
  ): CreateNotificationInput => ({
    recipientId: userId,
    type: 'PURCHASE_REQUEST_REJECTED',
    title: 'Purchase Request Rejected',
    message: `Your purchase request (${referenceNumber}) was rejected.${reason ? ` Reason: ${reason}` : ''}`,
    link: `/employee/purchase-requests`,
    entityType: 'PurchaseRequest',
    entityId,
  }),

  // Document Expiry Warnings
  documentExpiryWarning: (
    userId: string,
    documentType: string,
    daysUntilExpiry: number
  ): CreateNotificationInput => ({
    recipientId: userId,
    type: 'DOCUMENT_EXPIRY_WARNING',
    title: 'Document Expiring Soon',
    message: `Your ${documentType} will expire in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? '' : 's'}. Please renew it.`,
    link: '/profile',
    entityType: 'HRProfile',
  }),

  // General notification
  general: (
    userId: string,
    title: string,
    message: string,
    link?: string
  ): CreateNotificationInput => ({
    recipientId: userId,
    type: 'GENERAL',
    title,
    message,
    link,
  }),
};
