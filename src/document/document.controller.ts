import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { DocumentService, DocumentType } from './document.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/dto/jwt-payload.dto';
import { multerConfig } from '../common/config/multer.config';

@ApiTags('documents')
@ApiBearerAuth('JWT-auth')
@Controller('documents')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Post('reports/:reportId/fiche-initial')
  @Permissions('DOC_UPLOAD_FICHE_INITIAL')
  @UseInterceptors(FileInterceptor('file', multerConfig))
  @ApiOperation({
    summary: 'Upload Fiche Initial',
    description: 'Upload initial form document for a report',
  })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'reportId', description: 'Report ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Document uploaded successfully' })
  @ApiResponse({ status: 404, description: 'Report not found' })
  @ApiResponse({ status: 403, description: 'Missing permission' })
  uploadFicheInitial(
    @Param('reportId') reportId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.documentService.upload(
      reportId,
      DocumentType.FICHE_INITIAL,
      file,
      user.sub,
      `${user.email}`,
    );
  }

  @Post('reports/:reportId/dpe')
  @Permissions('DOC_UPLOAD_DPE')
  @UseInterceptors(FileInterceptor('file', multerConfig))
  @ApiOperation({
    summary: 'Upload DPE Report (Psychologue)',
    description: "Upload DPE (Diagnostic Psychologique d'Évaluation) report",
  })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'reportId', description: 'Report ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Document uploaded successfully' })
  @ApiResponse({ status: 404, description: 'Report not found' })
  @ApiResponse({
    status: 403,
    description: 'Missing DOC_UPLOAD_DPE permission',
  })
  uploadDPE(
    @Param('reportId') reportId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.documentService.upload(
      reportId,
      DocumentType.RAPPORT_DPE,
      file,
      user.sub,
      `${user.email}`,
    );
  }

  @Post('reports/:reportId/evaluation')
  @Permissions('DOC_UPLOAD_EVALUATION')
  @UseInterceptors(FileInterceptor('file', multerConfig))
  @ApiOperation({
    summary: 'Upload Evaluation',
    description: 'Upload evaluation document',
  })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'reportId', description: 'Report ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Document uploaded successfully' })
  uploadEvaluation(
    @Param('reportId') reportId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.documentService.upload(
      reportId,
      DocumentType.EVALUATION,
      file,
      user.sub,
      `${user.email}`,
    );
  }

  @Post('reports/:reportId/plan-action')
  @Permissions('DOC_UPLOAD_PLAN_ACTION')
  @UseInterceptors(FileInterceptor('file', multerConfig))
  @ApiOperation({
    summary: 'Upload Action Plan (Assistant Social)',
    description: 'Upload action plan document',
  })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'reportId', description: 'Report ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Document uploaded successfully' })
  @ApiResponse({
    status: 403,
    description: 'Missing DOC_UPLOAD_PLAN_ACTION permission',
  })
  uploadPlanAction(
    @Param('reportId') reportId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.documentService.upload(
      reportId,
      DocumentType.PLAN_ACTION,
      file,
      user.sub,
      `${user.email}`,
    );
  }

  @Post('reports/:reportId/suivi')
  @Permissions('DOC_UPLOAD_SUIVI')
  @UseInterceptors(FileInterceptor('file', multerConfig))
  @ApiOperation({
    summary: 'Upload Follow-up Report',
    description: 'Upload follow-up/monitoring document',
  })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'reportId', description: 'Report ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Document uploaded successfully' })
  uploadSuivi(
    @Param('reportId') reportId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.documentService.upload(
      reportId,
      DocumentType.SUIVI,
      file,
      user.sub,
      `${user.email}`,
    );
  }

  @Post('reports/:reportId/rapport-final')
  @Permissions('DOC_UPLOAD_RAPPORT_FINAL')
  @UseInterceptors(FileInterceptor('file', multerConfig))
  @ApiOperation({
    summary: 'Upload Final Report (Directeur)',
    description: 'Upload final report document',
  })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'reportId', description: 'Report ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Document uploaded successfully' })
  @ApiResponse({
    status: 403,
    description: 'Missing DOC_UPLOAD_RAPPORT_FINAL permission',
  })
  uploadRapportFinal(
    @Param('reportId') reportId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.documentService.upload(
      reportId,
      DocumentType.RAPPORT_FINAL,
      file,
      user.sub,
      `${user.email}`,
    );
  }

  @Post('reports/:reportId/cloture')
  @Permissions('DOC_UPLOAD_CLOTURE')
  @UseInterceptors(FileInterceptor('file', multerConfig))
  @ApiOperation({
    summary: 'Upload Closure Document',
    description: 'Upload case closure document',
  })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'reportId', description: 'Report ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Document uploaded successfully' })
  uploadCloture(
    @Param('reportId') reportId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.documentService.upload(
      reportId,
      DocumentType.CLOTURE,
      file,
      user.sub,
      `${user.email}`,
    );
  }

  @Get('reports/:reportId')
  @Permissions('DOC_READ')
  @ApiOperation({
    summary: 'Get all documents for a report',
    description: 'Retrieve all procedure documents associated with a report',
  })
  @ApiParam({ name: 'reportId', description: 'Report ID' })
  @ApiResponse({
    status: 200,
    description: 'List of documents',
  })
  @ApiResponse({ status: 404, description: 'Report not found' })
  findByReport(@Param('reportId') reportId: string) {
    return this.documentService.findByReport(reportId);
  }

  @Get(':id')
  @Permissions('DOC_READ')
  @ApiOperation({
    summary: 'Get document by ID',
    description: 'Retrieve specific document details',
  })
  @ApiParam({ name: 'id', description: 'Document ID' })
  @ApiResponse({ status: 200, description: 'Document found' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  findOne(@Param('id') id: string) {
    return this.documentService.findOne(id);
  }

  @Delete(':id')
  @Permissions('DOC_DELETE')
  @ApiOperation({
    summary: 'Delete document',
    description: 'Permanently delete a procedure document. Creates audit log.',
  })
  @ApiParam({ name: 'id', description: 'Document ID' })
  @ApiResponse({ status: 200, description: 'Document deleted successfully' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  @ApiResponse({ status: 403, description: 'Missing DOC_DELETE permission' })
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.documentService.remove(id, user.sub, user.permissions);
  }
}
