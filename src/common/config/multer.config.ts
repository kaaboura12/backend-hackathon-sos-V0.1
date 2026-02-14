import { diskStorage } from 'multer';
import { extname } from 'path';
import { BadRequestException } from '@nestjs/common';
import { Request } from 'express';

// Allowed file types for attachments
const ALLOWED_MIME_TYPES = {
  images: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
  audio: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm'],
  documents: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
};

const ALL_ALLOWED_TYPES = [
  ...ALLOWED_MIME_TYPES.images,
  ...ALLOWED_MIME_TYPES.audio,
  ...ALLOWED_MIME_TYPES.documents,
];

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export const multerConfig = {
  storage: diskStorage({
    destination: './uploads',
    filename: (
      req: Request,
      file: Express.Multer.File,
      callback: (error: Error | null, filename: string) => void,
    ) => {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const ext = extname(file.originalname);
      const filename = `${file.fieldname}-${uniqueSuffix}${ext}`;
      callback(null, filename);
    },
  }),
  fileFilter: (
    req: Request,
    file: Express.Multer.File,
    callback: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    if (!ALL_ALLOWED_TYPES.includes(file.mimetype)) {
      callback(
        new BadRequestException(
          `File type not allowed. Allowed types: images (jpg, png, gif, webp), audio (mp3, wav, ogg, webm), documents (pdf, doc, docx)`,
        ),
        false,
      );
      return;
    }
    callback(null, true);
  },
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
};

export function getFileType(mimetype: string): string {
  if (ALLOWED_MIME_TYPES.images.includes(mimetype)) return 'image';
  if (ALLOWED_MIME_TYPES.audio.includes(mimetype)) return 'audio';
  if (ALLOWED_MIME_TYPES.documents.includes(mimetype)) return 'document';
  return 'other';
}
