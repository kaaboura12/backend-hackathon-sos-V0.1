# Example Usage - Implementing Protected Routes

This guide shows you how to implement actual report management routes using the authentication system.

## 📝 Example: Report Controller

Here's a complete example of how to create a report controller with permission-based protection:

```typescript
// src/report/report.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ReportService } from './report.service';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/dto/jwt-payload.dto';

@Controller('reports')
@UseGuards(JwtAuthGuard, PermissionsGuard) // Apply to all routes
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  /**
   * Create new incident report
   * Mère SOS, Psychologue, etc. can create reports
   */
  @Post()
  @Permissions('REPORT_CREATE')
  async create(
    @Body() createReportDto: CreateReportDto,
    @CurrentUser() user: JwtPayload,
  ) {
    // User info is available from JWT
    return this.reportService.create(createReportDto, user.sub);
  }

  /**
   * Get all reports
   * Users need REPORT_READ permission
   */
  @Get()
  @Permissions('REPORT_READ')
  async findAll(@CurrentUser() user: JwtPayload) {
    // Could filter by village if user is Mère SOS
    if (user.role === 'Mère SOS') {
      return this.reportService.findByVillage(user.sub);
    }
    return this.reportService.findAll();
  }

  /**
   * Get report by ID
   */
  @Get(':id')
  @Permissions('REPORT_READ')
  async findOne(@Param('id') id: string) {
    return this.reportService.findOne(id);
  }

  /**
   * Update report (add notes, change status)
   */
  @Patch(':id')
  @Permissions('REPORT_UPDATE')
  async update(
    @Param('id') id: string,
    @Body() updateReportDto: UpdateReportDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.reportService.update(id, updateReportDto, user.sub);
  }

  /**
   * Classify report as false alarm
   * Only Psychologue and Directeur can classify
   */
  @Patch(':id/classify')
  @Permissions('REPORT_CLASSIFY')
  async classify(
    @Param('id') id: string,
    @Body('classification') classification: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.reportService.classify(id, classification, user.sub);
  }

  /**
   * Assign report to analyst
   * Only Directeur can assign
   */
  @Patch(':id/assign')
  @Permissions('REPORT_ASSIGN')
  async assign(
    @Param('id') id: string,
    @Body('analystId') analystId: string,
  ) {
    return this.reportService.assign(id, analystId);
  }

  /**
   * Delete report
   * Requires both REPORT_DELETE and REPORT_READ
   * SuperAdmin only (most likely)
   */
  @Delete(':id')
  @Permissions('REPORT_DELETE', 'REPORT_READ')
  async remove(@Param('id') id: string) {
    return this.reportService.remove(id);
  }
}
```

## 📄 Example: Report Service

