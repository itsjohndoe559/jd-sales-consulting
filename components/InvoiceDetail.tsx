'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Receipt from './Receipt';
import type { Invoice } from '@/lib/types';

export default function InvoiceDetail({ invoice }: { invoice: Invoice }) {
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  async function togglePaid() {
    setBusy(true);
    await fetch('/api/invoices', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: invoice.id, paid: !invoice.paid_at }),
    });
    setBusy(false);
    router.refresh();
  }

  async function downloadPdf() {
    if (!ref.current) return;
    const html2canvas = (await import('html2canvas')).default;
    const { jsPDF } = await import('jspdf');
    const canvas = await html2canvas(ref.current, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ unit: 'px', format: [canvas.width, canvas.height] });
    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
    pdf.save(`${invoice.invoice_number}.pdf`);
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div ref={ref}>
        <Receipt
          invoiceNumber={invoice.invoice_number}
          createdAt={invoice.created_at}
          items={invoice.items}
          subtotal={invoice.subtotal}
          shipping={invoice.shipping}
          total={invoice.total}
          paymentMethod={invoice.payment_method}
          customerName={invoice.customer_name}
          customerContact={invoice.customer_contact}
          paid={!!invoice.paid_at}
        />
      </div>
      <div className="flex gap-3 w-full max-w-[480px]">
        <button
          onClick={togglePaid}
          disabled={busy}
          className="flex-1 border border-line rounded py-2.5 font-medium"
        >
          {invoice.paid_at ? 'Mark Unpaid' : 'Mark Paid'}
        </button>
        <button
          onClick={downloadPdf}
          className="flex-1 bg-jdred text-white rounded py-2.5 font-medium"
        >
          Download PDF
        </button>
      </div>
    </div>
  );
}
