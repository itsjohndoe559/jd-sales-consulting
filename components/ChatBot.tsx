'use client';

import { useEffect, useRef, useState } from 'react';
import { useChatBot } from '@/hooks/useChatBot';

export default function ChatBot() {
  const [open, setOpen] = useState(false);
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
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Close chat' : 'Ask AI about your sales data'}
        className="fixed z-50 right-4 top-[72px] md:top-4 w-11 h-11 rounded-full bg-ink text-white flex items-center justify-center shadow-lg text-lg"
      >
        {open ? '✕' : '💬'}
      </button>

      {open && (
        <div className="fixed z-50 right-4 top-[128px] md:top-[68px] w-[90vw] max-w-[360px] max-h-[65vh] card flex flex-col overflow-hidden shadow-xl">
          <div className="flex justify-between items-center px-4 py-3 bg-ink text-white shrink-0">
            <span className="text-sm font-medium">Ask AI</span>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="text-white/80 hover:text-white"
            >
              ✕
            </button>
          </div>

          <div
            ref={listRef}
            className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 min-h-[160px]"
          >
            {messages.length === 0 && (
              <div className="text-xs text-slate italic p-1">
                Ask about sales, top products, revenue, margins, or inventory
                — e.g. &ldquo;what are my top sellers?&rdquo;
              </div>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  m.role === 'user'
                    ? 'self-end bg-jdred text-white'
                    : 'self-start bg-paper border border-line'
                }`}
              >
                {m.content}
              </div>
            ))}
            {loading && (
              <div className="self-start bg-paper border border-line rounded-lg px-3 py-2 text-sm text-slate">
                Thinking...
              </div>
            )}
          </div>

          {error && (
            <div className="px-3 py-2 text-xs text-jdred border-t border-line flex justify-between items-center gap-2 shrink-0">
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
              className="flex-1 px-3 py-2 text-sm outline-none min-w-0"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-4 text-sm font-medium text-jdred disabled:opacity-40"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </>
  );
}
