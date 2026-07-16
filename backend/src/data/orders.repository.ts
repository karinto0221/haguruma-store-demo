import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderEntity } from '../orders/order.entity';
import { OrderStatus } from '../orders/order-status';

export { OrderStatus };

export interface OrderRecord {
  id: string;
  productId: string;
  productName: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  quantity: number;
  totalPrice: number;
  notes?: string;
  fileNames: string[];
  filePaths: string[];
  status: OrderStatus;
  paymentLink?: string;
  createdAt: string;
}

export interface OrdersFilter {
  status?: OrderStatus;
  includeCompleted?: boolean;
  // 顧客名・メール・電話番号・商品名・注文IDのいずれかに部分一致すれば該当とみなす
  keyword?: string;
  // createdAt (ISO文字列) の範囲。両端を含む
  dateFrom?: string;
  dateTo?: string;
}

export interface AnalysisOrdersFilter {
  dateFrom?: string;
  dateTo?: string;
  statuses?: OrderStatus[];
  productNames?: string[];
  hasAttachment?: boolean;
}

export interface AnalysisOrderRecord {
  productName: string;
  quantity: number;
  totalPrice: number;
  status: OrderStatus;
  orderedAt: string;
  hasAttachment: boolean;
}

export interface AnalysisOrdersSearchResult {
  orders: AnalysisOrderRecord[];
  matchedOrderCount: number;
}

export interface OrderPersonalValues {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
}

/**
 * 注文データの保存先を抽象化する簡易リポジトリ。
 * PostgreSQL(TypeORM)に保存している。呼び出し側(OrdersService)はこのクラスの
 * メソッドのシグネチャにのみ依存しているため、保存先を差し替える際もここだけの変更で済む。
 */
@Injectable()
export class OrdersRepository {
  constructor(
    @InjectRepository(OrderEntity)
    private readonly ordersRepository: Repository<OrderEntity>,
  ) {}

  async create(order: OrderRecord): Promise<OrderRecord> {
    const entity = this.ordersRepository.create({
      id: order.id,
      productId: order.productId,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone ?? null,
      quantity: order.quantity,
      totalPrice: order.totalPrice,
      notes: order.notes ?? null,
      fileNames: order.fileNames,
      filePaths: order.filePaths,
      status: order.status,
      paymentLink: order.paymentLink ?? null,
    });
    await this.ordersRepository.save(entity);

    const saved = await this.ordersRepository.findOne({
      where: { id: entity.id },
      relations: ['product'],
    });
    return this.toRecord(saved!);
  }

  async findAll(filter: OrdersFilter = {}): Promise<OrderRecord[]> {
    const qb = this.ordersRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.product', 'product')
      .orderBy('order.createdAt', 'DESC');

    if (filter.status) {
      qb.andWhere('order.status = :status', { status: filter.status });
    } else if (!filter.includeCompleted) {
      qb.andWhere('order.status != :completedStatus', { completedStatus: 'completed' });
    }
    if (filter.keyword) {
      qb.andWhere(
        '(order.customerName ILIKE :keyword OR order.customerEmail ILIKE :keyword OR order.customerPhone ILIKE :keyword OR product.name ILIKE :keyword OR CAST(order.id AS text) ILIKE :keyword)',
        { keyword: `%${filter.keyword}%` },
      );
    }
    if (filter.dateFrom) {
      qb.andWhere('order.createdAt >= :dateFrom', { dateFrom: filter.dateFrom });
    }
    if (filter.dateTo) {
      qb.andWhere('order.createdAt <= :dateTo', { dateTo: filter.dateTo });
    }

    const entities = await qb.getMany();
    return entities.map((e) => this.toRecord(e));
  }