```typescript
// src/report/report.service.ts
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReportDto } from './dto/create-report.dto';

@Injectable()
export class ReportService {
  constructor(private prisma: PrismaService) {}

  async create(createReportDto: CreateReportDto, reporterId: string) {
    // Get reporter's village
    const reporter = await this.prisma.user.findUnique({
      where: { id: reporterId },
    });

    const report = await this.prisma.report.create({
      data: {
        ...createReportDto,
        reporterId,
        villageName: reporter.villageName || createReportDto.villageName,
        status: 'ATTENTE', // Default status
      },
      include: {
        reporter: {
          select: {
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
    });

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        action: 'REPORT_CREATED',
        details: `Report #${report.id} created`,
        userId: reporterId,
        reportId: report.id,
      },
    });

    return {
      message: 'Report created successfully',
      report,
    };
  }

  async findAll() {
    return this.prisma.report.findMany({
      include: {
        reporter: {
          select: {
            firstName: true,
            lastName: true,
            role: true,
          },
        },
        analyst: {
          select: {
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findByVillage(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    return this.prisma.report.findMany({
      where: {
        villageName: user.villageName,
      },
      include: {
        reporter: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const report = await this.prisma.report.findUnique({
      where: { id },
      include: {
        reporter: {
          select: {
            firstName: true,
            lastName: true,
            role: true,
          },
        },
        analyst: {
          select: {
            firstName: true,
            lastName: true,
            role: true,
          },
        },
        documents: true,
        auditLogs: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                role: true,
              },
            },
          },
          orderBy: {
            timestamp: 'desc',
          },
        },
      },
    });

    if (!report) {
      throw new NotFoundException(`Report with ID ${id} not found`);
    }

    return report;
  }

  async classify(id: string, classification: string, userId: string) {
    const report = await this.prisma.report.update({
      where: { id },
      data: {
        status: classification, // 'FAUSSE' or 'CLOTURÉ'
        closedAt: new Date(),
      },
    });

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        action: 'REPORT_CLASSIFIED',
        details: `Report classified as ${classification}`,
        userId,
        reportId: id,
      },
    });

    return {
      message: 'Report classified successfully',
      report,
    };
  }

  async assign(id: string, analystId: string) {
    // Validate analyst exists
    const analyst = await this.prisma.user.findUnique({
      where: { id: analystId },
    });

    if (!analyst) {
      throw new NotFoundException('Analyst not found');
    }

    const report = await this.prisma.report.update({
      where: { id },
      data: {
        analystId,
        status: 'EN_COURS',
      },
      include: {
        analyst: {
          select: {
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
    });

    return {
      message: 'Report assigned successfully',
      report,
    };
  }
}
```

## 🎯 Example: DTOs

```typescript
// src/report/dto/create-report.dto.ts
import { IsString, IsNotEmpty, IsBoolean, IsOptional, IsEnum } from 'class-validator';

export class CreateReportDto {
  @IsString()
  @IsNotEmpty()
  incidentType: string; // santé, comportement, violence, etc.

  @IsString()
  @IsNotEmpty()
  urgency: string; // Niveau d'urgence

  @IsBoolean()
  @IsOptional()
  isAnonymous?: boolean;

  @IsString()
  @IsNotEmpty()
  villageName: string;

  @IsString()
  @IsNotEmpty()
  childName: string;

  @IsString()
  @IsOptional()
  abuserName?: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsOptional()
  attachments?: Array<{
    url: string;
    type: string; // image, audio, video
    filename: string;
  }>;
}
```

## 📤 Example: Document Upload Controller

```typescript
// src/document/document.controller.ts
import {
  Controller,
  Post,
  Param,
  Body,
  UseGuards,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/dto/jwt-payload.dto';
import { DocumentService } from './document.service';

@Controller('documents')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  /**
   * Upload DPE document
   * Only Psychologue can upload DPE
   */
  @Post('reports/:reportId/dpe')
  @Permissions('DOC_UPLOAD_DPE')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDPE(
    @Param('reportId') reportId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.documentService.upload(
      reportId,
      'RAPPORT_DPE',
      file,
      user.sub,
    );
  }

  /**
   * Upload Action Plan
   * Only Assistant Social can upload
   */
  @Post('reports/:reportId/plan-action')
  @Permissions('DOC_UPLOAD_PLAN_ACTION')
  @UseInterceptors(FileInterceptor('file'))
  async uploadActionPlan(
    @Param('reportId') reportId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.documentService.upload(
      reportId,
      'PLAN_ACTION',
      file,
      user.sub,
    );
  }

  /**
   * Upload Final Report
   * Only Directeur can upload final report
   */
  @Post('reports/:reportId/rapport-final')
  @Permissions('DOC_UPLOAD_RAPPORT_FINAL')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFinalReport(
    @Param('reportId') reportId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.documentService.upload(
      reportId,
      'RAPPORT_FINAL',
      file,
      user.sub,
    );
  }
}
```

## 🔒 Example: Conditional Permission Logic

Sometimes you need more complex logic than just checking permissions:

```typescript
// src/report/report.controller.ts
@Patch(':id')
@Permissions('REPORT_UPDATE')
async update(
  @Param('id') id: string,
  @Body() updateReportDto: UpdateReportDto,
  @CurrentUser() user: JwtPayload,
) {
  const report = await this.reportService.findOne(id);

  // Mère SOS can only update their own reports
  if (user.role === 'Mère SOS' && report.reporterId !== user.sub) {
    throw new ForbiddenException('You can only update your own reports');
  }

  // Directeur and SuperAdmin can update any report
  return this.reportService.update(id, updateReportDto, user.sub);
}
```

## 🎭 Example: Role-Based Response

Return different data based on user role:

```typescript
@Get()
@Permissions('REPORT_READ')
async findAll(@CurrentUser() user: JwtPayload) {
  const reports = await this.reportService.findAll();

  // Direction Nationale gets anonymized data
  if (user.role === 'Direction Nationale') {
    return reports.map(report => ({
      id: report.id,
      incidentType: report.incidentType,
      status: report.status,
      villageName: report.villageName,
      createdAt: report.createdAt,
      // Don't include sensitive info like names
    }));
  }

  // Others get full data
  return reports;
}
```

## 📊 Example: Statistics Endpoint

```typescript
// src/stats/stats.controller.ts
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { StatsService } from './stats.service';

@Controller('stats')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('dashboard')
  @Permissions('STATS_VIEW')
  async getDashboard() {
    return {
      totalReports: await this.statsService.getTotalReports(),
      reportsByStatus: await this.statsService.getReportsByStatus(),
      reportsByType: await this.statsService.getReportsByType(),
      reportsByVillage: await this.statsService.getReportsByVillage(),
      averageResolutionTime: await this.statsService.getAverageResolutionTime(),
    };
  }

  @Get('reports/monthly')
  @Permissions('STATS_VIEW')
  async getMonthlyReports() {
    return this.statsService.getMonthlyReports();
  }
}
```

## 🧪 Testing Example Routes

Once you implement the report controller:

```bash
# Create report as Mère SOS
curl -X POST http://localhost:3000/reports \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "incidentType": "violence",
    "urgency": "HAUTE",
    "villageName": "Village Gammarth",
    "childName": "Enfant X",
    "description": "Description de l'incident"
  }'

# Get all reports
curl http://localhost:3000/reports \
  -H "Authorization: Bearer <TOKEN>"

# Assign report (Directeur only)
curl -X PATCH http://localhost:3000/reports/:reportId/assign \
  -H "Authorization: Bearer <DIRECTEUR_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"analystId": "psychologist_id"}'

# Classify report as false (Psychologue)
curl -X PATCH http://localhost:3000/reports/:reportId/classify \
  -H "Authorization: Bearer <PSYCHOLOGUE_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"classification": "FAUSSE"}'
```

## 💡 Best Practices

1. **Always use `@Permissions()` decorator** instead of checking `user.role`
2. **Use `@CurrentUser()` to access user info** from JWT
3. **Create audit logs** for important actions
4. **Validate ownership** when users can only modify their own data
5. **Return appropriate HTTP status codes** (403 for permission denied)
6. **Keep permission names consistent** with the list in role.service.ts

## 🎯 Summary

The authentication system you built is:
- ✅ Ready to use in any controller
- ✅ Enforces permissions automatically
- ✅ Provides user context via `@CurrentUser()`
- ✅ Supports complex authorization logic
- ✅ Future-proof for permission changes

Just apply the guards, add the `@Permissions()` decorator, and you're protected! 🛡️
