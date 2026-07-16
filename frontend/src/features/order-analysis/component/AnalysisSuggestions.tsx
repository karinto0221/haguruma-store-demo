const SUGGESTIONS = [
  '今月の注文状況をまとめて',
  '商品別の注文数と売上を教えて',
  'ステータス別の件数を教えて',
  '先月と今月の注文を比較して',
];

interface AnalysisSuggestionsProps {
  disabled: boolean;
  onSelect: (question: string) => void;
}

export default function AnalysisSuggestions({ disabled, onSelect }: AnalysisSuggestionsProps) {
  return (
    <div className="order-analysis-suggestions" aria-label="質問例">
      {SUGGESTIONS.map((suggestion) => (
        <button
          key={suggestion}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(suggestion)}
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
}
