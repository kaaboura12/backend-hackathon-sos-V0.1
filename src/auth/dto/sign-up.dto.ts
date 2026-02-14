import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsOptional,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SignUpDto {
  @ApiProperty({
    example: 'user@sos.tn',
    description: 'User email address',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: 'securePassword123',
    description: 'User password (minimum 8 characters)',
    minLength: 8,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @ApiProperty({
    example: 'John',
    description: 'User first name',
  })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({
    example: 'Doe',
    description: 'User last name',
  })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({
    example: '6990a2530ea1533dee1111e7',
    description:
      'Role ID from database (use /roles endpoint to get available role IDs)',
  })
  @IsString()
  @IsNotEmpty()
  roleId: string;

  @ApiProperty({
    example: 'Village Gammarth',
    description: 'Village name (optional, for programme)',
    required: false,
  })
  @IsString()
  @IsOptional()
  villageName?: string;
}
