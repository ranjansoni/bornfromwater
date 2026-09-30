'use client';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export function AdminLogin() {
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setPending(true);
    const password = new FormData(event.currentTarget).get('password');
    try {
      const response = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
      if (response.ok) {
        // Start a new document so the router cannot reuse an unauthenticated RSC response.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.assign('/admin/orders'); return;
      }
      setError((await response.json()).error ?? 'Could not sign in. Please try again.');
    } catch { setError('Could not connect. Please try again.'); }
    setPending(false);
  }
  return <form onSubmit={login} className="admin-form">
    <label>Owner password<input name="password" type="password" autoComplete="current-password" required maxLength={256} autoFocus /></label>
    {error && <p className="admin-error" role="alert">{error}</p>}
    <button type="submit" className="admin-button" disabled={pending}>{pending ? 'Signing in…' : 'Sign in'}</button>
  </form>;
}
export function AdminLogout() {
  const [error, setError] = useState('');
  return <div><button className="admin-text-button" onClick={async () => {
    try {
      const response = await fetch('/api/admin/logout', { method: 'POST' });
      if (!response.ok) throw new Error();
      // Discard all private client/router state when the owner signs out.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign('/admin/login');
    } catch { setError('Could not sign out. Please try again.'); }
  }}>Sign out</button>{error && <p role="alert">{error}</p>}</div>;
}
export function AdminRefresh() {
  const router = useRouter();
  return <button className="admin-button admin-secondary" onClick={() => router.refresh()}>Refresh orders ↻</button>;
}
