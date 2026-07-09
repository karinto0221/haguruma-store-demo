import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrdersRepository } from '../data/orders.repository';
import { StorageModule } from '../storage/storage.module';
import { MailModule } from '../mail/mail.module';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [StorageModule, MailModule, ProductsModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersRepository],
})
export class OrdersModule {}
