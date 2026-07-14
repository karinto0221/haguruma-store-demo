import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrdersRepository } from '../data/orders.repository';
import { OrderEntity } from './order.entity';
import { StorageModule } from '../storage/storage.module';
import { MailModule } from '../mail/mail.module';
import { ProductsModule } from '../products/products.module';
import { ImageProcessingModule } from '../image/image-processing.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([OrderEntity]),
    StorageModule,
    MailModule,
    ProductsModule,
    ImageProcessingModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersRepository],
})
export class OrdersModule {}
