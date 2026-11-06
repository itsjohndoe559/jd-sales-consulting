'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { money, todayInBusinessTz } from '@/lib/format';
import {
  ACCOUNT_COLORS,
  LEDGER_ACCOUNTS,
  mdy,
  withBalances,
  type LedgerAccount,
  type LedgerEntry,
} from '@/lib/financials';

function AccountChip({ account }: { account: LedgerAccount }) {
  return (
    <span
      className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium text-ink whitespace-nowrap"
      style={{ background: ACCOUNT_COLORS[account] }}
    >
      {account}
    </span>
  );
}

/** '10/25/26' or '10/25/2026' or '2026-10-25' -> '2026-10-25' */
function toIsoDate(s: string) {
  const t = s.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
  if (!m) return '';
  const y = m[3].length === 2 ? `20${m[3]}` : m[3];
  return `${y}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`;
}

const inputCls = 'bg-paper border border-line rounded px-2 py-1.5 text-sm';

export default function LedgerClient({
  entries,
  loadError,
}: {
  entries: LedgerEntry[];
  loadError: string;
}) {
  const router = useRouter();
  const rows = useMemo(() => withBalances(entries), [entries]);

  // Add form
  const [account, setAccount] = useState<LedgerAccount>('Tucoemas Checking');
  const [reference, setReference] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayInBusinessTz());
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // View controls
  const [filter, setFilter] = useState<LedgerAccount | 'All'>('All');
  const [search, setSearch] = useState('');
  const [newestFirst, setNewestFirst] = useState(true);

  // Inline edit
  const [editId, setEditId] = useState<string | null>(null);
  const [edit, setEdit] = useState({ account: '', reference: '', amount: '', entry_date: '' });

  // Import
  const [showImport, setShowImport] = useState(false);
  const [pasted, setPasted] = useState('');

  async function call(url: string, method: string, body?: unknown) {
    setBusy(true);
    setError('');
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(json.error ?? 'Something went wrong');
      return false;
    }
    router.refresh();
    return true;
  }

  async function add() {
    const ok = await call('/api/financials/ledger', 'POST', {
      account,
      reference,
      amount,
      entry_date: date,
    });
    if (ok) {
      setReference('');
      setAmount('');
    }
  }

  async function saveEdit() {
    if (!editId) return;
    if (await call(`/api/financials/ledger/${editId}`, 'PATCH', edit)) setEditId(null);
  }

  const parsedImport = useMemo(() => {
    return pasted
      .split('\n')
      .map((l) => l.split('\t'))
      .filter((c) => c.length >= 4 && (LEDGER_ACCOUNTS as readonly string[]).includes(c[0].trim()))
      .map((c) => ({
        account: c[0].trim(),
        reference: c[1].trim(),
        amount: c[2].trim(),
        entry_date: toIsoDate(c[3]),
      }));
  }, [pasted]);

  async function runImport() {
    if (await call('/api/financials/ledger', 'POST', { rows: parsedImport })) {
      setPasted('');
      setShowImport(false);
    }
  }

  const visible = rows
    .filter((r) => filter === 'All' || r.account === filter)
    .filter((r) => !search || r.reference.toLowerCase().includes(search.toLowerCase()));
  const ordered = newestFirst ? [...visible].reverse() : visible;

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-end gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Ledger</h1>
          <div className="text-sm text-slate">{entries.length} entries</div>
        </div>
        <button onClick={() => setShowImport((s) => !s)} className="text-xs text-slate hover:text-white underline">
          {showImport ? 'Close import' : 'Import from sheet'}
        </button>
      </div>

      {loadError && (
        <div className="card p-4 text-sm">
          Couldn&apos;t load the ledger ({loadError}). If this is the first time, run{' '}
          <code className="text-jdred">supabase/financials.sql</code> in the Supabase SQL Editor.
        </div>
      )}

      {showImport && (
        <div className="card p-4 space-y-3">
          <div className="text-sm">
            In the sheet&apos;s Ledger tab, select the rows (account through date), copy, and paste here.
          </div>
          <textarea
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            rows={6}
            className={`${inputCls} w-full font-mono text-xs`}
            placeholder={'Tucoemas Checking\tinitial deposit\t$1.00\t09/04/26'}
          />
          <div className="flex items-center gap-3">
            <button
              disabled={busy || parsedImport.length === 0}
              onClick={runImport}
              className="bg-jdgreen text-white rounded px-4 py-1.5 text-sm disabled:opacity-40"
            >
              Import {parsedImport.length} rows
            </button>
            <span className="text-xs text-slate">Rows are added after anything already on the same date.</span>
          </div>
        </div>
      )}

      {/* Add entry */}
      <div className="card p-4">
        <div className="grid grid-cols-2 md:grid-cols-[auto_1fr_auto_auto_auto] gap-2 items-center">
          <select
            value={account}
            onChange={(e) => setAccount(e.target.value as LedgerAccount)}
            className={`${inputCls} col-span-2 md:col-span-1`}
            style={{ borderColor: ACCOUNT_COLORS[account] }}
          >
            {LEDGER_ACCOUNTS.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <input
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="Reference (e.g. cash sales wk 8)"
            className={`${inputCls} col-span-2 md:col-span-1`}
          />
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount (-50.00 for out)"
            inputMode="decimal"
            className={`${inputCls} md:w-40`}
          />
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
          <button
            disabled={busy}
            onClick={add}
            className="bg-jdred text-white rounded px-4 py-1.5 text-sm col-span-2 md:col-span-1 disabled:opacity-40"
          >
            Add
          </button>
        </div>
        {error && <div className="text-jdred text-sm mt-2">{error}</div>}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-2 items-center">
        {(['All', ...LEDGER_ACCOUNTS] as const).map((a) => (
          <button
            key={a}
            onClick={() => setFilter(a)}
            className={`px-3 py-1 rounded-full text-xs border ${
              filter === a ? 'text-ink font-medium' : 'border-line text-slate'
            }`}
            style={
              filter === a
                ? { background: a === 'All' ? '#EDEEF0' : ACCOUNT_COLORS[a], borderColor: 'transparent' }
                : undefined
            }
          >
            {a}
          </button>
        ))}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search reference"
          className={`${inputCls} py-1 text-xs md:ml-auto`}
        />
        <button onClick={() => setNewestFirst((s) => !s)} className="text-xs text-slate hover:text-white border border-line rounded px-2 py-1">
          {newestFirst ? 'Newest first' : 'Oldest first'}
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm tabular whitespace-nowrap">
          <thead>
            <tr className="text-[11px] uppercase tracking-wide text-slate border-b border-line">
              <th className="text-left p-3">Account</th>
              <th className="text-left p-3">Reference</th>
              <th className="text-right p-3">Amount</th>
              <th className="text-right p-3">Date</th>
              <th className="text-right p-3">Balance</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {ordered.map((r) =>
              editId === r.id ? (
                <tr key={r.id} className="border-b border-line bg-white/5">
                  <td className="p-2">
                    <select value={edit.account} onChange={(e) => setEdit({ ...edit, account: e.target.value })} className={inputCls}>
                      {LEDGER_ACCOUNTS.map((a) => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2">
                    <input value={edit.reference} onChange={(e) => setEdit({ ...edit, reference: e.target.value })} className={`${inputCls} w-full min-w-[200px]`} />
                  </td>
                  <td className="p-2">
                    <input value={edit.amount} onChange={(e) => setEdit({ ...edit, amount: e.target.value })} className={`${inputCls} w-28 text-right`} />
                  </td>
                  <td className="p-2">
                    <input type="date" value={edit.entry_date} onChange={(e) => setEdit({ ...edit, entry_date: e.target.value })} className={inputCls} />
                  </td>
                  <td className="p-2"></td>
                  <td className="p-2 text-right">
                    <button disabled={busy} onClick={saveEdit} className="text-jdgreen text-xs mr-3">Save</button>
                    <button onClick={() => setEditId(null)} className="text-slate text-xs">Cancel</button>
                  </td>
                </tr>
              ) : (
                <tr key={r.id} className="border-b border-line last:border-0 hover:bg-white/5 group">
                  <td className="p-3"><AccountChip account={r.account} /></td>
                  <td className={`p-3 ${r.reference.trim().startsWith('?') ? 'text-jdred font-medium' : ''}`}>{r.reference}</td>
                  <td className={`p-3 text-right ${r.amount < 0 ? 'text-jdred' : 'text-jdgreen'}`}>{money(r.amount)}</td>
                  <td className="p-3 text-right">{mdy(r.entry_date)}</td>
                  <td className="p-3 text-right font-semibold">{money(r.balance)}</td>
                  <td className="p-3 text-right text-xs text-slate">
                    <span className="opacity-60 group-hover:opacity-100">
                      <button disabled={busy} title="Move up within the day" onClick={() => call(`/api/financials/ledger/${r.id}`, 'PATCH', { move: newestFirst ? 'down' : 'up' })} className="px-1 hover:text-white">↑</button>
                      <button disabled={busy} title="Move down within the day" onClick={() => call(`/api/financials/ledger/${r.id}`, 'PATCH', { move: newestFirst ? 'up' : 'down' })} className="px-1 hover:text-white">↓</button>
                      <button
                        onClick={() => {
                          setEditId(r.id);
                          setEdit({ account: r.account, reference: r.reference, amount: String(r.amount), entry_date: r.entry_date });
                        }}
                        className="px-2 hover:text-white"
                      >
                        Edit
                      </button>
                      <button
                        disabled={busy}
                        onClick={() => {
                          if (confirm(`Delete "${r.reference}" (${money(r.amount)}) from ${r.account}?`))
                            call(`/api/financials/ledger/${r.id}`, 'DELETE');
                        }}
                        className="px-1 hover:text-jdred"
                      >
                        Delete
                      </button>
                    </span>
                  </td>
                </tr>
              )
            )}
            {ordered.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-slate">No entries.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
