import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createOrder, fetchProducts, Product } from '../api';

export default function OrderForm() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [product, setProduct] = useState<Product | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProducts().then((list) => {
      const found = list.find((p) => p.id === productId) || null;
      setProduct(found);
    });
  }, [productId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId) return;
    setSubmitting(true);
    setError('');
    try {
      const { orderId } = await createOrder({
        productId,
        customerName,
        customerEmail,
        quantity,
        notes,
        files,
      });
      navigate('/confirm', { state: { orderId } });
    } catch (e: any) {
      setError(e.message || '送信に失敗しました。時間をおいて再度お試しください。');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page">
      <div className="header">
        <span className="stamp">2</span>
        <h1>ご注文内容の入力</h1>
      </div>
      <p className="subtitle">
        {product ? `選択中の商品: ${product.name}` : '商品情報を読み込み中...'}
      </p>

      {error && <div className="error-box">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="customerName">お名前</label>
          <input
            id="customerName"
            type="text"
            required
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="customerEmail">メールアドレス</label>
          <input
            id="customerEmail"
            type="email"
            required
            value={customerEmail}
            onChange={(e) => setCustomerEmail(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="quantity">数量</label>
          <input
            id="quantity"
            type="number"
            min={1}
            required
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
          />
        </div>

        <div className="field">
          <label htmlFor="notes">ご要望・備考(サイズ、色、納期など)</label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="field">
          <label>デザインデータ・イメージ画像</label>
          <div
            className={`upload-box${files.length ? ' has-files' : ''}`}
            onClick={() => fileInputRef.current?.click()}
          >
            {files.length
              ? `${files.length}件のファイルを選択中(クリックして変更)`
              : 'クリックしてファイルを選択(画像・PDFなど、5点まで)'}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,application/pdf"
            style={{ display: 'none' }}
            onChange={(e) => setFiles(Array.from(e.target.files || []).slice(0, 5))}
          />
          {files.length > 0 && (
            <div className="file-chip-list">
              {files.map((f) => (
                <span className="file-chip" key={f.name}>
                  {f.name}
                </span>
              ))}
            </div>
          )}
        </div>

        <button className="btn btn-primary" type="submit" disabled={submitting}>
          {submitting ? '送信中...' : 'この内容で注文する'}
        </button>
      </form>
    </div>
  );
}
