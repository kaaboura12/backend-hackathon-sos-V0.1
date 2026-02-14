import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import FormData from 'form-data';
import { createReadStream, writeFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';

const AUDIO_MIMES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/ogg',
  'audio/webm',
];

@Injectable()
export class VoiceAnonymizerService {
  private readonly logger = new Logger(VoiceAnonymizerService.name);
  private readonly serviceUrl: string;
  private readonly enabled: boolean;

  constructor() {
    this.serviceUrl =
      process.env.VOICE_ANONYMIZER_URL || 'http://localhost:5002';
    this.enabled = process.env.VOICE_ANONYMIZER_ENABLED !== 'false';
  }

  isAudioFile(mimetype: string): boolean {
    return AUDIO_MIMES.includes(mimetype);
  }

  async anonymizeAudio(
    file: Express.Multer.File,
  ): Promise<Express.Multer.File> {
    if (!this.enabled) {
      this.logger.warn(
        'Voice anonymizer disabled. Skipping. Set VOICE_ANONYMIZER_ENABLED=true to enable.',
      );
      return file;
    }

    const form = new FormData();
    form.append('audio', createReadStream(file.path), {
      filename: file.originalname || 'audio.wav',
      contentType: file.mimetype || 'audio/wav',
    });

    try {
      const response = await axios.post<ArrayBuffer>(
        `${this.serviceUrl}/anonymize`,
        form,
        {
          headers: form.getHeaders(),
          responseType: 'arraybuffer',
          timeout: 30000,
          maxContentLength: 20 * 1024 * 1024,
        },
      );

      const anonymizedFilename = `anon-${Date.now()}-${Math.round(Math.random() * 1e9)}.wav`;
      const anonymizedPath = join(file.destination, anonymizedFilename);
      writeFileSync(anonymizedPath, Buffer.from(response.data));

      if (existsSync(file.path)) {
        unlinkSync(file.path);
      }

      this.logger.log(
        `Voice anonymized: ${file.originalname} → ${anonymizedFilename}`,
      );

      return {
        ...file,
        path: anonymizedPath,
        filename: anonymizedFilename,
        originalname: `anonymized_voice.wav`,
        mimetype: 'audio/wav',
      };
    } catch (error) {
      this.logger.error(
        `Voice anonymization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new Error(
        'Voice anonymization service unavailable. Start the Python service: cd voice-anonymizer && python anonymizer.py',
      );
    }
  }

  async healthCheck(): Promise<boolean> {
    if (!this.enabled) return true;
    try {
      const response = await axios.get<{ status: string }>(
        `${this.serviceUrl}/health`,
        { timeout: 3000 },
      );
      return response.data?.status === 'ok';
    } catch {
      return false;
    }
  }
}
