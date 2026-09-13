import AppShell from '@/components/AppShell';
import AddSale from '@/components/AddSale';
import { AddSaleProvider } from '@/components/AddSaleContext';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AddSaleProvider>
      <AppShell>
        {children}
        <AddSale />
      </AppShell>
    </AddSaleProvider>
  );
}
