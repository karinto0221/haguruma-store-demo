import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { execFile } from 'child_process';
import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export interface ProcessedImage {
  data: Buffer;
  mimeType: string;
  fileName: string;
}

const HEIC_MIME_TYPES = new Set(['image/heic', 'image/heif']);
const HEIC_EXTENSIONS = new Set(['.heic', '.heif']);

@Injectable()
export class ImageProcessingService {
  private readonly logger = new Logger(ImageProcessingService.name);

  // 複数画像の同時デコードによるメモリ急増を避けるため、HEIC変換は1件ずつ実行する。
  private conversionQueue: Promise<void> = Promise.resolve();

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

    return this.enqueueConversion(() => this.convertWithNativeTool(data, fileName));
  }

  private async enqueueConversion<T>(conversion: () => Promise<T>): Promise<T> {
    const previous = this.conversionQueue;
    let release: () => void = () => undefined;
    this.conversionQueue = new Promise<void>((resolve) => {
      release = resolve;
    });

    await previous.catch(() => undefined);
    try {
      return await conversion();
    } finally {
      release();
    }
  }

  private async convertWithNativeTool(
    data: Buffer,
    fileName: string,
  ): Promise<ProcessedImage> {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'heic-convert-'));
    const inputPath = path.join(tempDir, 'input.heic');
    const outputPath = path.join(tempDir, 'output.jpg');

    try {
      await fs.writeFile(inputPath, data);
      await execFileAsync('heif-convert', ['-q', '90', inputPath, outputPath], {
        timeout: 30_000,
      });
      const converted = await fs.readFile(outputPath);

      return {
        data: converted,
        mimeType: 'image/jpeg',
        fileName: this.toJpegFileName(fileName),
      };
    } catch (error) {
      const detail = error instanceof Error ? error.stack || error.message : String(error);
      this.logger.error(`HEIC/HEIF画像のJPEG変換に失敗しました: ${detail}`);
      throw new BadRequestException(
        'HEIC/HEIF画像を読み込めませんでした。別の画像を選択するか、JPEGへ変換してから再度お試しください',
      );
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  }

  private toJpegFileName(fileName: string): string {
    const extension = path.extname(fileName);
    const baseName = extension ? fileName.slice(0, -extension.length) : fileName;
    return `${baseName || 'image'}.jpg`;
  }
}
