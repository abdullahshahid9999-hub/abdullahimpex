import { FormEvent, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function CrescentMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none">
      <path
        d="M62 8C40 8 22 26 22 50s18 42 40 42c6 0 12-1.3 17-3.7C66 93 53 98 39 98 17.5 98 0 76.6 0 50S17.5 2 39 2c14 0 27 5 23 6Z"
        fill="currentColor"
      />
    </svg>
  );
}

export default function Login() {
  const { session, signIn, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && session) return <Navigate to="/" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const result = await signIn(email.trim(), password);
    setSubmitting(false);
    if (result.error) setError('Incorrect email or password.');
  }

  return (
    <div className="flex min-h-screen">
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-ink p-12 text-white lg:flex">
        <CrescentMark className="pointer-events-none absolute -bottom-24 -left-20 h-[420px] w-[420px] text-white/[0.05]" />
        <CrescentMark className="pointer-events-none absolute -top-16 right-0 h-64 w-64 text-white/[0.04]" />
        <div className="relative z-10">
          <p className="font-display text-2xl font-bold">M Riaz Trading</p>
          <p className="mt-1 text-sm text-white/50">Spinning machinery parts &amp; trading</p>
        </div>
        <div className="relative z-10 max-w-sm">
          <p className="font-display text-3xl font-semibold leading-snug">
            Stock, sales, and billing — in one place, for both your companies.
          </p>
          <p className="mt-4 text-sm text-white/50">
            Main Bazar, Nishatabad, Near Nishat Mills Ltd, Faisalabad.
          </p>
        </div>
      </div>

      <div className="flex w-full flex-1 items-center justify-center bg-surface px-6 lg:w-1/2">
        <div className="w-full max-w-sm">
          <h1 className="font-display text-2xl font-bold">Sign in</h1>
          <p className="mt-1 text-sm text-ink-muted">Admin access only.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                required
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                required
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-danger">{error}</p>}
            <button type="submit" disabled={submitting} className="btn-primary w-full">
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
