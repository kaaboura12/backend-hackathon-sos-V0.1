import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignReportDto {
  @ApiProperty({
    example: '6990a2530ea1533dee1111ed',
    description: 'User ID of the analyst to assign the report to',
  })
  @IsString()
  @IsNotEmpty()
  analystId: string;
}
