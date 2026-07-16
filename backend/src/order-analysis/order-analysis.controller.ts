import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AdminAuthGuard } from '../common/admin-auth.guard';
import { AnalyzeOrdersDto } from './dto/analyze-orders.dto';
import { OrderAnalysisService } from './order-analysis.service';

@Controller('order-analysis')
@UseGuards(AdminAuthGuard)
export class OrderAnalysisController {
  constructor(private readonly orderAnalysisService: OrderAnalysisService) {}

  @Post()
  analyze(@Body() dto: AnalyzeOrdersDto) {
    return this.orderAnalysisService.analyze(dto);
  }
}
