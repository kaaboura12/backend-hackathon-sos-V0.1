import { Module } from '@nestjs/common';
import { VillageService } from './village.service';
import { VillageController } from './village.controller';

@Module({
  controllers: [VillageController],
  providers: [VillageService],
  exports: [VillageService],
})
export class VillageModule {}
