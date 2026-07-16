import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  AnalysisOrdersFilter,
  OrdersRepository,
  OrderRecord,
} from '../data/orders.repository';
import { StorageService } from '../storage/storage.service';
import { MailService } from '../mail/mail.service';
import { ProductsService } from '../products/products.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { QueryOrdersDto } from './dto/query-orders.dto';
import { OrderStatus } from './order-status';
import { ImageProcessingService } from '../image/image-processing.service';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly storageService: StorageService,
    private readonly mailService: MailService,
    private readonly productsService: ProductsService,
    private readonly imageProcessingService: ImageProcessingService,
  ) {}

  async createOrder(dto: CreateOrderDto, files: Express.Multer.File[]) {
    const product = await this.productsService.findById(dto.productId);
    if (!product) {
      throw new NotFoundException('指定された商品が見つかりません');
    }

    const orderId = uuidv4();

    const filePaths: string[] = [];
    const fileNames: string[] = [];
    for (const file of files || []) {
      const processed = this.imageProcessingService.isHeic(file.mimetype, file.originalname)
        ? await this.imageProcessingService.normalizeUpload(file)
        : { data: file.buffer, fileName: file.originalname };
      const savedPath = await this.storageService.save(
        orderId,
        processed.fileName,
        processed.data,
      );
      filePaths.push(savedPath);
      fileNames.push(processed.fileName);
    }

    const order: OrderRecord = {
      id: orderId,
      productId: product.id,
      productName: product.name,
      customerName: dto.customerName,
      customerEmail: dto.customerEmail,
      customerPhone: dto.customerPhone,
      quantity: dto.quantity,
      totalPrice: product.priceFrom * dto.quantity,
      notes: dto.notes,
      fileNames,
      filePaths,
      status: 'new',
      createdAt: new Date().toISOString(),
    };

    await this.ordersRepository.create(order);

    // 管理者通知とお客様の受付完了メールは独立して送信する。
    // 注文はすでに保存済みのため、メール失敗でAPIを500にして重複注文を誘発しない。
    const mailResults = await Promise.allSettled([
      this.mailService.sendNewOrderNotification({
        orderId: order.id,
        productName: order.productName,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        customerPhone: order.customerPhone,
        quantity: order.quantity,
        notes: order.notes,
        fileNames: order.fileNames,
      }),
      this.mailService.sendOrderConfirmation({
        to: order.customerEmail,
        orderId: order.id,
        productName: order.productName,
        customerName: order.customerName,
        quantity: order.quantity,
      }),
    ]);

    const mailLabels = ['管理者向け新規注文通知', 'お客様向け注文受付通知'];
    mailResults.forEach((result, index) => {
      if (result.status === 'rejected') {
        const error =
          result.reason instanceof Error ? result.reason : new Error(String(result.reason));
        this.logger.error(
          `${mailLabels[index]}の送信に失敗しました (注文ID: ${order.id})`,
          error.stack,
        );
      }
    });

    return { orderId: order.id };
  }

  async findAll(query: QueryOrdersDto = {}) {
    return this.ordersRepository.findAll({
      status: query.status,
      includeCompleted: query.includeCompleted,
      keyword: query.keyword,
      // 日付入力(YYYY-MM-DD)を、その日の始まり/終わりのISO日時に変換してから絞り込む
      dateFrom: query.dateFrom ? `${query.dateFrom}T00:00:00.000Z` : undefined,
      dateTo: query.dateTo ? `${query.dateTo}T23:59:59.999Z` : undefined,
    });
  }

  async findForAnalysis(filter: AnalysisOrdersFilter, maxRows: number) {
    return this.ordersRepository.findForAnalysis(
      {
        ...filter,
        // 管理画面の利用者に合わせ、日付境界は日本時間としてDBへ渡す。
        dateFrom: filter.dateFrom ? `${filter.dateFrom}T00:00:00.000+09:00` : undefined,
        dateTo: filter.dateTo ? `${filter.dateTo}T23:59:59.999+09:00` : undefined,
      },
      maxRows,
    );
  }

  async findCustomerPersonalValues() {
    return this.ordersRepository.findCustomerPersonalValues();
  }

  async findById(orderId: string) {
    const order = await this.ordersRepository.findById(orderId);
    if (!order) {
      throw new NotFoundException('注文が見つかりません');
    }
    return order;
  }

  async findFile(orderId: string, fileIndex: number) {
    const order = await this.findById(orderId);
    if (!Number.isInteger(fileIndex) || fileIndex < 0 || fileIndex >= order.filePaths.length) {
      throw new NotFoundException('添付ファイルが見つかりません');
    }

    try {
      const storedBuffer = await this.storageService.read(order.filePaths[fileIndex]);
      const fileName = order.fileNames[fileIndex] || `attachment-${fileIndex + 1}`;
      const mimeType = this.getMimeType(fileName);
      const processed = await this.imageProcessingService.normalize(
        storedBuffer,
        mimeType,
        fileName,
      );
      return {
        buffer: processed.data,
        fileName: processed.fileName,
        mimeType: processed.mimeType,
      };
    } catch {
      throw new NotFoundException('添付ファイルが見つかりません');
    }
  }

  async updateStatus(orderId: string, status: OrderStatus) {
    const order = await this.ordersRepository.findById(orderId);
    if (!order) {
      throw new NotFoundException('注文が見つかりません');
    }
    return this.ordersRepository.update(orderId, { status });
  }

  async sendPaymentLink(orderId: string, paymentLink: string) {
    const order = await this.ordersRepository.findById(orderId);
    if (!order) {
      throw new NotFoundException('注文が見つかりません');
    }

    await this.mailService.sendPaymentLink({
      to: order.customerEmail,
      customerName: order.customerName,
      productName: order.productName,
      paymentLink,
    });

    return this.ordersRepository.update(orderId, {
      status: 'payment_link_sent',
      paymentLink,
    });
  }

  private getMimeType(fileName: string): string {
    switch (path.extname(fileName).toLowerCase()) {
      case '.jpg':
      case '.jpeg':
        return 'image/jpeg';
      case '.png':
        return 'image/png';
      case '.gif':
        return 'image/gif';
      case '.webp':
        return 'image/webp';
      case '.heic':
        return 'image/heic';
      case '.heif':
        return 'image/heif';
      case '.pdf':
        return 'application/pdf';
      default:
        return 'application/octet-stream';
    }
  }
}
