const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export interface Product {
  id: string;
  name: string;
  description: string;
  priceFrom: number;
}

export async function fetchProducts(): Promise<Product[]> {
  const res = await fetch(`${API_BASE_URL}/products`);
  if (!res.ok) throw new Error('商品一覧の取得に失敗しました');
  return res.json();
}

export interface CreateOrderInput {
  productId: string;
  customerName: string;
  customerEmail: string;
  quantity: number;
  notes?: string;
  files: File[];
}

export async function createOrder(input: CreateOrderInput): Promise<{ orderId: string }> {
  const form = new FormData();
  form.append('productId', input.productId);
  form.append('customerName', input.customerName);
  form.append('customerEmail', input.customerEmail);
  form.append('quantity', String(input.quantity));
  if (input.notes) form.append('notes', input.notes);
  input.files.forEach((file) => form.append('files', file));

  const res = await fetch(`${API_BASE_URL}/orders`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || '注文の送信に失敗しました');
  }
  return res.json();
}

// --- 管理者向け ---

export interface OrderRecord {
  id: string;
  productName: string;
  customerName: string;
  customerEmail: string;
  quantity: number;
  notes?: string;
  fileNames: string[];
  status: 'new' | 'payment_link_sent';
  paymentLink?: string;
  createdAt: string;
}

export async function fetchOrdersAdmin(adminKey: string): Promise<OrderRecord[]> {
  const res = await fetch(`${API_BASE_URL}/orders`, {
    headers: { 'x-admin-key': adminKey },
  });
  if (!res.ok) throw new Error('注文一覧の取得に失敗しました(管理者キーを確認してください)');
  return res.json();
}

export async function sendPaymentLinkAdmin(
  adminKey: string,
  orderId: string,
  paymentLink: string,
): Promise<OrderRecord> {
  const res = await fetch(`${API_BASE_URL}/orders/${orderId}/send-payment-link`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
    body: JSON.stringify({ paymentLink }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || '送信に失敗しました');
  }
  return res.json();
}
