import AppShell from '@/components/AppShell';
import AddSale from '@/components/AddSale';
import ChatBot from '@/components/ChatBot';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell>
      {children}
      <AddSale />
      <ChatBot />
    </AppShell>
  );
}
