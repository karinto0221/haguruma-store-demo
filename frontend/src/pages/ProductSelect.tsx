import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchProducts, Product } from '../api';

export default function ProductSelect() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchProducts()
      .then(setProducts)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page">
      <div className="header">
        <span className="kicker">ORDER</span>
        <h1>ご注文商品の選択</h1>
      </div>
      <p className="subtitle">
        お作りしたい紙製品を選んでください。デザインのご入稿はこの後の画面で行えます。
      </p>

      {error && <div className="error-box">{error}</div>}
      {loading && <p>読み込み中...</p>}

      <div className="product-list">
        {products.map((p) => (
          <button
            key={p.id}
            className="product-card"
            onClick={() => navigate(`/order/${p.id}`)}
          >
            <div>
              <div className="name">{p.name}</div>
              <div className="desc">{p.description}</div>
            </div>
            <div className="price">¥{p.priceFrom.toLocaleString()}〜</div>
          </button>
        ))}
      </div>
    </div>
  );
}
