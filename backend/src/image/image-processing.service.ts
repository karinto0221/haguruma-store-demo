import { BadRequestException, Injectable } from '@nestjs/common';
import * as path from 'path';

// heic-convertには型定義がないため、CommonJS APIをこの境界内だけで扱う。
// 呼び出し側は変換ライブラリではなくImageProcessingServiceの型にのみ依存する。
const convertHeic: (input: {
  buffer: Buffer;
  format: 'JPEG';
  quality: number;
}) => Promise<ArrayBuffer> = require('heic-convert');

export interface ProcessedImage {
  data: Buffer;
  mimeType: string;
  fileName: string;
}

const HEIC_MIME_TYPES = new Set(['image/heic', 'image/heif']);
const HEIC_EXTENSIONS = new Set(['.heic', '.heif']);

@Injectable()
export class ImageProcessingService {
  isHeic(mimeType: string, fileName = ''): boolean {
    return (
      HEIC_MIME_TYPES.has(mimeType.toLowerCase()) ||
      HEIC_EXTENSIONS.has(path.extname(fileName).toLowerCase())
    );
  }

  async normalizeUpload(file: Express.Multer.File): Promise<ProcessedImage> {
    return this.normalize(file.buffer, file.mimetype, file.originalname);
  }

  async normalize(data: Buffer, mimeType: string, fileName = ''): Promise<ProcessedImage> {
    if (!this.isHeic(mimeType, fileName)) {
      return { data, mimeType, fileName };
    }

    try {
      const converted = await convertHeic({
        buffer: data,
        format: 'JPEG',
        quality: 0.9,
      });

      return {
        data: Buffer.from(converted),
        mimeType: 'image/jpeg',
        fileName: this.toJpegFileName(fileName),
      };
    } catch {
      throw new BadRequestException(
        'HEIC/HEIF画像を読み込めませんでした。別の画像を選択するか、JPEGへ変換してから再度お試しください',
      );
    }
  }

  private toJpegFileName(fileName: string): string {
    const extension = path.extname(fileName);
    const baseName = extension ? fileName.slice(0, -extension.length) : fileName;
    return `${baseName || 'image'}.jpg`;
  }
}
