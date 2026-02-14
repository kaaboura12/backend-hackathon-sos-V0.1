import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ReportService } from './report.service';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { AssignReportDto } from './dto/assign-report.dto';
import { ClassifyReportDto } from './dto/classify-report.dto';
import { CloseReportDto } from './dto/close-report.dto';
import { ReportFiltersDto } from './dto/report-filters.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/dto/jwt-payload.dto';
import { multerConfig } from '../common/config/multer.config';

@ApiTags('reports')
@ApiBearerAuth('JWT-auth')
@Controller('reports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Post()
  @Permissions('REPORT_CREATE')
  @UseInterceptors(FilesInterceptor('files', 10, multerConfig))
  @ApiOperation({
    summary: 'Create new incident report',
    description:
      'Create a new incident report with optional file attachments (images, audio, PDFs). Maximum 10 files, 10MB each. When isAnonymous=true, voice/audio recordings are automatically anonymized (pitch shift + masking) before storage. Set isAnonymous=true to hide reporter identity.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        incidentType: {
          type: 'string',
          enum: [
            'santé',
            'comportement',
            'violence',
            'abus',
            'négligence',
            'accident',
            'autre',
          ],
          example: 'violence',
        },
        urgency: {
          type: 'string',
          enum: ['BASSE', 'MOYENNE', 'HAUTE', 'CRITIQUE'],
          example: 'HAUTE',
        },
        isAnonymous: { type: 'boolean', example: false },
        villageName: { type: 'string', example: 'Village Gammarth' },
        childName: { type: 'string', example: 'Enfant X' },
        abuserName: { type: 'string', example: 'Person Y' },
        description: { type: 'string', example: 'Description détaillée...' },
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'Attachments (images, audio, PDFs)',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Report created successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid file type or size' })
  @ApiResponse({ status: 403, description: 'Missing REPORT_CREATE permission' })
  create(
    @Body() createReportDto: CreateReportDto,
    @CurrentUser() user: JwtPayload,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    return this.reportService.create(createReportDto, user.sub, files);
  }

  @Post('analyze-urgency')
  @Permissions('REPORT_CREATE')
  @ApiOperation({
    summary: 'Analyze description for critical keywords',
    description:
      'Détection de mots-clés critiques: returns whether the text contains critical French roots (violence, danger, abuse, etc.) and the matched words. Use when drafting a report to show a warning or suggest higher urgency.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['description'],
      properties: {
        description: {
          type: 'string',
          example: "L'enfant signale des coups et une grande peur.",
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Analysis result',
    schema: {
      example: {
        isCritical: true,
        matchedWords: ['coups', 'peur'],
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Missing REPORT_CREATE permission' })
  analyzeUrgency(@Body('description') description: string) {
    return this.reportService.analyzeDescription(description ?? '');
  }

  @Get()
  @Permissions('REPORT_READ')
  @ApiOperation({
    summary: 'Get all reports (Vue globale)',
    description:
      'Retrieve reports with optional filters. Level 3: Use villageName filter for "Vue globale par village". Mère SOS sees only own reports. Returns paginated results.',
  })
  @ApiQuery({
    name: 'villageName',
    required: false,
    description: 'Filter by village',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by status',
  })
  @ApiQuery({
    name: 'incidentType',
    required: false,
    description: 'Filter by incident type',
  })
  @ApiQuery({
    name: 'urgency',
    required: false,
    description: 'Filter by urgency',
  })
  @ApiQuery({
    name: 'dateFrom',
    required: false,
    description: 'From date (ISO)',
  })
  @ApiQuery({ name: 'dateTo', required: false, description: 'To date (ISO)' })
  @ApiQuery({ name: 'isArchived', required: false, type: Boolean })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of reports',
    schema: {
      example: {
        data: [],
        total: 45,
        limit: 20,
        offset: 0,
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Missing REPORT_READ permission' })
  findAll(@CurrentUser() user: JwtPayload, @Query() filters: ReportFiltersDto) {
    return this.reportService.findAll(user.sub, user.role, filters);
  }

  @Get('statistics')
  @Permissions('STATS_VIEW')
  @ApiOperation({
    summary: 'Get report statistics',
    description:
      'Get aggregated statistics about reports (by status, type, urgency)',
  })
  @ApiResponse({
    status: 200,
    description: 'Report statistics',
  })
  getStatistics() {
    return this.reportService.getStatistics();
  }

  @Get(':id')
  @Permissions('REPORT_READ')
  @ApiOperation({
    summary: 'Get report by ID',
    description:
      'Retrieve detailed information about a specific report. Anonymous reports hide reporter identity except for SuperAdmin, Directeur, or the reporter themselves.',
  })
  @ApiParam({ name: 'id', description: 'Report ID' })
  @ApiResponse({ status: 200, description: 'Report found' })
  @ApiResponse({ status: 404, description: 'Report not found' })
  @ApiResponse({
    status: 403,
    description: 'Missing permission or not your report',
  })
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.reportService.findOne(id, user.sub, user.role);
  }

  @Patch(':id')
  @Permissions('REPORT_UPDATE')
  @UseInterceptors(FilesInterceptor('files', 10, multerConfig))
  @ApiOperation({
    summary: 'Update report',
    description:
      'Update report details and optionally add more file attachments',
  })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'id', description: 'Report ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        incidentType: { type: 'string' },
        urgency: { type: 'string' },
        status: {
          type: 'string',
          enum: ['ATTENTE', 'EN_COURS', 'FAUSSE', 'CLOTURE'],
        },
        description: { type: 'string' },
        notes: { type: 'string' },
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Report updated successfully' })
  @ApiResponse({ status: 404, description: 'Report not found' })
  @ApiResponse({
    status: 403,
    description: 'Not authorized to update this report',
  })
  update(
    @Param('id') id: string,
    @Body() updateReportDto: UpdateReportDto,
    @CurrentUser() user: JwtPayload,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    return this.reportService.update(
      id,
      updateReportDto,
      user.sub,
      user.role,
      files,
    );
  }

  @Patch(':id/assign')
  @Permissions('REPORT_ASSIGN')
  @ApiOperation({
    summary: 'Assign report to analyst (Directeur only)',
    description:
      'Assign a report to a specific analyst (Psychologue, Assistant Social, or Directeur)',
  })
  @ApiParam({ name: 'id', description: 'Report ID' })
  @ApiBody({ type: AssignReportDto })
  @ApiResponse({ status: 200, description: 'Report assigned successfully' })
  @ApiResponse({ status: 404, description: 'Report or analyst not found' })
  @ApiResponse({
    status: 400,
    description: 'Analyst does not have appropriate role',
  })
  @ApiResponse({ status: 403, description: 'Missing REPORT_ASSIGN permission' })
  assign(
    @Param('id') id: string,
    @Body() assignDto: AssignReportDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.reportService.assign(id, assignDto, user.sub);
  }

  @Patch(':id/classify')
  @Permissions('REPORT_CLASSIFY')
  @ApiOperation({
    summary: 'Classify report (Psychologue, Directeur)',
    description: 'Mark report as false alarm or closed',
  })
  @ApiParam({ name: 'id', description: 'Report ID' })
  @ApiBody({ type: ClassifyReportDto })
  @ApiResponse({ status: 200, description: 'Report classified successfully' })
  @ApiResponse({ status: 404, description: 'Report not found' })
  @ApiResponse({
    status: 403,
    description: 'Missing REPORT_CLASSIFY permission',
  })
  classify(
    @Param('id') id: string,
    @Body() classifyDto: ClassifyReportDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.reportService.classify(id, classifyDto, user.sub);
  }

  @Patch(':id/close')
  @Permissions('CASE_CLOSE')
  @ApiOperation({
    summary: 'Close and archive case (Directeur, Bureau National)',
    description:
      'Formally close the case. Requires "Avis de cloture" document. Moves to archived state - no further edits allowed. Records formal decision (prise en charge, sanction, suivi).',
  })
  @ApiParam({ name: 'id', description: 'Report ID' })
  @ApiBody({ type: CloseReportDto })
  @ApiResponse({ status: 200, description: 'Case closed and archived' })
  @ApiResponse({
    status: 400,
    description:
      'Missing Avis de cloture document - upload via POST /documents/reports/:id/cloture first',
  })
  @ApiResponse({ status: 403, description: 'Missing CASE_CLOSE permission' })
  close(
    @Param('id') id: string,
    @Body() closeDto: CloseReportDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.reportService.close(id, closeDto, user.sub);
  }

  @Delete(':id')
  @Permissions('REPORT_DELETE')
  @ApiOperation({
    summary: 'Delete report (SuperAdmin)',
    description:
      'Permanently delete a report. Creates audit log before deletion.',
  })
  @ApiParam({ name: 'id', description: 'Report ID' })
  @ApiResponse({ status: 200, description: 'Report deleted successfully' })
  @ApiResponse({ status: 404, description: 'Report not found' })
  @ApiResponse({ status: 403, description: 'Missing REPORT_DELETE permission' })
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.reportService.remove(id, user.sub);
  }
}
