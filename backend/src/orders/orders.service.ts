import { Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { OrdersRepository, OrderRecord } from '../data/orders.repository';
import { StorageService } from '../storage/storage.service';
import { MailService } from '../mail/mail.service';
import { ProductsService } from '../products/products.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrdersService {
  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly storageService: StorageService,
    private readonly mailService: MailService,
    private readonly productsService: ProductsService,
  ) {}

  async createOrder(dto: CreateOrderDto, files: Express.Multer.File[]) {
    const product = this.productsService.findById(dto.productId);
    if (!product) {
      throw new NotFoundException('指定された商品が見つかりません');
    }

    const orderId = uuidv4();

    const filePaths: string[] = [];
    const fileNames: string[] = [];
    for (const file of files || []) {
      const savedPath = await this.storageService.save(orderId, file.originalname, file.buffer);
      filePaths.push(savedPath);
      fileNames.push(file.originalname);
    }

    const order: OrderRecord = {
      id: orderId,
      productId: product.id,
      productName: product.name,
      customerName: dto.customerName,
      customerEmail: dto.customerEmail,
      quantity: dto.quantity,
      notes: dto.notes,
      fileNames,
      filePaths,
      status: 'new',
      createdAt: new Date().toISOString(),
    };

    await this.ordersRepository.create(order);

    // 管理者への通知メール。失敗しても注文自体は成立させたいのでエラーは握りつぶさずログのみにする
    await this.mailService.sendNewOrderNotification({
      orderId: order.id,
      productName: order.productName,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      quantity: order.quantity,
      notes: order.notes,
      fileNames: order.fileNames,
    });

    return { orderId: order.id };
  }

  async findAll() {
    return this.ordersRepository.findAll();
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
}
