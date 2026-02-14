import {
  IsString,
  IsNotEmpty,
  IsBoolean,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum IncidentType {
  SANTE = 'santé',
  COMPORTEMENT = 'comportement',
  VIOLENCE = 'violence',
  ABUS = 'abus',
  NEGLIGENCE = 'négligence',
  ACCIDENT = 'accident',
  AUTRE = 'autre',
}

export enum UrgencyLevel {
  BASSE = 'BASSE',
  MOYENNE = 'MOYENNE',
  HAUTE = 'HAUTE',
  CRITIQUE = 'CRITIQUE',
}

export class CreateReportDto {
  @ApiProperty({
    enum: IncidentType,
    example: IncidentType.VIOLENCE,
    description: 'Type of incident',
  })
  @IsEnum(IncidentType)
  @IsNotEmpty()
  incidentType: string;

  @ApiProperty({
    enum: UrgencyLevel,
    example: UrgencyLevel.HAUTE,
    description: 'Urgency level of the incident',
  })
  @IsEnum(UrgencyLevel)
  @IsNotEmpty()
  urgency: string;

  @ApiPropertyOptional({
    example: false,
    description: 'Whether the report is anonymous',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isAnonymous?: boolean;

  @ApiProperty({
    example: '6990a2530ea1533dee1111e8',
    description: 'Village ID where the incident occurred. Use GET /villages to list villages.',
  })
  @IsString()
  @IsNotEmpty()
  villageId: string;

  @ApiProperty({
    example: 'Enfant X',
    description: 'Name of the child involved (can be anonymized)',
  })
  @IsString()
  @IsNotEmpty()
  childName: string;

  @ApiPropertyOptional({
    example: 'Person Y',
    description: 'Name of the abuser (if applicable)',
  })
  @IsString()
  @IsOptional()
  abuserName?: string;

  @ApiProperty({
    example: "Description détaillée de l'incident...",
    description: 'Detailed description of the incident',
  })
  @IsString()
  @IsNotEmpty()
  description: string;
}
