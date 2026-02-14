import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export enum NotificationType {
  REPORT_ASSIGNED = 'REPORT_ASSIGNED',
  REPORT_UPDATED = 'REPORT_UPDATED',
  DOCUMENT_UPLOADED = 'DOCUMENT_UPLOADED',
  REPORT_CLASSIFIED = 'REPORT_CLASSIFIED',
  URGENT_REPORT = 'URGENT_REPORT',
}

@Injectable()
export class NotificationService {
  constructor(private prisma: PrismaService) {}

  async create(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    reportId?: string,
  ) {
    return this.prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        reportId,
        isRead: false,
      },
    });
  }

  async notifyReportAssigned(
    analystId: string,
    reportId: string,
    reportType: string,
    villageName: string,
  ) {
    await this.create(
      analystId,
      NotificationType.REPORT_ASSIGNED,
      'Nouveau signalement assigné',
      `Un signalement de type "${reportType}" à ${villageName} vous a été assigné.`,
      reportId,
    );
  }

  async notifyUrgentReport(
    userIds: string[],
    reportId: string,
    reportType: string,
    urgency: string,
  ) {
    const notifications = userIds.map((userId) =>
      this.create(
        userId,
        NotificationType.URGENT_REPORT,
        `Signalement URGENT: ${urgency}`,
        `Nouveau signalement urgent de type "${reportType}". Action immédiate requise.`,
        reportId,
      ),
    );

    await Promise.all(notifications);
  }

  async notifyDocumentUploaded(
    analystId: string,
    reportId: string,
    documentType: string,
    uploadedBy: string,
  ) {
    await this.create(
      analystId,
      NotificationType.DOCUMENT_UPLOADED,
      'Nouveau document ajouté',
      `${uploadedBy} a ajouté un document: ${documentType}`,
      reportId,
    );
  }

  async getUserNotifications(userId: string, unreadOnly = false) {
    return this.prisma.notification.findMany({
      where: {
        userId,
        ...(unreadOnly ? { isRead: false } : {}),
      },
      include: {
        report: {
          select: {
            id: true,
            incidentType: true,
            villageName: true,
            status: true,
            urgency: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markAsRead(notificationId: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId,
      },
      data: {
        isRead: true,
      },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });
  }

  async getUnreadCount(userId: string) {
    return this.prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });
  }

  async deleteNotification(notificationId: string, userId: string) {
    return this.prisma.notification.deleteMany({
      where: {
        id: notificationId,
        userId,
      },
    });
  }
}
