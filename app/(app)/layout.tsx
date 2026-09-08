import Sidebar from '@/components/Sidebar';
import AddSale from '@/components/AddSale';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6 md:p-8">{children}</main>
      <AddSale />
    </div>
  );
}
