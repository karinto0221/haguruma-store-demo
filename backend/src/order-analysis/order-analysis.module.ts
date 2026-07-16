import { Module } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module';
import { OrderAnalysisController } from './order-analysis.controller';
import { OrderAnalysisService } from './order-analysis.service';
import { OpenAiResponsesClient } from './openai-responses.client';

@Module({
  imports: [OrdersModule],
  controllers: [OrderAnalysisController],
  providers: [OrderAnalysisService, OpenAiResponsesClient],
})
export class OrderAnalysisModule {}
