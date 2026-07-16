export interface AnalysisChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}
