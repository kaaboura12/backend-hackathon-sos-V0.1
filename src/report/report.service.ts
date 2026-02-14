import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { AssignReportDto } from './dto/assign-report.dto';
import { ClassifyReportDto } from './dto/classify-report.dto';
import { CloseReportDto } from './dto/close-report.dto';
import type { ReportFiltersDto } from './dto/report-filters.dto';
import { getFileType } from '../common/config/multer.config';
import { VoiceAnonymizerService } from '../voice-anonymizer/voice-anonymizer.service';

const ARCHIVED_ERROR =
  'Cannot modify archived report. Case is closed and sealed.';

@Injectable()
export class ReportService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => NotificationService))
    private notificationService: NotificationService,
    private voiceAnonymizer: VoiceAnonymizerService,
  ) {}

  async create(
    createReportDto: CreateReportDto,
    reporterId: string,
    files?: Express.Multer.File[],
  ) {
    const reporter = await this.prisma.user.findUnique({
      where: { id: reporterId },
      include: { role: true },
    });

    if (!reporter) {
      throw new NotFoundException('Reporter not found');
    }

    // Anonymize voice recordings when report is anonymous
    let processedFiles = files ?? [];
    if (createReportDto.isAnonymous && processedFiles.length > 0) {
      const processed: Express.Multer.File[] = [];
      for (const file of processedFiles) {
        if (this.voiceAnonymizer.isAudioFile(file.mimetype)) {
          try {
            const anonymized = await this.voiceAnonymizer.anonymizeAudio(file);
            processed.push(anonymized);
          } catch {
            throw new BadRequestException(
              'Voice anonymization failed for anonymous report. Ensure the voice anonymizer service is running.',
            );
          }
        } else {
          processed.push(file);
        }
      }
      processedFiles = processed;
    }

    // Prepare attachments from uploaded files
    const attachments = processedFiles.map((file) => ({
      url: `/uploads/${file.filename}`,
      type: getFileType(file.mimetype),
      filename: file.originalname,
    }));

    const report = await this.prisma.report.create({
      data: {
        ...createReportDto,
        reporterId,
        status: 'ATTENTE',
        attachments,
      },
      include: {
        reporter: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
    });

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        action: 'REPORT_CREATED',
        details: `Report created: ${report.incidentType} at ${report.villageName}`,
        userId: reporterId,
        reportId: report.id,
      },
    });

    // Notify Directeur for urgent reports
    if (report.urgency === 'CRITIQUE' || report.urgency === 'HAUTE') {
      const directeurs = await this.prisma.user.findMany({
        where: {
          role: {
            name: { in: ['Directeur', 'SuperAdmin'] },
          },
        },
        select: { id: true },
      });

      await this.notificationService.notifyUrgentReport(
        directeurs.map((d) => d.id),
        report.id,
        report.incidentType,
        report.urgency,
      );
    }

    // Anonymize in response if needed (for the creator, always show their own info)
    return {
      message: 'Report created successfully',
      report: {
        ...report,
        reporter: createReportDto.isAnonymous
          ? {
              ...report.reporter,
              note: 'Report created as anonymous - identity hidden from others',
            }
          : report.reporter,
      },
    };
  }

  async findAll(userId: string, userRole: string, filters?: ReportFiltersDto) {
    // Build where clause
    const where: Record<string, unknown> = {};

    // Mère SOS can only see their own reports
    if (userRole === 'Mère SOS') {
      where.reporterId = userId;
    }

    // Level 3: Vue globale - filters for Direction/Bureau National
    if (filters?.villageName) {
      where.villageName = filters.villageName;
    }
    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.incidentType) {
      where.incidentType = filters.incidentType;
    }
    if (filters?.urgency) {
      where.urgency = filters.urgency;
    }
    if (filters?.isArchived !== undefined) {
      where.isArchived = filters.isArchived;
    }
    if (filters?.dateFrom || filters?.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) {
        (where.createdAt as Record<string, Date>).gte = new Date(
          filters.dateFrom,
        );
      }
      if (filters.dateTo) {
        (where.createdAt as Record<string, Date>).lte = new Date(
          filters.dateTo,
        );
      }
    }

    const limit = Math.min(Number(filters?.limit) || 50, 100);
    const offset = Math.max(0, Number(filters?.offset) || 0);

    const reports = await this.prisma.report.findMany({
      where,
      include: {
        reporter: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            villageName: true,
            role: { select: { name: true } },
          },
        },
        analyst: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: { select: { name: true } },
          },
        },
        documents: {
          select: {
            id: true,
            type: true,
            fileUrl: true,
            uploadedBy: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
    });

    const total = await this.prisma.report.count({ where });

    // Anonymize reporter info for anonymous reports
    // Only SuperAdmin and Directeur can see real identity
    const canSeeIdentity = ['SuperAdmin', 'Directeur'].includes(userRole);

    const anonymizedReports = reports.map((report) => {
      if (
        report.isAnonymous &&
        !canSeeIdentity &&
        report.reporterId !== userId
      ) {
        return {
          ...report,
          reporter: {
            id: 'anonymous',
            firstName: 'Anonymous',
            lastName: 'Reporter',
            email: 'anonymous@hidden',
            villageName: report.villageName,
            role: { name: 'Hidden' },
          },
        };
      }
      return report;
    });

    return {
      data: anonymizedReports,
      total,
      limit,
      offset,
    };
  }

  async findOne(id: string, userId: string, userRole: string) {
    const report = await this.prisma.report.findUnique({
      where: { id },
      include: {
        reporter: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            villageName: true,
            role: { select: { name: true } },
          },
        },
        analyst: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: { select: { name: true } },
          },
        },
        documents: {
          orderBy: { createdAt: 'desc' },
        },
        auditLogs: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                role: { select: { name: true } },
              },
            },
          },
          orderBy: { timestamp: 'desc' },
        },
      },
    });

    if (!report) {
      throw new NotFoundException(`Report with ID ${id} not found`);
    }

    // Mère SOS can only view their own reports
    if (userRole === 'Mère SOS' && report.reporterId !== userId) {
      throw new ForbiddenException('You can only view your own reports');
    }

    // Anonymize reporter info for anonymous reports
    // Only SuperAdmin, Directeur, or the reporter themselves can see real identity
    const canSeeIdentity =
      ['SuperAdmin', 'Directeur'].includes(userRole) ||
      report.reporterId === userId;

    if (report.isAnonymous && !canSeeIdentity) {
      return {
        ...report,
        reporter: {
          id: 'anonymous',
          firstName: 'Anonymous',
          lastName: 'Reporter',
          email: 'anonymous@hidden',
          villageName: report.villageName,
          role: { name: 'Hidden' },
        },
      };
    }

    return report;
  }

  async update(
    id: string,
    updateReportDto: UpdateReportDto,
    userId: string,
    userRole: string,
    files?: Express.Multer.File[],
  ) {
    const report = await this.prisma.report.findUnique({
      where: { id },
    });

    if (!report) {
      throw new NotFoundException(`Report with ID ${id} not found`);
    }

    if (report.isArchived) {
      throw new ForbiddenException(ARCHIVED_ERROR);
    }

    // Mère SOS can only update their own reports
    if (userRole === 'Mère SOS' && report.reporterId !== userId) {
      throw new ForbiddenException('You can only update your own reports');
    }

    // Anonymize new voice recordings when report is anonymous
    let processedFiles = files ?? [];
    if (report.isAnonymous && processedFiles.length > 0) {
      const processed: Express.Multer.File[] = [];
      for (const file of processedFiles) {
        if (this.voiceAnonymizer.isAudioFile(file.mimetype)) {
          try {
            const anonymized = await this.voiceAnonymizer.anonymizeAudio(file);
            processed.push(anonymized);
          } catch {
            throw new BadRequestException(
              'Voice anonymization failed. Ensure the voice anonymizer service is running.',
            );
          }
        } else {
          processed.push(file);
        }
      }
      processedFiles = processed;
    }

    // Prepare new attachments if files provided
    const newAttachments = processedFiles.map((file) => ({
      url: `/uploads/${file.filename}`,
      type: getFileType(file.mimetype),
      filename: file.originalname,
    }));

    // Merge existing attachments with new ones
    const attachments = [...report.attachments, ...newAttachments];

    const updatedReport = await this.prisma.report.update({
      where: { id },
      data: {
        ...updateReportDto,
        attachments,
      },
      include: {
        reporter: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: { select: { name: true } },
          },
        },
        analyst: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: { select: { name: true } },
          },
        },
      },
    });

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        action: 'REPORT_UPDATED',
        details: `Report updated by ${userRole}`,
        userId,
        reportId: id,
      },
    });

    // Anonymize if needed
    const canSeeIdentity =
      ['SuperAdmin', 'Directeur'].includes(userRole) ||
      updatedReport.reporterId === userId;

    const finalReport =
      updatedReport.isAnonymous && !canSeeIdentity
        ? {
            ...updatedReport,
            reporter: {
              id: 'anonymous',
              firstName: 'Anonymous',
              lastName: 'Reporter',
              role: { name: 'Hidden' },
            },
          }
        : updatedReport;

    return {
      message: 'Report updated successfully',
      report: finalReport,
    };
  }

  async assign(id: string, assignDto: AssignReportDto, userId: string) {
    const report = await this.prisma.report.findUnique({
      where: { id },
    });

    if (!report) {
      throw new NotFoundException(`Report with ID ${id} not found`);
    }

    if (report.isArchived) {
      throw new ForbiddenException(ARCHIVED_ERROR);
    }

    // Validate analyst exists and has appropriate role
    const analyst = await this.prisma.user.findUnique({
      where: { id: assignDto.analystId },
      include: { role: true },
    });

    if (!analyst) {
      throw new NotFoundException('Analyst not found');
    }

    // Check analyst has appropriate permissions
    const validRoles = ['Psychologue', 'Assistant Social', 'Directeur'];
    if (!validRoles.includes(analyst.role.name)) {
      throw new BadRequestException(
        `User must have one of these roles: ${validRoles.join(', ')}`,
      );
    }

    const updatedReport = await this.prisma.report.update({
      where: { id },
      data: {
        analystId: assignDto.analystId,
        status: 'EN_COURS',
      },
      include: {
        reporter: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        analyst: {
          select: {
            firstName: true,
            lastName: true,
            role: { select: { name: true } },
          },
        },
      },
    });

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        action: 'REPORT_ASSIGNED',
        details: `Report assigned to ${analyst.firstName} ${analyst.lastName} (${analyst.role.name})`,
        userId,
        reportId: id,
      },
    });

    // Notify the assigned analyst
    await this.notificationService.notifyReportAssigned(
      assignDto.analystId,
      id,
      updatedReport.incidentType,
      updatedReport.villageName,
    );

    // Note: Directeur can assign, so they can see identity even for anonymous reports
    return {
      message: 'Report assigned successfully',
      report: updatedReport,
    };
  }

  async classify(id: string, classifyDto: ClassifyReportDto, userId: string) {
    const report = await this.prisma.report.findUnique({
      where: { id },
    });

    if (!report) {
      throw new NotFoundException(`Report with ID ${id} not found`);
    }

    if (report.isArchived) {
      throw new ForbiddenException(ARCHIVED_ERROR);
    }

    const updatedReport = await this.prisma.report.update({
      where: { id },
      data: {
        status: classifyDto.classification,
        closedAt: new Date(),
      },
      include: {
        reporter: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        analyst: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        action: 'REPORT_CLASSIFIED',
        details: `Report classified as ${classifyDto.classification}: ${classifyDto.reason}`,
        userId,
        reportId: id,
      },
    });

    return {
      message: 'Report classified successfully',
      report: updatedReport,
    };
  }

  async close(id: string, closeDto: CloseReportDto, userId: string) {
    const report = await this.prisma.report.findUnique({
      where: { id },
      include: { documents: true },
    });

    if (!report) {
      throw new NotFoundException(`Report with ID ${id} not found`);
    }

    if (report.isArchived) {
      throw new BadRequestException('Report is already archived and closed.');
    }

    // Require "Avis de cloture" document before closing
    const hasClosureDoc = report.documents.some((d) => d.type === 'CLOTURE');
    if (!hasClosureDoc) {
      throw new BadRequestException(
        'Cannot close case without "Avis de cloture" document. Upload closure document via POST /documents/reports/:id/cloture first.',
      );
    }

    const updatedReport = await this.prisma.report.update({
      where: { id },
      data: {
        status: 'CLOTURE',
        closedAt: new Date(),
        isArchived: true,
        closureDecision: closeDto.closureDecision,
      },
      include: {
        reporter: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        analyst: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        documents: true,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'REPORT_ARCHIVED',
        details: `Case closed and archived. Decision: ${closeDto.closureDecision}. Notes: ${closeDto.closureNotes}`,
        userId,
        reportId: id,
      },
    });

    return {
      message:
        'Case closed and archived successfully. Report is now read-only and cannot be modified.',
      report: updatedReport,
    };
  }

  async remove(id: string, userId: string) {
    const report = await this.prisma.report.findUnique({
      where: { id },
    });

    if (!report) {
      throw new NotFoundException(`Report with ID ${id} not found`);
    }

    if (report.isArchived) {
      throw new ForbiddenException(
        'Cannot delete archived report. Contact SuperAdmin for data retention policies.',
      );
    }

    // Create audit log before deletion
    await this.prisma.auditLog.create({
      data: {
        action: 'REPORT_DELETED',
        details: `Report ${id} deleted`,
        userId,
        reportId: id,
      },
    });

    await this.prisma.report.delete({
      where: { id },
    });

    return {
      message: 'Report deleted successfully',
    };
  }

  async getStatistics() {
    const [total, byStatus, byType, byUrgency] = await Promise.all([
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
    ]);

    return {
      total,
      byStatus,
      byType,
      byUrgency,
    };
  }
}
