import { useCallback, useState } from 'react';

export function useApiRequest() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  const execute = useCallback(async <T,>(request: () => Promise<T>): Promise<T> => {
    setPending(true);
    setError('');
    try {
      return await request();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : '通信に失敗しました';
      setError(message);
      throw cause;
    } finally {
      setPending(false);
    }
  }, []);

  return { execute, pending, error, clearError: () => setError('') };
}
