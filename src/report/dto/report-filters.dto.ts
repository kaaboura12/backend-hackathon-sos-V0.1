import { IsOptional, IsString, IsDateString, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

function parseBoolean(value: unknown): boolean {
  if (value === 'true' || value === true) return true;
  if (value === 'false' || value === false) return false;
  return false;
}

export class ReportFiltersDto {
  @ApiPropertyOptional({
    example: 'Village Gammarth',
    description: 'Filter by village name - Vue globale par village',
  })
  @IsOptional()
  @IsString()
  villageName?: string;

  @ApiPropertyOptional({
    example: 'EN_COURS',
    description: 'Filter by status (ATTENTE, EN_COURS, FAUSSE, CLOTURE)',
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    example: 'violence',
    description: 'Filter by incident type',
  })
  @IsOptional()
  @IsString()
  incidentType?: string;

  @ApiPropertyOptional({
    example: 'HAUTE',
    description: 'Filter by urgency level',
  })
  @IsOptional()
  @IsString()
  urgency?: string;

  @ApiPropertyOptional({
    example: '2024-01-01',
    description: 'Filter reports created after this date (ISO format)',
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({
    example: '2024-12-31',
    description: 'Filter reports created before this date (ISO format)',
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({
    example: false,
    description: 'Filter archived reports only',
  })
  @IsOptional()
  @Transform(({ value }) => parseBoolean(value))
  @IsBoolean()
  isArchived?: boolean;

  @ApiPropertyOptional({
    example: 20,
    description: 'Number of results per page',
    default: 20,
  })
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({
    example: 0,
    description: 'Offset for pagination',
    default: 0,
  })
  @IsOptional()
  offset?: number;
}
