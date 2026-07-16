const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || '/api'
).replace(/\/$/, '');

export interface Product {
  id: string;
  name: string;
  description: string;
  priceFrom: number;
  productCategoryId: number;
  productCategoryName: string;
  imageUrl?: string;
}

function resolveAssetUrl(url?: string): string | undefined {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_BASE_URL}${url.startsWith('/') ? url : `/${url}`}`;
}

function normalizeProduct(product: Product): Product {
  return { ...product, imageUrl: resolveAssetUrl(product.imageUrl) };
}

export async function fetchProducts(): Promise<Product[]> {
  const res = await fetch(`${API_BASE_URL}/products`);
  if (!res.ok) throw new Error('商品一覧の取得に失敗しました');
  return ((await res.json()) as Product[]).map(normalizeProduct);
}

export async function fetchProduct(id: string): Promise<Product> {
  const res = await fetch(`${API_BASE_URL}/products/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error('商品情報の取得に失敗しました');
  return normalizeProduct(await res.json());
}

export interface CreateOrderInput {
  productId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  quantity: number;
  totalPrice: number;
  notes?: string;
  files: File[];
}

export async function createOrder(input: CreateOrderInput): Promise<{ orderId: string }> {
  const form = new FormData();
  form.append('productId', input.productId);
  form.append('customerName', input.customerName);
  form.append('customerEmail', input.customerEmail);
  if (input.customerPhone) form.append('customerPhone', input.customerPhone);
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

export interface AdminCredentials {
  id: string;
  password: string;
}

function adminHeaders(credentials: AdminCredentials): Record<string, string> {
  return {
    'x-admin-id': credentials.id,
    'x-admin-password': credentials.password,
  };
}

async function parseErrorMessage(res: Response, fallback: string): Promise<string> {
  const body = await res.json().catch(() => ({}));
  if (Array.isArray(body.message)) return body.message.join(' / ');
  return body.message || fallback;
}

export async function loginAdmin(credentials: AdminCredentials): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/admin/login`, {
    method: 'POST',
    headers: adminHeaders(credentials),
  });
  if (!res.ok) {
    throw new Error('ユーザーIDまたはパスワードが正しくありません');
  }
}

export type OrderStatus = 'new' | 'reviewing' | 'payment_link_sent' | 'completed' | 'cancelled';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  new: '新規注文',
  reviewing: '内容確認中',
  payment_link_sent: 'メール送信済み',
  completed: '完了',
  cancelled: 'キャンセル',
};

export const ORDER_STATUS_OPTIONS: OrderStatus[] = [
  'new',
  'reviewing',
  'payment_link_sent',
  'completed',
  'cancelled',
];

export interface OrderRecord {
  id: string;
  productName: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  quantity: number;
  totalPrice: number;
  notes?: string;
  fileNames: string[];
  status: OrderStatus;
  paymentLink?: string;
  createdAt: string;
}

export interface OrderAnalysisMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface OrderAnalysisResult {
  answer: string;
  analyzedOrderCount: number;
  matchedOrderCount: number;
}

export async function analyzeOrdersAdmin(
  credentials: AdminCredentials,
  question: string,
  history: OrderAnalysisMessage[],
): Promise<OrderAnalysisResult> {
  const res = await fetch(`${API_BASE_URL}/order-analysis`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...adminHeaders(credentials) },
    body: JSON.stringify({ question, history }),
  });
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, '注文分析に失敗しました'));
  }
  return res.json();
}

export interface OrdersSearchFilter {
  status?: OrderStatus | '';
  keyword?: string;
  dateFrom?: string;
  dateTo?: string;
  includeCompleted?: boolean;
}

export async function fetchOrdersAdmin(
  credentials: AdminCredentials,
  filter: OrdersSearchFilter = {},
): Promise<OrderRecord[]> {
  const params = new URLSearchParams();
  if (filter.status) params.set('status', filter.status);
  if (filter.keyword) params.set('keyword', filter.keyword);
  if (filter.dateFrom) params.set('dateFrom', filter.dateFrom);
  if (filter.dateTo) params.set('dateTo', filter.dateTo);
  if (filter.includeCompleted) params.set('includeCompleted', 'true');

  const query = params.toString();
  const res = await fetch(`${API_BASE_URL}/orders${query ? `?${query}` : ''}`, {
    headers: adminHeaders(credentials),
  });
  if (!res.ok) throw new Error('注文一覧の取得に失敗しました(ユーザーID・パスワードを確認してください)');
  return res.json();
}

export async function fetchOrderAdmin(
  credentials: AdminCredentials,
  orderId: string,
): Promise<OrderRecord> {
  const res = await fetch(`${API_BASE_URL}/orders/${encodeURIComponent(orderId)}`, {
    headers: adminHeaders(credentials),
  });
  if (!res.ok) throw new Error(await parseErrorMessage(res, '注文詳細の取得に失敗しました'));
  return res.json();
}

export async function fetchOrderAttachmentAdmin(
  credentials: AdminCredentials,
  orderId: string,
  fileIndex: number,
): Promise<Blob> {
  const res = await fetch(
    `${API_BASE_URL}/orders/${encodeURIComponent(orderId)}/files/${fileIndex}`,
    { headers: adminHeaders(credentials) },
  );
  if (!res.ok) throw new Error(await parseErrorMessage(res, '添付ファイルの取得に失敗しました'));
  return res.blob();
}

export async function updateOrderStatusAdmin(
  credentials: AdminCredentials,
  orderId: string,
  status: OrderStatus,
): Promise<OrderRecord> {
  const res = await fetch(`${API_BASE_URL}/orders/${orderId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...adminHeaders(credentials) },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, 'ステータスの更新に失敗しました'));
  }
  return res.json();
}

