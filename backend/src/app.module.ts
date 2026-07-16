import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminModule } from './admin/admin.module';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';
import { MailModule } from './mail/mail.module';
import { StorageModule } from './storage/storage.module';
import { dataSourceOptions } from './database/data-source';
import { OrderAnalysisModule } from './order-analysis/order-analysis.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot(dataSourceOptions),
    AdminModule,
    ProductsModule,
    OrdersModule,
    MailModule,
    StorageModule,
    OrderAnalysisModule,
  ],
})
export class AppModule {}
