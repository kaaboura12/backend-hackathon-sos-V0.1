import { PartialType } from '@nestjs/swagger';
import { CreateReportDto } from './create-report.dto';
import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum ReportStatus {
  ATTENTE = 'ATTENTE',
  EN_COURS = 'EN_COURS',
  FAUSSE = 'FAUSSE',
  CLOTURE = 'CLOTURE',
}

export class UpdateReportDto extends PartialType(CreateReportDto) {
  @ApiPropertyOptional({
    enum: ReportStatus,
    example: ReportStatus.EN_COURS,
    description: 'Report status',
  })
  @IsEnum(ReportStatus)
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({
    example: 'Notes supplémentaires...',
    description: 'Additional notes or updates',
  })
  @IsString()
  @IsOptional()
  notes?: string;
}
