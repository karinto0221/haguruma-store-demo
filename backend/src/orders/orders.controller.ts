import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { SendPaymentLinkDto } from './dto/send-payment-link.dto';
import { QueryOrdersDto } from './dto/query-orders.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
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

  // 管理者向け: 注文一覧の取得・検索 (Bearerアクセストークンが必要)
  @UseGuards(AdminAuthGuard)
  @Get()
  async findAll(@Query() query: QueryOrdersDto) {
    return this.ordersService.findAll(query);
  }

  @UseGuards(AdminAuthGuard)
  @Get(':id/files/:fileIndex')
  async findFile(
    @Param('id') id: string,
    @Param('fileIndex', ParseIntPipe) fileIndex: number,
    @Res({ passthrough: true }) response: Response,
  ) {
    const file = await this.ordersService.findFile(id, fileIndex);
    response.set({
      'Content-Type': file.mimeType,
      'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    return new StreamableFile(file.buffer);
  }

  @UseGuards(AdminAuthGuard)
  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.ordersService.findById(id);
  }

  // 管理者向け: ステータスの手動変更 (内容確認中への変更・キャンセルなど)
  @UseGuards(AdminAuthGuard)
  @Patch(':id/status')
  async updateStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.ordersService.updateStatus(id, dto.status);
  }

  // 管理者向け: 支払いリンクを確定してお客様にメール送信 (Bearerアクセストークンが必要)
  @UseGuards(AdminAuthGuard)
  @Post(':id/send-payment-link')
  async sendPaymentLink(@Param('id') id: string, @Body() dto: SendPaymentLinkDto) {
    return this.ordersService.sendPaymentLink(id, dto.paymentLink);
  }
}
