'use client';

import { useEffect, useRef, useState } from 'react';
import { todayInBusinessTz, longDate, money } from '@/lib/format';
import { downloadElementAsPdf } from '@/lib/pdf';
import ReportView from './ReportView';
import type { DailyReport, DailyReportData } from '@/lib/types';

const EARLIEST_REPORT_DATE = '2026-09-08';

export default function ReportGenerator() {
  const [date, setDate] = useState(todayInBusinessTz());
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [current, setCurrent] = useState<DailyReportData | null>(null);
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const previewRef = useRef<HTMLDivElement>(null);
  const hiddenRef = useRef<HTMLDivElement>(null);
  const [hiddenData, setHiddenData] = useState<DailyReportData | null>(null);

  async function loadReports() {
    setLoadingList(true);
    try {
      const res = await fetch('/api/reports/list');
      const data = await res.json();
      if (res.ok) setReports(data.reports ?? []);
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    loadReports();
  }, []);

  async function generate() {
    setError('');
    if (date < EARLIEST_REPORT_DATE) {
      setError(`Report date must be on or after ${longDate(EARLIEST_REPORT_DATE)}.`);
      return;
    }
    setGenerating(true);
    const res = await fetch('/api/reports/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reportDate: date }),
    });
    const data = await res.json();
    setGenerating(false);

    if (!res.ok) {
      setError(data.error ?? 'Could not generate that report.');
      return;
    }

    setCurrent(data.metrics);
    await loadReports();

    // Auto-download the PDF right after generating.
    setTimeout(() => {
      if (previewRef.current) {
        downloadElementAsPdf(previewRef.current, `jd-report-${date}.pdf`);
      }
    }, 50);
  }

  async function downloadSaved(report: DailyReport) {
    setDownloadingId(report.id);
    setHiddenData(report.json_data);
    // Let the hidden report render before capturing it.
    await new Promise((r) => setTimeout(r, 50));
    if (hiddenRef.current) {
      await downloadElementAsPdf(
        hiddenRef.current,
        `jd-report-${report.report_date}.pdf`
      );
    }
    setDownloadingId(null);
    setHiddenData(null);
  }

  return (
    <div>
      <div className="card p-4 mb-6">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <div className="text-xs text-slate mb-1">Report date</div>
            <input
              type="date"
              value={date}
              min={EARLIEST_REPORT_DATE}
              onChange={(e) => setDate(e.target.value)}
              className="border border-line rounded px-3 py-2 text-sm"
            />
          </div>
          <button
            onClick={generate}
            disabled={generating}
            className="bg-jdred text-white rounded px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {generating ? 'Generating...' : 'Generate Report'}
          </button>
        </div>
        {error && <div className="text-jdred text-sm mt-3">{error}</div>}
      </div>

      {current && (
        <div className="mb-8" ref={previewRef}>
          <ReportView data={current} />
        </div>
      )}

      <div>
        <div className="text-sm font-bold mb-3">Saved Reports</div>
        {loadingList && (
          <div className="text-sm text-slate italic">Loading...</div>
        )}
        {!loadingList && reports.length === 0 && (
          <div className="text-sm text-slate italic">
            No reports generated yet.
          </div>
        )}
        <div className="card p-4">
          {reports.map((r) => (
            <div
              key={r.id}
              className="flex justify-between items-center py-3 border-b border-line last:border-0 text-sm"
            >
              <div>
                <div className="font-medium">{longDate(r.report_date)}</div>
                <div className="text-xs text-slate">
                  {money(r.json_data.dailyRevenue)} revenue ·{' '}
                  {r.json_data.transactionCount} transactions
                </div>
              </div>
              <button
                onClick={() => downloadSaved(r)}
                disabled={downloadingId === r.id}
                className="text-xs text-jdred underline disabled:opacity-50"
              >
                {downloadingId === r.id ? 'Preparing...' : 'Download PDF'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Off-screen render target used to build PDFs for saved reports */}
      {hiddenData && (
        <div className="fixed -left-[9999px] top-0" ref={hiddenRef}>
          <ReportView data={hiddenData} />
        </div>
      )}
    </div>
  );
}