  async findForAnalysis(
    filter: AnalysisOrdersFilter,
    maxRows: number,
  ): Promise<AnalysisOrdersSearchResult> {
    const qb = this.ordersRepository
      .createQueryBuilder('order')
      .leftJoin('order.product', 'product');

    if (filter.dateFrom) {
      qb.andWhere('order.createdAt >= :dateFrom', { dateFrom: filter.dateFrom });
    }
    if (filter.dateTo) {
      qb.andWhere('order.createdAt <= :dateTo', { dateTo: filter.dateTo });
    }
    if (filter.statuses?.length) {
      qb.andWhere('order.status IN (:...statuses)', { statuses: filter.statuses });
    }
    if (filter.productNames?.length) {
      const productConditions = filter.productNames.map(
        (_, index) => `product.name ILIKE :productName${index}`,
      );
      qb.andWhere(`(${productConditions.join(' OR ')})`);
      filter.productNames.forEach((name, index) => {
        qb.setParameter(`productName${index}`, `%${name}%`);
      });
    }
    if (filter.hasAttachment !== undefined) {
      qb.andWhere(
        filter.hasAttachment
          ? 'cardinality("order"."file_names") > 0'
          : 'cardinality("order"."file_names") = 0',
      );
    }

    const matchedOrderCount = await qb.getCount();
    if (matchedOrderCount > maxRows) {
      return { orders: [], matchedOrderCount };
    }

    const rows = await qb
      .select('product.name', 'productName')
      .addSelect('order.quantity', 'quantity')
      .addSelect('order.totalPrice', 'totalPrice')
      .addSelect('order.status', 'status')
      .addSelect('order.createdAt', 'orderedAt')
      .addSelect('cardinality("order"."file_names") > 0', 'hasAttachment')
      .orderBy('order.createdAt', 'ASC')
      .getRawMany<{
        productName: string;
        quantity: number;
        totalPrice: number;
        status: OrderStatus;
        orderedAt: Date | string;
        hasAttachment: boolean;
      }>();

    return {
      matchedOrderCount,
      orders: rows.map((row) => ({
        productName: row.productName,
        quantity: Number(row.quantity),
        totalPrice: Number(row.totalPrice),
        status: row.status,
        orderedAt:
          row.orderedAt instanceof Date
            ? row.orderedAt.toISOString()
            : new Date(row.orderedAt).toISOString(),
        hasAttachment: row.hasAttachment,
      })),
    };
  }

  async findCustomerPersonalValues(): Promise<OrderPersonalValues[]> {
    const rows = await this.ordersRepository
      .createQueryBuilder('order')
      .select('order.customerName', 'customerName')
      .addSelect('order.customerEmail', 'customerEmail')
      .addSelect('order.customerPhone', 'customerPhone')
      .distinct(true)
      .getRawMany<{
        customerName: string;
        customerEmail: string;
        customerPhone: string | null;
      }>();

    return rows.map((row) => ({
      customerName: row.customerName,
      customerEmail: row.customerEmail,
      customerPhone: row.customerPhone ?? undefined,
    }));
  }

  async findById(id: string): Promise<OrderRecord | undefined> {
    const entity = await this.ordersRepository.findOne({
      where: { id },
      relations: ['product'],
    });
    return entity ? this.toRecord(entity) : undefined;
  }

  async update(id: string, patch: Partial<OrderRecord>): Promise<OrderRecord | undefined> {
    const entity = await this.ordersRepository.findOne({
      where: { id },
      relations: ['product'],
    });
    if (!entity) return undefined;

    if (patch.status !== undefined) entity.status = patch.status;
    if (patch.paymentLink !== undefined) entity.paymentLink = patch.paymentLink;

    await this.ordersRepository.save(entity);
    return this.toRecord(entity);
  }

  private toRecord(entity: OrderEntity): OrderRecord {
    return {
      id: entity.id,
      productId: entity.productId,
      productName: entity.product?.name ?? '',
      customerName: entity.customerName,
      customerEmail: entity.customerEmail,
      customerPhone: entity.customerPhone ?? undefined,
      quantity: entity.quantity,
      totalPrice: entity.totalPrice,
      notes: entity.notes ?? undefined,
      fileNames: entity.fileNames,
      filePaths: entity.filePaths,
      status: entity.status,
      paymentLink: entity.paymentLink ?? undefined,
      createdAt: entity.createdAt.toISOString(),
    };
  }
}