export async function sendPaymentLinkAdmin(
  credentials: AdminCredentials,
  orderId: string,
  paymentLink: string,
): Promise<OrderRecord> {
  const res = await fetch(`${API_BASE_URL}/orders/${orderId}/send-payment-link`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...adminHeaders(credentials) },
    body: JSON.stringify({ paymentLink }),
  });
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, '送信に失敗しました'));
  }
  return res.json();
}

// --- マスタ管理: 商品カテゴリ ---

export interface ProductCategory {
  id: number;
  name: string;
  imageUrl?: string;
}

export interface ProductCategoryInput {
  name: string;
  image?: File;
}

function normalizeCategory(category: ProductCategory): ProductCategory {
  return { ...category, imageUrl: resolveAssetUrl(category.imageUrl) };
}

export async function fetchProductCategories(): Promise<ProductCategory[]> {
  const res = await fetch(`${API_BASE_URL}/product-categories`);
  if (!res.ok) throw new Error('商品カテゴリ一覧の取得に失敗しました');
  return ((await res.json()) as ProductCategory[]).map(normalizeCategory);
}

export async function fetchProductCategoriesAdmin(
  credentials: AdminCredentials,
): Promise<ProductCategory[]> {
  const res = await fetch(`${API_BASE_URL}/product-categories`, {
    headers: adminHeaders(credentials),
  });
  if (!res.ok) throw new Error(await parseErrorMessage(res, '商品カテゴリ一覧の取得に失敗しました'));
  return ((await res.json()) as ProductCategory[]).map(normalizeCategory);
}

async function uploadCategoryImage(
  credentials: AdminCredentials,
  id: number,
  image: File,
): Promise<ProductCategory> {
  const form = new FormData();
  form.append('image', image);
  const res = await fetch(`${API_BASE_URL}/product-categories/${id}/image`, {
    method: 'PUT',
    headers: adminHeaders(credentials),
    body: form,
  });
  if (!res.ok) throw new Error(await parseErrorMessage(res, 'カテゴリ画像の保存に失敗しました'));
  return normalizeCategory(await res.json());
}

