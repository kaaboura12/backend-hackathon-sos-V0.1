import { Module, forwardRef } from '@nestjs/common';
import { ReportService } from './report.service';
import { ReportController } from './report.controller';
import { AiService } from './ai.service';
import { NotificationModule } from '../notification/notification.module';
import { VoiceAnonymizerModule } from '../voice-anonymizer/voice-anonymizer.module';

@Module({
  imports: [forwardRef(() => NotificationModule), VoiceAnonymizerModule],
  controllers: [ReportController],
  providers: [ReportService, AiService],
  exports: [ReportService, AiService],
})
export class ReportModule {}
