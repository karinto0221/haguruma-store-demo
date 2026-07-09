import { useLocation, Link } from 'react-router-dom';

export default function Confirm() {
  const location = useLocation();
  const orderId = (location.state as any)?.orderId;

  return (
    <div className="page">
      <div className="confirm-box">
        <div className="stamp">済</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 20, marginBottom: 8 }}>
          ご注文ありがとうございました
        </h1>
        <p style={{ color: 'var(--color-muted)', fontSize: 14 }}>
          内容を確認のうえ、お支払いのご案内を追ってメールでお送りいたします。
          {orderId && (
            <>
              <br />
              注文番号: {orderId}
            </>
          )}
        </p>
        <div style={{ marginTop: 24 }}>
          <Link to="/" className="btn-link">
            商品一覧に戻る
          </Link>
        </div>
      </div>
    </div>
  );
}
