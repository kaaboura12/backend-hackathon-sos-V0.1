import { Module, forwardRef } from '@nestjs/common';
import { ReportService } from './report.service';
import { ReportController } from './report.controller';
import { NotificationModule } from '../notification/notification.module';
import { VoiceAnonymizerModule } from '../voice-anonymizer/voice-anonymizer.module';

@Module({
  imports: [forwardRef(() => NotificationModule), VoiceAnonymizerModule],
  controllers: [ReportController],
  providers: [ReportService],
  exports: [ReportService],
})
export class ReportModule {}
