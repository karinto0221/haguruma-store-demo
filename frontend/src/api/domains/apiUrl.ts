import { resolveApiUrl } from '../apiClient';
import type { Product, ProductCategory } from '../types';

export function normalizeProduct(product: Product): Product {
  return { ...product, imageUrl: product.imageUrl ? resolveApiUrl(product.imageUrl) : undefined };
}

export function normalizeCategory(category: ProductCategory): ProductCategory {
  return { ...category, imageUrl: category.imageUrl ? resolveApiUrl(category.imageUrl) : undefined };
}
