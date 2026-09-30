'use client';
export default function AdminError({ reset }: { reset: () => void }) {
  return <section className="admin-empty"><h1>Orders are temporarily unavailable.</h1>
    <p>Your changes have not been confirmed. Reload before trying again.</p>
    <button className="admin-button" onClick={reset}>Try again</button></section>;
}
