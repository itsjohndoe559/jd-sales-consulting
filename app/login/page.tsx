'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passcode }),
    });
    setLoading(false);
    if (res.ok) {
      router.push('/');
      router.refresh();
    } else {
      setError('Incorrect passcode. Try again.');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper">
      <form
        onSubmit={submit}
        className="card p-8 w-full max-w-sm flex flex-col gap-4"
      >
        <div className="text-3xl font-bold text-center mb-2">
          <span className="text-jdred">J</span>
          <span className="text-jdgreen">D</span>
        </div>
        <p className="text-sm text-slate text-center">
          Enter the site passcode to continue.
        </p>
        <input
          type="password"
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          className="border border-line rounded px-3 py-2 text-center tracking-widest"
          placeholder="Passcode"
          autoFocus
        />
        {error && (
          <p className="text-jdred text-sm text-center">{error}</p>
        )}
        <button
          type="submit"
          disabled={loading || !passcode}
          className="bg-jdred text-white rounded py-2 font-medium disabled:opacity-50"
        >
          {loading ? 'Checking...' : 'Enter'}
        </button>
      </form>
    </div>
  );
}
