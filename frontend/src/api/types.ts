export interface Product {
  id: string;
  name: string;
  description: string;
  priceFrom: number;
  productCategoryId: number;
  productCategoryName: string;
  imageUrl?: string;
}

export interface ProductCategory { id: number; name: string; imageUrl?: string }
export interface ProductCategoryInput { name: string; image?: File }

export interface CreateProductInput {
  id: string; name: string; description: string; priceFrom: number; productCategoryId: number; image?: File;
}
export interface UpdateProductInput {
  name: string; description: string; priceFrom: number; productCategoryId: number; image?: File;
}

export interface CreateOrderInput {
  productId: string; customerName: string; customerEmail: string; customerPhone?: string;
  quantity: number; notes?: string; files: File[];
}

export type OrderStatus = 'new' | 'reviewing' | 'payment_link_sent' | 'completed' | 'cancelled';
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  new: '新規注文', reviewing: '内容確認中', payment_link_sent: 'メール送信済み', completed: '完了', cancelled: 'キャンセル',
};
export const ORDER_STATUS_OPTIONS: OrderStatus[] = ['new', 'reviewing', 'payment_link_sent', 'completed', 'cancelled'];

export interface OrderRecord {
  id: string; productName: string; customerName: string; customerEmail: string; customerPhone?: string;
  quantity: number; totalPrice: number; notes?: string; fileNames: string[]; status: OrderStatus;
  paymentLink?: string; createdAt: string;
}
export interface OrdersSearchFilter {
  status?: OrderStatus | ''; keyword?: string; dateFrom?: string; dateTo?: string; includeCompleted?: boolean;
}
export interface OrderAnalysisMessage { role: 'user' | 'assistant'; content: string }
export interface OrderAnalysisResult { answer: string; analyzedOrderCount: number; matchedOrderCount: number }

export interface AdminCredentials { id: string; password: string }
export interface AdminAccount {
  id: string; loginId: string; name: string; isActive: boolean; lastLoginAt?: string | null;
  createdAt: string; updatedAt: string;
}
export interface CreateAdminAccountInput { loginId: string; name: string; password: string }
export interface UpdateAdminAccountInput { loginId?: string; name?: string; isActive?: boolean }
