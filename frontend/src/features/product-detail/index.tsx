import { useNavigate, useParams } from 'react-router-dom';
import ProductDetailHeader from './component/ProductDetailHeader';
import ProductOrderControls from './component/ProductOrderControls';
import ProductSummary from './component/ProductSummary';
import { useProductDetail } from './hook/useProductDetail';

export default function ProductDetail() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { product, quantity, setQuantity, error } = useProductDetail(productId);

  if (error) return <div className="page"><div className="error-box">{error}</div></div>;
  if (!product) return <div className="page">読み込み中...</div>;

  return (
    <div className="page product-detail-page">
      <ProductDetailHeader
        categoryName={product.productCategoryName}
        onBack={() => navigate(`/categories/${product.productCategoryId}/products`)}
      />
      <ProductSummary product={product} />
      <ProductOrderControls
        quantity={quantity}
        onQuantityChange={setQuantity}
        onOrder={() => navigate(`/order/${product.id}?quantity=${Number(quantity)}`)}
      />
    </div>
  );
}
