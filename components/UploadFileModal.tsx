'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { FileCategory } from '@/lib/types';

const CATEGORIES: FileCategory[] = ['Paperwork', 'Invoice', 'Receipt', 'Bank Info', 'Other'];

export default function UploadFileModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<FileCategory>('Paperwork');
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  function reset() {
    setFile(null);
    setName('');
    setCategory('Paperwork');
    setError('');
  }

  function pickFile(f: File | null) {
    setFile(f);
    if (f && !name) {
      // Default the name to the filename without its extension.
      setName(f.name.replace(/\.[^.]+$/, ''));
    }
  }

  async function submit() {
    setError('');
    if (!file) {
      setError('Choose a file first.');
      return;
    }
    if (!name.trim()) {
      setError('Give it a name.');
      return;
    }
    setUploading(true);
    const form = new FormData();
    form.append('file', file);
    form.append('name', name.trim());
    form.append('category', category);

    const res = await fetch('/api/files', { method: 'POST', body: form });
    setUploading(false);

    if (res.ok) {
      reset();
      setOpen(false);
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? 'Could not upload that file.');
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="bg-jdred text-white rounded px-4 py-2 text-sm font-medium"
      >
        + Upload File
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-md max-h-[90vh] overflow-y-auto p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">Upload File</h2>
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
            <div className="text-xs text-slate mb-1">File (PDF or image)</div>
            <input
              type="file"
              accept="application/pdf,image/*"
              onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm"
            />
          </div>

          <div>
            <div className="text-xs text-slate mb-1">Name</div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Operating Agreement"
              className="w-full border border-line rounded px-3 py-2 text-sm"
            />
          </div>

          <div>
            <div className="text-xs text-slate mb-1">Type</div>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`px-3 py-1.5 rounded-full text-sm ${
                    category === c ? 'bg-ink text-white' : 'bg-line/50 text-ink'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {error && <div className="text-jdred text-sm">{error}</div>}

          <button
            onClick={submit}
            disabled={uploading}
            className="bg-jdred text-white rounded py-2.5 font-medium disabled:opacity-50 mt-1"
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </div>
    </div>
  );
}
