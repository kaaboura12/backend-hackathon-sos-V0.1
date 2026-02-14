import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserStatus } from '@prisma/client';
import { FindAllUsersQueryDto } from './dto/find-all-users-query.dto';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get all users with their roles, optionally filtered by status
   */
  async findAll(query?: FindAllUsersQueryDto) {
    const where = query?.status ? { status: query.status as UserStatus } : {};
    const users = await this.prisma.user.findMany({
      where,
      include: {
        role: true,
        village: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return users.map(({ password, ...user }) => user);
  }

  /**
   * Get user by ID
   */
  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        role: true,
        village: { select: { id: true, name: true } },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Remove password from result
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Update user role
   * Useful for SuperAdmin to reassign roles
   */
  async updateRole(userId: string, roleId: string) {
    // Validate role exists
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }

    // Update user
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { roleId },
      include: { role: true },
    });

    // Remove password from result
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userWithoutPassword } = user;

    return {
      message: 'User role updated successfully',
      user: userWithoutPassword,
    };
  }

  /**
   * Approve a pending registration. Only users with status PENDING can be approved.
   */
  async approve(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    if (user.status !== 'PENDING') {
      throw new BadRequestException(
        `User is not pending approval (current status: ${user.status})`,
      );
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { status: 'APPROVED' },
      include: { role: true },
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userWithoutPassword } = updated;
    return {
      message: 'User approved. They can now sign in.',
      user: userWithoutPassword,
    };
  }

  /**
   * Reject a pending registration.
   */
  async reject(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    if (user.status !== 'PENDING') {
      throw new BadRequestException(
        `User is not pending approval (current status: ${user.status})`,
      );
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { status: 'REJECTED' },
      include: { role: true },
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userWithoutPassword } = updated;
    return {
      message: 'Registration rejected.',
      user: userWithoutPassword,
    };
  }

  /**
   * Delete user
   */
  async remove(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    await this.prisma.user.delete({
      where: { id },
    });

    return {
      message: 'User deleted successfully',
    };
  }
}
