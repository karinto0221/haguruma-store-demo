import { ShieldCheck } from 'lucide-react';

export default function OrderAnalysisPrivacyNotice() {
  return (
    <aside className="order-analysis-privacy" aria-label="個人情報に関する注意">
      <ShieldCheck aria-hidden="true" />
      <div>
        <strong>個人情報を除外して分析します</strong>
        <p>
          AIへ送るのは商品・数量・金額・ステータス・注文日時・添付有無だけです。氏名、メールアドレス、電話番号などは質問に入力しないでください。
        </p>
      </div>
    </aside>
  );
}
