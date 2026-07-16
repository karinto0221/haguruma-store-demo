import { FormEvent, KeyboardEvent } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AnalysisComposerProps {
  question: string;
  loading: boolean;
  onQuestionChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
}

export default function AnalysisComposer({
  question,
  loading,
  onQuestionChange,
  onSubmit,
}: AnalysisComposerProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  };

  return (
    <form className="order-analysis-composer" onSubmit={onSubmit}>
      <textarea
        value={question}
        maxLength={1000}
        rows={3}
        placeholder="例：今月よく注文されている商品を教えて"
        aria-label="注文分析への質問"
        disabled={loading}
        onChange={(event) => onQuestionChange(event.target.value)}
        onKeyDown={handleKeyDown}
      />
      <div className="order-analysis-composer-actions">
        <span>Enterで送信 / Shift + Enterで改行</span>
        <Button type="submit" disabled={loading || !question.trim()}>
          <Send />
          {loading ? '分析中...' : '質問する'}
        </Button>
      </div>
    </form>
  );
}
