import AppShell from '@/components/AppShell';
import AddSale from '@/components/AddSale';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell>
      {children}
      <AddSale />
    </AppShell>
  );
}
