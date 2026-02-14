import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';

export enum DocumentType {
  FICHE_INITIAL = 'FICHE_INITIAL',
  RAPPORT_DPE = 'RAPPORT_DPE',
  EVALUATION = 'EVALUATION',
  PLAN_ACTION = 'PLAN_ACTION',
  SUIVI = 'SUIVI',
  RAPPORT_FINAL = 'RAPPORT_FINAL',
  CLOTURE = 'CLOTURE',
}

@Injectable()
export class DocumentService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => NotificationService))
    private notificationService: NotificationService,
  ) {}

  async upload(
    reportId: string,
    documentType: DocumentType,
    file: Express.Multer.File,
    userId: string,
    userName: string,
  ) {
    // Verify report exists
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      throw new NotFoundException(`Report with ID ${reportId} not found`);
    }

    if (report.isArchived) {
      throw new ForbiddenException(
        'Cannot add documents to archived report. Case is closed and sealed.',
      );
    }

    // Create document record
    const document = await this.prisma.document.create({
      data: {
        type: documentType,
        fileUrl: `/uploads/${file.filename}`,
        uploadedBy: userName,
        reportId,
      },
    });

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        action: 'DOCUMENT_UPLOADED',
        details: `Document uploaded: ${documentType}`,
        userId,
        reportId,
      },
    });

    // Notify the analyst if report is assigned
    if (report.analystId && report.analystId !== userId) {
      await this.notificationService.notifyDocumentUploaded(
        report.analystId,
        reportId,
        documentType,
        userName,
      );
    }

    return {
      message: 'Document uploaded successfully',
      document,
    };
  }

  async findByReport(reportId: string) {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      throw new NotFoundException(`Report with ID ${reportId} not found`);
    }

    return this.prisma.document.findMany({
      where: { reportId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const document = await this.prisma.document.findUnique({
      where: { id },
      include: {
        report: {
          select: {
            id: true,
            incidentType: true,
            village: { select: { id: true, name: true } },
            status: true,
          },
        },
      },
    });

    if (!document) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }

    return document;
  }

  async remove(id: string, userId: string, userPermissions: string[]) {
    const document = await this.prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }

    // Only users with DOC_DELETE permission can delete
    if (!userPermissions.includes('DOC_DELETE')) {
      throw new ForbiddenException(
        'You do not have permission to delete documents',
      );
    }

    // Create audit log before deletion
    await this.prisma.auditLog.create({
      data: {
        action: 'DOCUMENT_DELETED',
        details: `Document deleted: ${document.type}`,
        userId,
        reportId: document.reportId,
      },
    });

    await this.prisma.document.delete({
      where: { id },
    });

    return {
      message: 'Document deleted successfully',
    };
  }
}
