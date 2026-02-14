import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVillageDto } from './dto/create-village.dto';
import { UpdateVillageDto } from './dto/update-village.dto';

@Injectable()
export class VillageService {
  constructor(private prisma: PrismaService) {}

  async create(createVillageDto: CreateVillageDto) {
    const existing = await this.prisma.village.findUnique({
      where: { name: createVillageDto.name.trim() },
    });
    if (existing) {
      throw new BadRequestException(
        `Village with name "${createVillageDto.name}" already exists`,
      );
    }
    return this.prisma.village.create({
      data: {
        name: createVillageDto.name.trim(),
        description: createVillageDto.description?.trim() ?? null,
      },
    });
  }

  async findAll() {
    return this.prisma.village.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const village = await this.prisma.village.findUnique({
      where: { id },
      include: {
        _count: { select: { users: true, reports: true } },
      },
    });
    if (!village) {
      throw new NotFoundException(`Village with ID ${id} not found`);
    }
    return village;
  }

  async update(id: string, updateVillageDto: UpdateVillageDto) {
    await this.findOne(id);
    if (updateVillageDto.name !== undefined) {
      const existing = await this.prisma.village.findFirst({
        where: {
          name: updateVillageDto.name.trim(),
          id: { not: id },
        },
      });
      if (existing) {
        throw new BadRequestException(
          `Another village already has the name "${updateVillageDto.name}"`,
        );
      }
    }
    return this.prisma.village.update({
      where: { id },
      data: {
        ...(updateVillageDto.name !== undefined && {
          name: updateVillageDto.name.trim(),
        }),
        ...(updateVillageDto.description !== undefined && {
          description: updateVillageDto.description?.trim() ?? null,
        }),
      },
    });
  }

  async remove(id: string) {
    const village = await this.prisma.village.findUnique({
      where: { id },
      include: { _count: { select: { users: true, reports: true } } },
    });
    if (!village) {
      throw new NotFoundException(`Village with ID ${id} not found`);
    }
    if (village._count.users > 0 || village._count.reports > 0) {
      throw new BadRequestException(
        `Cannot delete village "${village.name}". It has ${village._count.users} user(s) and ${village._count.reports} report(s). Reassign or remove them first.`,
      );
    }
    await this.prisma.village.delete({ where: { id } });
    return { message: 'Village deleted successfully' };
  }
}
