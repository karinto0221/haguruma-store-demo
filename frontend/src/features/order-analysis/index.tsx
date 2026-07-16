import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AnalysisComposer from './component/AnalysisComposer';
import AnalysisConversation from './component/AnalysisConversation';
import AnalysisSuggestions from './component/AnalysisSuggestions';
import OrderAnalysisHeader from './component/OrderAnalysisHeader';
import OrderAnalysisPrivacyNotice from './component/OrderAnalysisPrivacyNotice';
import { useOrderAnalysis } from './hook/useOrderAnalysis';

export default function OrderAnalysis() {
  const {
    messages,
    question,
    setQuestion,
    error,
    loading,
    analyzedOrderCount,
    matchedOrderCount,
    handleSubmit,
    sendQuestion,
    clearConversation,
  } = useOrderAnalysis();

  return (
    <div className="page page-wide order-analysis-page">
      <OrderAnalysisHeader />
      <OrderAnalysisPrivacyNotice />

      <section className="order-analysis-panel" aria-label="AIとの注文分析チャット">
        <div className="order-analysis-toolbar">
          <div>
            <strong>注文分析チャット</strong>
            <span>
              {analyzedOrderCount === null
                ? '質問に応じて対象注文を絞り込みます'
                : matchedOrderCount !== null && matchedOrderCount > analyzedOrderCount
                  ? `${matchedOrderCount}件が該当（上限超過のため未分析）`
                  : `${analyzedOrderCount}件の注文を分析しました`}
            </span>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={clearConversation} disabled={loading}>
            <RotateCcw />
            会話をクリア
          </Button>
        </div>

        <AnalysisSuggestions disabled={loading} onSelect={(value) => void sendQuestion(value)} />
        <AnalysisConversation messages={messages} loading={loading} />
        {error && <div className="error-box order-analysis-error">{error}</div>}
        <AnalysisComposer
          question={question}
          loading={loading}
          onQuestionChange={setQuestion}
          onSubmit={handleSubmit}
        />
      </section>
    </div>
  );
}
