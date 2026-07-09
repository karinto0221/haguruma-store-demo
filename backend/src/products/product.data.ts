// 商品カテゴリの仮データ。実際の商品ラインナップに合わせて自由に編集してください。
export interface Product {
  id: string;
  name: string;
  description: string;
  // 目安価格。実際は数量・仕様によって変動するため「参考価格」として表示。
  priceFrom: number;
}

export const PRODUCTS: Product[] = [
  {
    id: 'business-card',
    name: '名刺',
    description: 'デザイン入稿によるオリジナル名刺印刷',
    priceFrom: 3000,
  },
  {
    id: 'envelope',
    name: '封筒',
    description: 'ロゴ・デザイン入り封筒印刷',
    priceFrom: 5000,
  },
  {
    id: 'postcard',
    name: 'ポストカード',
    description: 'オリジナルデザインのポストカード印刷',
    priceFrom: 2500,
  },
  {
    id: 'wrapping-paper',
    name: 'ラッピングペーパー',
    description: 'オーダーメイドの包装紙',
    priceFrom: 8000,
  },
  {
    id: 'package-box',
    name: 'パッケージボックス',
    description: '商品パッケージ用の化粧箱',
    priceFrom: 15000,
  },
];
