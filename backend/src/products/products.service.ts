import { Injectable } from '@nestjs/common';
import { PRODUCTS, Product } from './product.data';

@Injectable()
export class ProductsService {
  findAll(): Product[] {
    return PRODUCTS;
  }

  findById(id: string): Product | undefined {
    return PRODUCTS.find((p) => p.id === id);
  }
}
