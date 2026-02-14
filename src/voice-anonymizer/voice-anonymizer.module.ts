import { Global, Module } from '@nestjs/common';
import { VoiceAnonymizerService } from './voice-anonymizer.service';

@Global()
@Module({
  providers: [VoiceAnonymizerService],
  exports: [VoiceAnonymizerService],
})
export class VoiceAnonymizerModule {}
