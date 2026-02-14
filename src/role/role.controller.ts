import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
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
import { RoleService } from './role.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@ApiTags('roles')
@ApiBearerAuth('JWT-auth')
@Controller('roles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Post()
  @Permissions('ROLE_CREATE')
  @ApiOperation({
    summary: 'Create new role (SuperAdmin only)',
    description:
      'Create a custom role with specific permissions. Requires ROLE_CREATE permission.',
  })
  @ApiBody({ type: CreateRoleDto })
  @ApiResponse({
    status: 201,
    description: 'Role created successfully',
    schema: {
      example: {
        message: 'Role created successfully',
        role: {
          id: '6990a2530ea1533dee1111ef',
          name: 'Custom Role',
          description: 'Custom role with specific permissions',
          permissions: ['REPORT_READ', 'REPORT_CREATE'],
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Role name already exists' })
  @ApiResponse({ status: 403, description: 'Missing ROLE_CREATE permission' })
  create(@Body() createRoleDto: CreateRoleDto) {
    return this.roleService.create(createRoleDto);
  }

  @Get()
  @Permissions('ROLE_READ')
  @ApiOperation({
    summary: 'Get all roles',
    description:
      'Retrieve all roles with their permissions and user counts. Use this to get role IDs for sign-up.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of all roles',
    schema: {
      example: [
        {
          id: '6990a2530ea1533dee1111e7',
          name: 'SuperAdmin',
          description: 'Full system access',
          permissions: ['REPORT_CREATE', 'USER_MANAGE', 'ROLE_UPDATE'],
          _count: { users: 2 },
        },
        {
          id: '6990a2530ea1533dee1111e9',
          name: 'Psychologue',
          description: 'Psychologist - can handle DPE and evaluations',
          permissions: ['REPORT_READ', 'DOC_UPLOAD_DPE', 'REPORT_CLASSIFY'],
          _count: { users: 5 },
        },
      ],
    },
  })
  @ApiResponse({ status: 403, description: 'Missing ROLE_READ permission' })
  findAll() {
    return this.roleService.findAll();
  }

  @Get('permissions/available')
  @Permissions('ROLE_READ')
  @ApiOperation({
    summary: 'Get all available permissions',
    description:
      'List all permissions that can be assigned to roles. Use this when creating or updating roles.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of available permissions',
    schema: {
      example: {
        permissions: [
          'REPORT_CREATE',
          'REPORT_READ',
          'REPORT_UPDATE',
          'REPORT_DELETE',
          'DOC_UPLOAD_DPE',
          'USER_MANAGE',
          'ROLE_UPDATE',
        ],
      },
    },
  })
  getAvailablePermissions() {
    return this.roleService.getAvailablePermissions();
  }

  @Get(':id')
  @Permissions('ROLE_READ')
  @ApiOperation({
    summary: 'Get role by ID',
    description: 'Retrieve specific role details',
  })
  @ApiParam({
    name: 'id',
    description: 'Role ID',
    example: '6990a2530ea1533dee1111e7',
  })
  @ApiResponse({ status: 200, description: 'Role found' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  findOne(@Param('id') id: string) {
    return this.roleService.findOne(id);
  }

  @Patch(':id')
  @Permissions('ROLE_UPDATE')
  @ApiOperation({
    summary: 'Update role (SuperAdmin only)',
    description:
      'Update role name, description, or permissions. This is the core of the dynamic permission system - permissions can be modified without code changes.',
  })
  @ApiParam({ name: 'id', description: 'Role ID to update' })
  @ApiBody({ type: UpdateRoleDto })
  @ApiResponse({
    status: 200,
    description: 'Role updated successfully',
    schema: {
      example: {
        message: 'Role updated successfully',
        role: {
          id: '6990a2530ea1533dee1111e9',
          name: 'Psychologue',
          permissions: [
            'REPORT_READ',
            'DOC_UPLOAD_DPE',
            'REPORT_CLASSIFY',
            'REPORT_UPDATE',
          ],
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Role not found' })
  @ApiResponse({ status: 403, description: 'Missing ROLE_UPDATE permission' })
  update(@Param('id') id: string, @Body() updateRoleDto: UpdateRoleDto) {
    return this.roleService.update(id, updateRoleDto);
  }

  @Delete(':id')
  @Permissions('ROLE_DELETE')
  @ApiOperation({
    summary: 'Delete role (SuperAdmin only)',
    description:
      'Delete a role. Cannot delete if users are assigned to this role.',
  })
  @ApiParam({ name: 'id', description: 'Role ID to delete' })
  @ApiResponse({ status: 200, description: 'Role deleted successfully' })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete role with assigned users',
  })
  @ApiResponse({ status: 404, description: 'Role not found' })
  @ApiResponse({ status: 403, description: 'Missing ROLE_DELETE permission' })
  remove(@Param('id') id: string) {
    return this.roleService.remove(id);
  }
}
