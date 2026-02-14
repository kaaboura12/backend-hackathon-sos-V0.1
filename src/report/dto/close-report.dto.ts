import { IsString, IsNotEmpty, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum ClosureDecision {
  PRISE_EN_CHARGE = 'prise en charge',
  SANCTION = 'sanction',
  SUIVI = 'suivi',
}

export class CloseReportDto {
  @ApiProperty({
    enum: ClosureDecision,
    example: ClosureDecision.PRISE_EN_CHARGE,
    description: 'Formal closure decision (prise en charge, sanction, suivi)',
  })
  @IsEnum(ClosureDecision)
  @IsNotEmpty()
  closureDecision: string;

  @ApiProperty({
    example:
      'Dossier traité conformément aux procédures. Enfant pris en charge.',
    description: 'Closure notes/comments',
  })
  @IsString()
  @IsNotEmpty()
  closureNotes: string;
}
