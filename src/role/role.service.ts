import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RoleService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new role
   * SuperAdmin can create custom roles with specific permissions
   */
  async create(createRoleDto: CreateRoleDto) {
    // Check if role name already exists
    const existingRole = await this.prisma.role.findUnique({
      where: { name: createRoleDto.name },
    });

    if (existingRole) {
      throw new BadRequestException(
        `Role with name "${createRoleDto.name}" already exists`,
      );
    }

    const role = await this.prisma.role.create({
      data: createRoleDto,
    });

    return {
      message: 'Role created successfully',
      role,
    };
  }

  /**
   * Get all roles
   */
  async findAll() {
    return this.prisma.role.findMany({
      include: {
        _count: {
          select: { users: true }, // Count users with this role
        },
      },
    });
  }

  /**
   * Get role by ID
   */
  async findOne(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    return role;
  }

  /**
   * Update role permissions
   * This is the CORE of the 5-year future-proof requirement
   * SuperAdmin can modify permissions without code changes
   */
  async update(id: string, updateRoleDto: UpdateRoleDto) {
    const role = await this.prisma.role.findUnique({
      where: { id },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    const updatedRole = await this.prisma.role.update({
      where: { id },
      data: updateRoleDto,
    });

    return {
      message: 'Role updated successfully',
      role: updatedRole,
    };
  }

  /**
   * Delete role
   * Cannot delete role if users are assigned to it
   */
  async remove(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    if (role._count.users > 0) {
      throw new BadRequestException(
        `Cannot delete role "${role.name}". ${role._count.users} user(s) are assigned to this role.`,
      );
    }

    await this.prisma.role.delete({
      where: { id },
    });

    return {
      message: 'Role deleted successfully',
    };
  }

  /**
   * Get all available permissions
   * This helps SuperAdmin know what permissions they can assign
   */
  getAvailablePermissions() {
    return {
      permissions: [
        // Report Management
        'REPORT_CREATE',
        'REPORT_READ',
        'REPORT_UPDATE',
        'REPORT_DELETE',
        'REPORT_CLASSIFY', // Mark as false/closed
        'REPORT_ASSIGN',
        'CASE_CLOSE', // Level 3: Close and archive with Avis de cloture

        // Document Management
        'DOC_UPLOAD_FICHE_INITIAL',
        'DOC_UPLOAD_DPE',
        'DOC_UPLOAD_EVALUATION',
        'DOC_UPLOAD_PLAN_ACTION',
        'DOC_UPLOAD_SUIVI',
        'DOC_UPLOAD_RAPPORT_FINAL',
        'DOC_UPLOAD_CLOTURE',
        'DOC_READ',
        'DOC_DELETE',

        // User Management
        'USER_READ',
        'USER_CREATE',
        'USER_UPDATE',
        'USER_DELETE',
        'USER_MANAGE', // Change roles

        // Role Management (SuperAdmin only)
        'ROLE_CREATE',
        'ROLE_READ',
        'ROLE_UPDATE',
        'ROLE_DELETE',

        // Audit Logs
        'AUDIT_READ',

        // Dashboard/Statistics
        'STATS_VIEW',
      ],
    };
  }
}
