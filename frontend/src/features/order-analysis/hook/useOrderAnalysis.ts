import { FormEvent, useState } from 'react';
import { analyzeOrdersAdmin } from '@/api';
import { useAdminAuth } from '@/features/admin-auth';
import type { AnalysisChatMessage } from '../type';

const INITIAL_MESSAGE: AnalysisChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    '質問に応じて対象の注文を絞り込み、集計して回答します。商品別の注文数、売上、ステータス、期間比較などを質問してください。',
};

function createMessage(role: AnalysisChatMessage['role'], content: string): AnalysisChatMessage {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    role,
    content,
  };
}

export function useOrderAnalysis() {
  const { credentials } = useAdminAuth();
  const [messages, setMessages] = useState<AnalysisChatMessage[]>([INITIAL_MESSAGE]);
  const [question, setQuestion] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [analyzedOrderCount, setAnalyzedOrderCount] = useState<number | null>(null);
  const [matchedOrderCount, setMatchedOrderCount] = useState<number | null>(null);

  const sendQuestion = async (value: string) => {
    const trimmedQuestion = value.trim();
    if (!credentials || !trimmedQuestion || loading) return;

    const history = messages
      .filter((message) => message.id !== INITIAL_MESSAGE.id)
      .slice(-8)
      .map(({ role, content }) => ({ role, content }));
    const userMessage = createMessage('user', trimmedQuestion);

    setMessages((current) => [...current, userMessage]);
    setQuestion('');
    setError('');
    setLoading(true);
    try {
      const result = await analyzeOrdersAdmin(credentials, trimmedQuestion, history);
      setMessages((current) => [...current, createMessage('assistant', result.answer)]);
      setAnalyzedOrderCount(result.analyzedOrderCount);
      setMatchedOrderCount(result.matchedOrderCount);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void sendQuestion(question);
  };

  const clearConversation = () => {
    setMessages([INITIAL_MESSAGE]);
    setQuestion('');
    setError('');
    setAnalyzedOrderCount(null);
    setMatchedOrderCount(null);
  };

  return {
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
  };
}
