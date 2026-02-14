import { IsString, IsNotEmpty, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum ClassificationType {
  FAUSSE = 'FAUSSE',
  CLOTURE = 'CLOTURE',
}

export class ClassifyReportDto {
  @ApiProperty({
    enum: ClassificationType,
    example: ClassificationType.FAUSSE,
    description: 'Classification type',
  })
  @IsEnum(ClassificationType)
  @IsNotEmpty()
  classification: string;

  @ApiProperty({
    example: 'Raison de la classification...',
    description: 'Reason for classification',
  })
  @IsString()
  @IsNotEmpty()
  reason: string;
}
