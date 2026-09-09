'use client';

import { useState } from 'react';

export type ChatMessage = { role: 'user' | 'assistant'; content: string };

export function useChatBot() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendMessage(question: string) {
    const trimmed = question.trim();
    if (!trimmed || loading) return;

    setError(null);
    setMessages((prev) => [...prev, { role: 'user', content: trimmed }]);
    setLoading(true);

    try {
      const res = await fetch('/api/chat/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: trimmed }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error ?? 'Something went wrong.');
      } else {
        setMessages((prev) => [...prev, { role: 'assistant', content: data.answer }]);
      }
    } catch {
      setError('Network error — try again.');
    } finally {
      setLoading(false);
    }
  }

  function clearError() {
    setError(null);
  }

  function resetChat() {
    setMessages([]);
    setError(null);
  }

  return { messages, loading, error, sendMessage, clearError, resetChat };
}
