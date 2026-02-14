import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateVillageDto {
  @ApiProperty({ example: 'Village Gammarth', description: 'Village name (unique)' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Programme SOS Gammarth', description: 'Optional description' })
  @IsString()
  @IsOptional()
  description?: string;
}