export async function createProductCategoryAdmin(
  credentials: AdminCredentials,
  input: ProductCategoryInput,
): Promise<ProductCategory> {
  const res = await fetch(`${API_BASE_URL}/product-categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...adminHeaders(credentials) },
    body: JSON.stringify({ name: input.name }),
  });
  if (!res.ok) throw new Error(await parseErrorMessage(res, '商品カテゴリの作成に失敗しました'));
  const category = normalizeCategory(await res.json());
  return input.image ? uploadCategoryImage(credentials, category.id, input.image) : category;
}

export async function updateProductCategoryAdmin(
  credentials: AdminCredentials,
  id: number,
  input: ProductCategoryInput,
): Promise<ProductCategory> {
  const res = await fetch(`${API_BASE_URL}/product-categories/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...adminHeaders(credentials) },
    body: JSON.stringify({ name: input.name }),
  });
  if (!res.ok) throw new Error(await parseErrorMessage(res, '商品カテゴリの更新に失敗しました'));
  const category = normalizeCategory(await res.json());
  return input.image ? uploadCategoryImage(credentials, id, input.image) : category;
}

export async function deleteProductCategoryAdmin(
  credentials: AdminCredentials,
  id: number,
): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/product-categories/${id}`, {
    method: 'DELETE',
    headers: adminHeaders(credentials),
  });
  if (!res.ok) throw new Error(await parseErrorMessage(res, '商品カテゴリの削除に失敗しました'));
}

// --- マスタ管理: 商品 ---

export interface CreateProductInput {
  id: string;
  name: string;
  description: string;
  priceFrom: number;
  productCategoryId: number;
  image?: File;
}

export interface UpdateProductInput {
  name: string;
  description: string;
  priceFrom: number;
  productCategoryId: number;
  image?: File;
}

export async function fetchProductsAdmin(credentials: AdminCredentials): Promise<Product[]> {
  // 商品一覧は公開APIと共通(カテゴリ名は非公開情報ではないため)。認証ヘッダーは無視される
  const res = await fetch(`${API_BASE_URL}/products`, {
    headers: adminHeaders(credentials),
  });
  if (!res.ok) throw new Error(await parseErrorMessage(res, '商品一覧の取得に失敗しました'));
  return ((await res.json()) as Product[]).map(normalizeProduct);
}

async function uploadProductImage(
  credentials: AdminCredentials,
  id: string,
  image: File,
): Promise<Product> {
  const form = new FormData();
  form.append('image', image);
  const res = await fetch(`${API_BASE_URL}/products/${encodeURIComponent(id)}/image`, {
    method: 'PUT',
    headers: adminHeaders(credentials),
    body: form,
  });
  if (!res.ok) throw new Error(await parseErrorMessage(res, '商品画像の保存に失敗しました'));
  return normalizeProduct(await res.json());
}

export async function createProductAdmin(
  credentials: AdminCredentials,
  input: CreateProductInput,
): Promise<Product> {
  const res = await fetch(`${API_BASE_URL}/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...adminHeaders(credentials) },
    body: JSON.stringify({
      id: input.id,
      name: input.name,
      description: input.description,
      priceFrom: input.priceFrom,
      productCategoryId: input.productCategoryId,
    }),
  });
  if (!res.ok) throw new Error(await parseErrorMessage(res, '商品の作成に失敗しました'));
  const product = normalizeProduct(await res.json());
  return input.image ? uploadProductImage(credentials, product.id, input.image) : product;
}

export async function updateProductAdmin(
  credentials: AdminCredentials,
  id: string,
  input: UpdateProductInput,
): Promise<Product> {
  const res = await fetch(`${API_BASE_URL}/products/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...adminHeaders(credentials) },
    body: JSON.stringify({
      name: input.name,
      description: input.description,
      priceFrom: input.priceFrom,
      productCategoryId: input.productCategoryId,
    }),
  });
  if (!res.ok) throw new Error(await parseErrorMessage(res, '商品の更新に失敗しました'));
  const product = normalizeProduct(await res.json());
  return input.image ? uploadProductImage(credentials, id, input.image) : product;
}

export async function deleteProductAdmin(credentials: AdminCredentials, id: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/products/${id}`, {
    method: 'DELETE',
    headers: adminHeaders(credentials),
  });
  if (!res.ok) throw new Error(await parseErrorMessage(res, '商品の削除に失敗しました'));
}
