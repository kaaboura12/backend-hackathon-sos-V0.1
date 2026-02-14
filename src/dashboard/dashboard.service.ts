import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getAnalystDashboard(userId: string, userRole: string) {
    // Get reports assigned to this analyst
    const assignedReports = await this.prisma.report.findMany({
      where: { analystId: userId },
      include: {
        reporter: {
          select: {
            firstName: true,
            lastName: true,
            villageName: true,
          },
        },
        documents: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Count by status
    const statusCounts = await this.prisma.report.groupBy({
      by: ['status'],
      where: { analystId: userId },
      _count: true,
    });

    // Count by urgency
    const urgencyCounts = await this.prisma.report.groupBy({
      by: ['urgency'],
      where: { analystId: userId },
      _count: true,
    });

    // Get pending reports (awaiting action)
    const pendingReports = assignedReports.filter(
      (r) => r.status === 'EN_COURS',
    );

    // Calculate average processing time
    const closedReports = await this.prisma.report.findMany({
      where: {
        analystId: userId,
        status: { in: ['CLOTURE', 'FAUSSE'] },
        closedAt: { not: null },
      },
      select: {
        createdAt: true,
        closedAt: true,
      },
    });

    const avgProcessingTime = closedReports.length
      ? closedReports.reduce((acc, r) => {
          const diff =
            new Date(r.closedAt!).getTime() - new Date(r.createdAt).getTime();
          return acc + diff;
        }, 0) / closedReports.length
      : 0;

    const avgDays = Math.round(avgProcessingTime / (1000 * 60 * 60 * 24));

    // Process tracking - reports with missing documents
    const reportsNeedingAction = await this.getReportsNeedingAction(
      userId,
      userRole,
    );

    return {
      summary: {
        totalAssigned: assignedReports.length,
        pending: pendingReports.length,
        closed: closedReports.length,
        averageProcessingDays: avgDays,
      },
      statusBreakdown: statusCounts,
      urgencyBreakdown: urgencyCounts,
      recentReports: assignedReports.slice(0, 10),
      reportsNeedingAction,
    };
  }

  async getReportsNeedingAction(userId: string, userRole: string) {
    const assignedReports = await this.prisma.report.findMany({
      where: {
        analystId: userId,
        status: 'EN_COURS',
      },
      include: {
        documents: true,
      },
    });

    return assignedReports
      .map((report) => {
        const missing: string[] = [];
        const docTypes = report.documents.map((d) => d.type);

        // Check what documents are missing based on role
        if (userRole === 'Psychologue') {
          if (!docTypes.includes('RAPPORT_DPE')) missing.push('Rapport DPE');

          if (!docTypes.includes('EVALUATION'))
            missing.push('Évaluation complète');
        }

        if (userRole === 'Assistant Social') {
          if (!docTypes.includes('PLAN_ACTION')) missing.push("Plan d'action");

          if (!docTypes.includes('SUIVI')) missing.push('Rapport de suivi');
        }

        // Calculate days since assignment
        const daysSince = Math.floor(
          (Date.now() - new Date(report.createdAt).getTime()) /
            (1000 * 60 * 60 * 24),
        );

        return {
          reportId: report.id,
          incidentType: report.incidentType,
          villageName: report.villageName,
          urgency: report.urgency,
          daysSinceCreated: daysSince,
          missingDocuments: missing,
          status: report.status,
        };
      })
      .filter((r) => r.missingDocuments.length > 0);
  }

  async getGlobalDashboard() {
    const [
      totalReports,
      statusCounts,
      typeCounts,
      urgencyCounts,
      recentReports,
      byVillage,
    ] = await Promise.all([
      this.prisma.report.count(),
      this.prisma.report.groupBy({
        by: ['status'],
        _count: true,
      }),
      this.prisma.report.groupBy({
        by: ['incidentType'],
        _count: true,
      }),
      this.prisma.report.groupBy({
        by: ['urgency'],
        _count: true,
      }),
      this.prisma.report.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          reporter: {
            select: {
              firstName: true,
              lastName: true,
              villageName: true,
            },
          },
        },
      }),
      this.prisma.report.groupBy({
        by: ['villageName'],
        _count: true,
      }),
    ]);

    // Calculate response time metrics
    const urgentReports = await this.prisma.report.findMany({
      where: {
        urgency: { in: ['HAUTE', 'CRITIQUE'] },
        analystId: { not: null },
      },
      select: {
        createdAt: true,
        updatedAt: true,
      },
    });

    const avgResponseTime = urgentReports.length
      ? urgentReports.reduce((acc, r) => {
          const diff =
            new Date(r.updatedAt).getTime() - new Date(r.createdAt).getTime();
          return acc + diff;
        }, 0) / urgentReports.length
      : 0;

    const avgResponseHours =
      Math.round((avgResponseTime / (1000 * 60 * 60)) * 10) / 10;

    return {
      summary: {
        total: totalReports,
        averageResponseTimeHours: avgResponseHours,
      },
      byStatus: statusCounts,
      byType: typeCounts,
      byUrgency: urgencyCounts,
      byVillage,
      recentReports: recentReports.map((r) => ({
        id: r.id,
        incidentType: r.incidentType,
        villageName: r.villageName,
        urgency: r.urgency,
        status: r.status,
        createdAt: r.createdAt,
        reporter: r.isAnonymous
          ? { firstName: 'Anonymous', lastName: 'Reporter' }
          : r.reporter,
      })),
    };
  }

  async getProcessTracking(reportId: string) {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      include: {
        documents: {
          orderBy: { createdAt: 'asc' },
        },
        auditLogs: {
          orderBy: { timestamp: 'asc' },
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                role: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    if (!report) {
      return null;
    }

    // Define procedure steps
    const procedureSteps = [
      { name: 'Signalement initial', docType: 'FICHE_INITIAL', required: true },
      { name: 'Rapport DPE', docType: 'RAPPORT_DPE', required: true },
      { name: 'Évaluation complète', docType: 'EVALUATION', required: true },
      { name: "Plan d'action", docType: 'PLAN_ACTION', required: true },
      { name: 'Rapport de suivi', docType: 'SUIVI', required: false },
      { name: 'Rapport final', docType: 'RAPPORT_FINAL', required: true },
      { name: 'Avis de clôture', docType: 'CLOTURE', required: false },
    ];

    const stepsStatus = procedureSteps.map((step) => {
      const doc = report.documents.find((d) => d.type === step.docType);
      return {
        step: step.name,
        required: step.required,
        completed: !!doc,
        completedAt: doc?.createdAt,
        uploadedBy: doc?.uploadedBy,
      };
    });

    const completedSteps = stepsStatus.filter((s) => s.completed).length;
    const totalSteps = procedureSteps.length;
    const progress = Math.round((completedSteps / totalSteps) * 100);

    // Calculate delays
    const daysSinceCreation = Math.floor(
      (Date.now() - new Date(report.createdAt).getTime()) /
        (1000 * 60 * 60 * 24),
    );

    const expectedDays =
      report.urgency === 'CRITIQUE'
        ? 3
        : report.urgency === 'HAUTE'
          ? 7
          : report.urgency === 'MOYENNE'
            ? 14
            : 30;

    const isDelayed = daysSinceCreation > expectedDays;

    return {
      report: {
        id: report.id,
        incidentType: report.incidentType,
        urgency: report.urgency,
        status: report.status,
        createdAt: report.createdAt,
        closedAt: report.closedAt,
      },
      progress: {
        percentage: progress,
        completedSteps,
        totalSteps,
        daysSinceCreation,
        expectedDays,
        isDelayed,
      },
      procedureSteps: stepsStatus,
      timeline: report.auditLogs.map((log) => ({
        action: log.action,
        details: log.details,
        timestamp: log.timestamp,
        user: `${log.user.firstName} ${log.user.lastName} (${log.user.role.name})`,
      })),
    };
  }
}
