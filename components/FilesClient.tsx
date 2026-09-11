'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import SearchBar from './SearchBar';
import FilterChips from './FilterChips';
import UploadFileModal from './UploadFileModal';
import type { BusinessFile, FileCategory } from '@/lib/types';

const CATEGORIES: FileCategory[] = ['Paperwork', 'Invoice', 'Receipt', 'Bank Info', 'Other'];

function fileIcon(mime: string | null) {
  if (mime?.startsWith('image/')) return '🖼️';
  if (mime === 'application/pdf') return '📄';
  return '📎';
}

function formatSize(bytes: number | null) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FilesClient({ files }: { files: BusinessFile[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(() => searchParams.get('search') ?? '');
  const [categories, setCategories] = useState<string[]>(() =>
    (searchParams.get('category') ?? '').split(',').filter(Boolean)
  );
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (categories.length) params.set('category', categories.join(','));
    const qs = params.toString();
    window.history.replaceState(null, '', qs ? `${pathname}?${qs}` : pathname);
  }, [search, categories, pathname]);

  function toggleCategory(c: string) {
    setCategories((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  }

  function clearAll() {
    setSearch('');
    setCategories([]);
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return files.filter((f) => {
      if (categories.length > 0 && !categories.includes(f.category)) return false;
      if (q && !f.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [files, search, categories]);

  async function view(f: BusinessFile) {
    setBusyId(f.id);
    const res = await fetch(`/api/files/${f.id}`);
    setBusyId(null);
    if (res.ok) {
      const data = await res.json();
      window.open(data.url, '_blank', 'noopener,noreferrer');
    } else {
      alert('Could not open that file. Try again.');
    }
  }

  async function remove(f: BusinessFile) {
    if (!confirm(`Delete "${f.name}"? This can't be undone.`)) return;
    setBusyId(f.id);
    const res = await fetch(`/api/files/${f.id}`, { method: 'DELETE' });
    setBusyId(null);
    if (res.ok) {
      router.refresh();
    } else {
      alert('Could not delete that file. Try again.');
    }
  }

  const activeFilterCount = (search ? 1 : 0) + categories.length;

  return (
    <div>
      <div className="flex justify-between items-start mb-4 gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Files</h1>
          <p className="text-sm text-slate">
            Business paperwork, invoices, receipts, and bank info - accessible from anywhere
          </p>
        </div>
        <UploadFileModal />
      </div>

      <div className="card p-4 mb-4 flex flex-col gap-3">
        <SearchBar value={search} onChange={setSearch} placeholder="Search file name..." />
        <div className="flex justify-between items-center gap-3 flex-wrap">
          <FilterChips options={CATEGORIES} selected={categories} onToggle={toggleCategory} />
          {activeFilterCount > 0 && (
            <button onClick={clearAll} className="text-xs text-jdred underline shrink-0">
              Clear all ({activeFilterCount})
            </button>
          )}
        </div>
      </div>

      <div className="card p-4">
        {filtered.length === 0 && (
          <div className="text-sm text-slate italic py-6 text-center">
            No files match these filters.
          </div>
        )}
        {filtered.map((f) => (
          <div
            key={f.id}
            className="flex items-center justify-between gap-3 py-3 border-b border-line last:border-0 text-sm"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-xl shrink-0">{fileIcon(f.mime_type)}</span>
              <div className="min-w-0">
                <div className="font-medium truncate">{f.name}</div>
                <div className="text-xs text-slate flex gap-2 flex-wrap">
                  <span className="bg-line/50 px-2 py-0.5 rounded-full">{f.category}</span>
                  <span>{new Date(f.uploaded_at).toLocaleDateString('en-US')}</span>
                  {formatSize(f.size_bytes) && <span>{formatSize(f.size_bytes)}</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => view(f)}
                disabled={busyId === f.id}
                className="text-xs text-jdred underline"
              >
                View
              </button>
              <button
                onClick={() => remove(f)}
                disabled={busyId === f.id}
                className="text-xs text-slate hover:text-jdred underline"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
