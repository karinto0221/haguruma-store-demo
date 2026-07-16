import { Bot, UserRound } from 'lucide-react';
import type { AnalysisChatMessage } from '../type';

interface AnalysisConversationProps {
  messages: AnalysisChatMessage[];
  loading: boolean;
}

export default function AnalysisConversation({ messages, loading }: AnalysisConversationProps) {
  return (
    <div className="order-analysis-conversation" aria-live="polite">
      {messages.map((message) => (
        <div key={message.id} className={`analysis-message analysis-message-${message.role}`}>
          <span className="analysis-message-icon" aria-hidden="true">
            {message.role === 'assistant' ? <Bot /> : <UserRound />}
          </span>
          <div className="analysis-message-body">
            <span className="analysis-message-label">
              {message.role === 'assistant' ? 'AIアシスタント' : 'あなた'}
            </span>
            <p>{message.content}</p>
          </div>
        </div>
      ))}
      {loading && (
        <div className="analysis-message analysis-message-assistant">
          <span className="analysis-message-icon" aria-hidden="true"><Bot /></span>
          <div className="analysis-message-body">
            <span className="analysis-message-label">AIアシスタント</span>
            <p className="analysis-thinking">注文データを分析しています...</p>
          </div>
        </div>
      )}
    </div>
  );
}
