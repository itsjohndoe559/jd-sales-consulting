import ChatPanel from '@/components/ChatPanel';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export default function ChatPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">JD Sales Bot</h1>
      <p className="text-sm text-slate mb-4">
        Ask questions about your sales, products, and inventory
      </p>
      <ChatPanel />
    </div>
  );
}
