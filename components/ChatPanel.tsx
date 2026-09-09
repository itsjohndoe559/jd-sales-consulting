'use client';

import { useEffect, useRef, useState } from 'react';
import { useChatBot } from '@/hooks/useChatBot';

export default function ChatPanel() {
  const [input, setInput] = useState('');
  const { messages, loading, error, sendMessage, clearError } = useChatBot();
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!input.trim() || loading) return;
    sendMessage(input);
    setInput('');
  }

  return (
    <div className="card flex flex-col h-[70vh] min-h-[420px] overflow-hidden">
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto p-4 flex flex-col gap-3"
      >
        {messages.length === 0 && (
          <div className="text-sm text-slate italic p-2">
            Ask about sales, top products, revenue, margins, or inventory —
            e.g. &ldquo;what are my top sellers?&rdquo; or &ldquo;what&apos;s
            my average margin?&rdquo;
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[85%] rounded-lg px-4 py-2.5 text-sm ${
              m.role === 'user'
                ? 'self-end bg-jdred text-white'
                : 'self-start bg-paper border border-line'
            }`}
          >
            {m.content}
          </div>
        ))}
        {loading && (
          <div className="self-start bg-paper border border-line rounded-lg px-4 py-2.5 text-sm text-slate">
            Thinking...
          </div>
        )}
      </div>

      {error && (
        <div className="px-4 py-2 text-xs text-jdred border-t border-line flex justify-between items-center gap-2 shrink-0">
          <span>{error}</span>
          <button onClick={clearError} className="underline shrink-0">
            Dismiss
          </button>
        </div>
      )}

      <form onSubmit={submit} className="flex border-t border-line shrink-0">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question..."
          className="flex-1 px-4 py-3 text-sm outline-none min-w-0"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="px-5 text-sm font-medium text-jdred disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </div>
  );
}
