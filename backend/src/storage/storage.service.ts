import { Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';

/**
 * ファイル保存を抽象化するサービス。
 * 今はローカルディスクに保存しているが、本番でS3に切り替える際は
 * このクラスの中身だけ差し替えれば良いようにしている
 * (呼び出し側 = OrdersService は save()/getPublicPath() しか使わない)。
 */
@Injectable()
export class StorageService {
  private readonly uploadDir = process.env.UPLOAD_DIR || './uploads';

  async ensureDir() {
    await fs.mkdir(this.uploadDir, { recursive: true });
  }

  async save(orderId: string, originalName: string, buffer: Buffer): Promise<string> {
    await this.ensureDir();
    const orderDir = path.join(this.uploadDir, orderId);
    await fs.mkdir(orderDir, { recursive: true });

    const safeName = `${Date.now()}-${originalName.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;
    const filePath = path.join(orderDir, safeName);
    await fs.writeFile(filePath, buffer);

    // 保存したファイルの相対パスを返す(注文データに保存し、後で参照する)
    return path.join(orderId, safeName);
  }

  // 管理画面やメールから参照する際のフルパス
  getFullPath(relativePath: string): string {
    return path.join(this.uploadDir, relativePath);
  }
}
