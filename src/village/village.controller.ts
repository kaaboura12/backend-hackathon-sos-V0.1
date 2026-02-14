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
import { VillageService } from './village.service';
import { CreateVillageDto } from './dto/create-village.dto';
import { UpdateVillageDto } from './dto/update-village.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('villages')
@Controller('villages')
export class VillageController {
  constructor(private readonly villageService: VillageService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: 'List all villages (public)',
    description:
      'Returns all villages for sign-up and report forms. No auth required.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of villages',
    schema: {
      example: [
        { id: '...', name: 'Village Gammarth', description: 'Programme SOS Gammarth', createdAt: '...' },
      ],
    },
  })
  findAll() {
    return this.villageService.findAll();
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get village by ID (public)' })
  @ApiParam({ name: 'id', description: 'Village ID' })
  @ApiResponse({ status: 200, description: 'Village details' })
  @ApiResponse({ status: 404, description: 'Village not found' })
  findOne(@Param('id') id: string) {
    return this.villageService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('VILLAGE_CREATE')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create village (SuperAdmin)',
    description: 'Create a new programme/village. SuperAdmin only.',
  })
  @ApiBody({ type: CreateVillageDto })
  @ApiResponse({ status: 201, description: 'Village created' })
  @ApiResponse({ status: 400, description: 'Name already exists' })
  @ApiResponse({ status: 403, description: 'Missing VILLAGE_CREATE permission' })
  create(@Body() createVillageDto: CreateVillageDto) {
    return this.villageService.create(createVillageDto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('VILLAGE_UPDATE')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update village (SuperAdmin)',
    description: 'Update village name or description.',
  })
  @ApiParam({ name: 'id', description: 'Village ID' })
  @ApiBody({ type: UpdateVillageDto })
  @ApiResponse({ status: 200, description: 'Village updated' })
  @ApiResponse({ status: 404, description: 'Village not found' })
  @ApiResponse({ status: 403, description: 'Missing VILLAGE_UPDATE permission' })
  update(@Param('id') id: string, @Body() updateVillageDto: UpdateVillageDto) {
    return this.villageService.update(id, updateVillageDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('VILLAGE_DELETE')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Delete village (SuperAdmin)',
    description: 'Delete a village. Fails if it has users or reports.',
  })
  @ApiParam({ name: 'id', description: 'Village ID' })
  @ApiResponse({ status: 200, description: 'Village deleted' })
  @ApiResponse({ status: 400, description: 'Village has users or reports' })
  @ApiResponse({ status: 404, description: 'Village not found' })
  @ApiResponse({ status: 403, description: 'Missing VILLAGE_DELETE permission' })
  remove(@Param('id') id: string) {
    return this.villageService.remove(id);
  }
}
