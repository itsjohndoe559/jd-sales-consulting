'use client';

import { useEffect, useState } from 'react';
import { money, todayInBusinessTz } from '@/lib/format';
import KpiTile from './KpiTile';
import type { Deduction, DeductionCategory, DeductionType } from '@/lib/types';

const CATEGORIES: DeductionCategory[] = [
  'Subscriptions',
  'Services',
  'Equipment',
  'Gas',
  'Other',
];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function categoryBadgeClass(c: string) {
  if (c === 'Gas') return 'bg-jdred/10 text-jdred';
  if (c === 'Equipment') return 'bg-jdgreen/10 text-jdgreen';
  return 'bg-line/50 text-slate';
}

type GetResponse = {
  month: string;
  deductions: { recurring: Deduction[]; oneTime: Deduction[]; cogs: number };
  totals: { recurring: number; oneTime: number; cogs: number; total: number };
};

function AddDeductionModal({
  year,
  month,
  onAdded,
}: {
  year: number;
  month: number;
  onAdded: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<DeductionCategory>('Subscriptions');
  const [type, setType] = useState<DeductionType>('one-time');
  const [dayOfMonth, setDayOfMonth] = useState('1');
  const [startDate, setStartDate] = useState(
    `${year}-${String(month).padStart(2, '0')}-01`
  );
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function reset() {
    setName('');
    setAmount('');
    setCategory('Subscriptions');
    setType('one-time');
    setDayOfMonth('1');
    setStartDate(`${year}-${String(month).padStart(2, '0')}-01`);
    setEndDate('');
    setError('');
  }

  async function submit() {
    setError('');
    const amt = Number(amount);
    if (!name.trim()) return setError('Name is required.');
    if (!amt || amt <= 0) return setError('Amount must be greater than 0.');
    if (type === 'recurring' && (!dayOfMonth || Number(dayOfMonth) < 1 || Number(dayOfMonth) > 31)) {
      return setError('Day of month must be between 1 and 31.');
    }

    setSaving(true);
    const res = await fetch('/api/deductions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        amount: amt,
        category,
        type,
        dayOfMonth: type === 'recurring' ? Number(dayOfMonth) : undefined,
        startDate,
        endDate: type === 'recurring' && endDate ? endDate : null,
      }),
    });
    setSaving(false);

    if (res.ok) {
      reset();
      setOpen(false);
      onAdded();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? 'Could not add that deduction.');
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="bg-jdred text-white rounded px-4 py-2 text-sm font-medium"
      >
        + Add Deduction
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-md max-h-[90vh] overflow-y-auto p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">Add Deduction</h2>
          <button
            onClick={() => {
              reset();
              setOpen(false);
            }}
            className="text-slate"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <div className="text-xs text-slate mb-1">Name</div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Business Phone"
              className="w-full border border-line rounded px-3 py-2 text-sm"
            />
          </div>

          <div>
            <div className="text-xs text-slate mb-1">Amount</div>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full border border-line rounded px-3 py-2 text-sm"
            />
          </div>

          <div>
            <div className="text-xs text-slate mb-1">Category</div>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`px-3 py-1.5 rounded-full text-sm ${
                    category === c ? 'bg-jdred text-white' : 'bg-line/50 text-slate'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs text-slate mb-1">Type</div>
            <div className="flex gap-2">
              {(['one-time', 'recurring'] as DeductionType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`px-3 py-1.5 rounded-full text-sm ${
                    type === t ? 'bg-jdred text-white' : 'bg-line/50 text-slate'
                  }`}
                >
                  {t === 'one-time' ? 'One-Time' : 'Recurring'}
                </button>
              ))}
            </div>
          </div>

          {type === 'recurring' ? (
            <>
              <div className="flex gap-2">
                <div className="flex-1">
                  <div className="text-xs text-slate mb-1">Day of month</div>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={dayOfMonth}
                    onChange={(e) => setDayOfMonth(e.target.value)}
                    className="w-full border border-line rounded px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex-1">
                  <div className="text-xs text-slate mb-1">Start date</div>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full border border-line rounded px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <div className="text-xs text-slate mb-1">End date (optional)</div>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full border border-line rounded px-3 py-2 text-sm"
                />
              </div>
            </>
          ) : (
            <div>
              <div className="text-xs text-slate mb-1">Date</div>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border border-line rounded px-3 py-2 text-sm"
              />
            </div>
          )}

          {error && <div className="text-jdred text-sm">{error}</div>}

          <button
            onClick={submit}
            disabled={saving}
            className="bg-jdred text-white rounded py-2.5 font-medium disabled:opacity-50 mt-1"
          >
            {saving ? 'Adding...' : 'Add Deduction'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DeductionsTracker() {
  const today = todayInBusinessTz();
  const [year, setYear] = useState(Number(today.slice(0, 4)));
  const [month, setMonth] = useState(Number(today.slice(5, 7))); // 1-indexed
  const [data, setData] = useState<GetResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/deductions?year=${year}&month=${month}`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month]);

  function prevMonth() {
    if (month === 1) {
      setMonth(12);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (month === 12) {
      setMonth(1);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  }

  async function remove(id: string) {
    setDeletingId(id);
    const res = await fetch(`/api/deductions/${id}`, { method: 'DELETE' });
    setDeletingId(null);
    if (res.ok) load();
    else alert('Could not delete that deduction. Try again.');
  }

  const all = data
    ? [...data.deductions.recurring, ...data.deductions.oneTime]
    : [];

  return (
    <div>
      <div className="flex justify-between items-start mb-4 gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold mb-1">Deductions</h1>
          <p className="text-sm text-slate">
            Recurring charges, one-time deductions, and COGS by month
          </p>
        </div>
        <AddDeductionModal year={year} month={month} onAdded={load} />
      </div>

      <div className="flex items-center justify-center gap-4 mb-6">
        <button onClick={prevMonth} className="text-lg px-2 text-slate hover:text-white">
          ←
        </button>
        <div className="text-lg font-bold w-48 text-center">
          {MONTH_NAMES[month - 1]} {year}
        </div>
        <button onClick={nextMonth} className="text-lg px-2 text-slate hover:text-white">
          →
        </button>
      </div>

      {loading || !data ? (
        <div className="text-sm text-slate italic text-center py-6">Loading...</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <KpiTile label="Recurring Charges" value={money(data.totals.recurring)} />
            <KpiTile label="One-Time Deductions" value={money(data.totals.oneTime)} />
            <KpiTile label="Cost of Goods" value={money(data.totals.cogs)} />
            <KpiTile
              label="Total Deductions"
              value={money(data.totals.total)}
              accent="red"
            />
          </div>

          <div className="card p-4">
            {all.length === 0 && (
              <div className="text-sm text-slate italic py-6 text-center">
                No deductions logged for this month.
              </div>
            )}
            {all.map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between gap-3 py-3 border-b border-line last:border-0 text-sm"
              >
                <div className="min-w-0">
                  <div className="font-medium truncate">{d.name}</div>
                  <div className="text-xs text-slate flex gap-2 flex-wrap mt-1">
                    <span className={`px-2 py-0.5 rounded-full ${categoryBadgeClass(d.category)}`}>
                      {d.category}
                    </span>
                    <span>
                      {d.type === 'recurring'
                        ? `Recurring (Day ${d.day_of_month})`
                        : `One-Time · ${d.start_date}`}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="tabular font-medium">{money(d.amount)}</span>
                  <button
                    onClick={() => remove(d.id)}
                    disabled={deletingId === d.id}
                    className="text-xs text-slate hover:text-jdred underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
