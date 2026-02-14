import {
  Controller,
  Get,
  Param,
  Delete,
  Patch,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@ApiTags('users')
@ApiBearerAuth('JWT-auth')
@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @Permissions('USER_READ')
  @ApiOperation({
    summary: 'Get all users',
    description:
      'Retrieve list of all users with their roles. Requires USER_READ permission.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of users',
    schema: {
      example: [
        {
          id: '6990a2530ea1533dee1111ed',
          email: 'user@sos.tn',
          firstName: 'John',
          lastName: 'Doe',
          villageName: 'Village Gammarth',
          role: {
            id: '6990a2530ea1533dee1111e9',
            name: 'Psychologue',
            permissions: ['REPORT_READ', 'DOC_UPLOAD_DPE'],
          },
          createdAt: '2024-01-15T10:30:00.000Z',
        },
      ],
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Missing USER_READ permission' })
  findAll() {
    return this.userService.findAll();
  }

  @Get(':id')
  @Permissions('USER_READ')
  @ApiOperation({
    summary: 'Get user by ID',
    description:
      'Retrieve specific user details. Requires USER_READ permission.',
  })
  @ApiParam({
    name: 'id',
    description: 'User ID',
    example: '6990a2530ea1533dee1111ed',
  })
  @ApiResponse({ status: 200, description: 'User found' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 403, description: 'Missing USER_READ permission' })
  findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

  @Patch(':id/role')
  @Permissions('USER_MANAGE')
  @ApiOperation({
    summary: 'Update user role (SuperAdmin only)',
    description:
      "Change a user's role by providing a new roleId. This is a key SuperAdmin function. Requires USER_MANAGE permission (typically SuperAdmin only).",
  })
  @ApiParam({
    name: 'id',
    description: 'User ID to update',
    example: '6990a2530ea1533dee1111ed',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        roleId: {
          type: 'string',
          description: 'New role ID (get from /roles endpoint)',
          example: '6990a2530ea1533dee1111e9',
        },
      },
      required: ['roleId'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'User role updated successfully',
    schema: {
      example: {
        message: 'User role updated successfully',
        user: {
          id: '6990a2530ea1533dee1111ed',
          email: 'user@sos.tn',
          firstName: 'John',
          lastName: 'Doe',
          villageName: 'Village Gammarth',
          role: {
            id: '6990a2530ea1533dee1111e9',
            name: 'Psychologue',
            permissions: ['REPORT_READ', 'DOC_UPLOAD_DPE'],
          },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'User or role not found' })
  @ApiResponse({ status: 403, description: 'Missing USER_MANAGE permission' })
  updateRole(@Param('id') id: string, @Body('roleId') roleId: string) {
    return this.userService.updateRole(id, roleId);
  }

  @Delete(':id')
  @Permissions('USER_DELETE')
  @ApiOperation({
    summary: 'Delete user',
    description: 'Permanently delete a user. Requires USER_DELETE permission.',
  })
  @ApiParam({ name: 'id', description: 'User ID to delete' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 403, description: 'Missing USER_DELETE permission' })
  remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }
}
