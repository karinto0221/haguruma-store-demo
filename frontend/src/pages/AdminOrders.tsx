import { useState } from 'react';
import { fetchOrdersAdmin, sendPaymentLinkAdmin, OrderRecord } from '../api';

export default function AdminOrders() {
  const [adminKey, setAdminKey] = useState('');
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [linkInputs, setLinkInputs] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchOrdersAdmin(adminKey);
      setOrders(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (orderId: string) => {
    const link = linkInputs[orderId];
    if (!link) return;
    try {
      await sendPaymentLinkAdmin(adminKey, orderId, link);
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <div className="page">
      <div className="header">
        <span className="kicker">ADMIN</span>
        <h1>注文管理</h1>
      </div>
      <p className="subtitle">注文一覧の確認と、支払いリンクの送信ができます。</p>

      <div className="field">
        <label htmlFor="adminKey">管理者キー</label>
        <input
          id="adminKey"
          type="text"
          value={adminKey}
          onChange={(e) => setAdminKey(e.target.value)}
        />
      </div>
      <button className="btn btn-primary" onClick={load} disabled={loading || !adminKey}>
        {loading ? '読み込み中...' : '注文一覧を取得'}
      </button>

      {error && <div className="error-box" style={{ marginTop: 20 }}>{error}</div>}

      <div style={{ marginTop: 28 }}>
        {orders.map((o) => (
          <div className="order-row" key={o.id}>
            <div className="top-line">
              <span className="name">
                {o.productName} / {o.customerName}様
              </span>
              <span className={`badge${o.status === 'payment_link_sent' ? ' sent' : ''}`}>
                {o.status === 'payment_link_sent' ? '送信済み' : '未対応'}
              </span>
            </div>
            <div className="meta">
              {o.customerEmail} ・ 数量 {o.quantity} ・{' '}
              {new Date(o.createdAt).toLocaleString('ja-JP')}
              {o.notes && (
                <>
                  <br />
                  備考: {o.notes}
                </>
              )}
              {o.fileNames.length > 0 && (
                <>
                  <br />
                  添付: {o.fileNames.join(', ')}
                </>
              )}
            </div>
            {o.status === 'payment_link_sent' ? (
              <div style={{ fontSize: 13, color: 'var(--color-muted)' }}>
                送信済みリンク: {o.paymentLink}
              </div>
            ) : (
              <div className="link-form">
                <input
                  type="url"
                  placeholder="支払いリンクを入力(https://...)"
                  value={linkInputs[o.id] || ''}
                  onChange={(e) =>
                    setLinkInputs((prev) => ({ ...prev, [o.id]: e.target.value }))
                  }
                />
                <button onClick={() => handleSend(o.id)}>送信</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
