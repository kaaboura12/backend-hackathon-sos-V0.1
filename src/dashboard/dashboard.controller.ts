import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/dto/jwt-payload.dto';

@ApiTags('dashboard')
@ApiBearerAuth('JWT-auth')
@Controller('dashboard')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('my-dashboard')
  @Permissions('REPORT_READ')
  @ApiOperation({
    summary: 'Get analyst dashboard',
    description:
      'Get personalized dashboard for Psychologue/Assistant Social showing assigned reports, pending actions, and statistics',
  })
  @ApiResponse({
    status: 200,
    description: 'Analyst dashboard data',
  })
  getMyDashboard(@CurrentUser() user: JwtPayload) {
    return this.dashboardService.getAnalystDashboard(user.sub, user.role);
  }

  @Get('global')
  @Permissions('STATS_VIEW')
  @ApiOperation({
    summary: 'Get global dashboard',
    description:
      'Get system-wide statistics and metrics for management (Directeur, Direction Nationale)',
  })
  @ApiResponse({
    status: 200,
    description: 'Global dashboard data',
  })
  getGlobalDashboard() {
    return this.dashboardService.getGlobalDashboard();
  }

  @Get('process-tracking/:reportId')
  @Permissions('REPORT_READ')
  @ApiOperation({
    summary: 'Get report process tracking',
    description:
      'Track progress of procedure documents and timeline for a specific report. Shows which steps are completed and delays.',
  })
  @ApiParam({ name: 'reportId', description: 'Report ID' })
  @ApiResponse({
    status: 200,
    description: 'Process tracking details',
    schema: {
      example: {
        report: {
          id: '...',
          incidentType: 'violence',
          urgency: 'HAUTE',
          status: 'EN_COURS',
        },
        progress: {
          percentage: 57,
          completedSteps: 4,
          totalSteps: 7,
          daysSinceCreation: 5,
          expectedDays: 7,
          isDelayed: false,
        },
        procedureSteps: [
          {
            step: 'Signalement initial',
            required: true,
            completed: true,
            completedAt: '2024-01-15T10:00:00Z',
          },
        ],
        timeline: [],
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Report not found' })
  getProcessTracking(@Param('reportId') reportId: string) {
    return this.dashboardService.getProcessTracking(reportId);
  }
}
