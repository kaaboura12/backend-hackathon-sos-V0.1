import { IsString, IsNotEmpty, IsArray, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRoleDto {
  @ApiProperty({
    example: 'Custom Role',
    description: 'Role name',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'Custom role with specific permissions',
    description: 'Role description',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: ['REPORT_CREATE', 'REPORT_READ', 'DOC_UPLOAD_DPE'],
    description:
      'Array of permission strings (use /roles/permissions/available to see all)',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  permissions: string[];
}
