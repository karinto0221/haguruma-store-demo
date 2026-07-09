import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { SendPaymentLinkDto } from './dto/send-payment-link.dto';
import { AdminAuthGuard } from '../common/admin-auth.guard';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // お客様向け: 注文作成 (商品選択 + フォーム内容 + デザインファイル添付)
  @Post()
  @UseInterceptors(FilesInterceptor('files', 5, { limits: { fileSize: 20 * 1024 * 1024 } }))
  async create(
    @Body() dto: CreateOrderDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.ordersService.createOrder(dto, files);
  }

  // 管理者向け: 注文一覧の取得 (x-admin-key ヘッダーが必要)
  @UseGuards(AdminAuthGuard)
  @Get()
  async findAll() {
    return this.ordersService.findAll();
  }

  // 管理者向け: 支払いリンクを確定してお客様にメール送信 (x-admin-key ヘッダーが必要)
  @UseGuards(AdminAuthGuard)
  @Post(':id/send-payment-link')
  async sendPaymentLink(@Param('id') id: string, @Body() dto: SendPaymentLinkDto) {
    return this.ordersService.sendPaymentLink(id, dto.paymentLink);
  }
}
