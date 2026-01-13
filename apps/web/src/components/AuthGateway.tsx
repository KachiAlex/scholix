'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { clearAccessToken, getAccessToken, saveAccessToken } from '@/lib/client-auth';

type Mode = 'login' | 'register';

type AuthUser = {
  id: string;
  email: string;
  roles?: string[];
};

export function AuthGateway({ initialMode = 'login' }: { initialMode?: Mode }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [status, setStatus] = useState<'unauthenticated' | 'loading' | 'authenticated'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [form, setForm] = useState({ email: '', password: '', schoolName: '', setupKey: '' });

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  const canSubmit = useMemo(() => {
    if (!form.email || !form.password) return false;
    if (mode === 'register' && !form.schoolName) return false;
    return true;
  }, [form, mode]);

  const resetToAuth = useCallback(() => {
    setUser(null);
    setStatus('unauthenticated');
    setError(null);
    setForm({ email: '', password: '', schoolName: '', setupKey: '' });
  }, []);

  useEffect(() => {
    const storedToken = getAccessToken();
    if (!storedToken) {
      resetToAuth();
      return;
    }

    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch('/api/auth/me', {
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${storedToken}`,
          },
        });

        if (!res.ok) throw new Error('Session expired');
        const data = await res.json();
        setUser(data);
        setStatus('authenticated');
        router.replace('/portal/dashboard');
      } catch (err) {
        console.warn('AUTH_SESSION_CHECK_FAILED', err);
        clearAccessToken();
        resetToAuth();
      }
    })();

    return () => controller.abort();
  }, [resetToAuth, router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy || !canSubmit) return;

    setBusy(true);
    setError(null);

    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const payload =
        mode === 'login'
          ? {
              email: form.email,
              password: form.password,
              ...(form.setupKey ? { setupKey: form.setupKey } : {}),
            }
          : { email: form.email, password: form.password, schoolName: form.schoolName };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ message: 'Unable to authenticate' }));
        throw new Error(data.message || 'Unable to authenticate');
      }

      const data = await res.json();
      saveAccessToken(data.accessToken);
      setUser(data.user);
      setStatus('authenticated');
      router.replace('/portal/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div className="pill" style={{ width: 'fit-content' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
          {status === 'authenticated' ? 'Session Active' : 'Portal Ready'}
        </div>
        <div>
          <h1 style={{ fontSize: 'clamp(2rem, 4vw, 3.1rem)', marginBottom: 0 }}>Scholix Control Center</h1>
          <p className="section-subtitle">
            Authenticate to orchestrate SIS, CBT, and result workflows from a single, intentional cockpit.
          </p>
        </div>
      </div>

      {status !== 'authenticated' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.75rem' }}>
          <div>
            <div className="pill" style={{ marginBottom: '1rem' }}>
              <span role="img" aria-label="spark">⚡</span>
              Trusted by growing academies
            </div>
            <h2 className="section-title">Full-stack school OS</h2>
            <p className="text-muted" style={{ lineHeight: 1.7 }}>
              Launch CBT exams, manage academic sessions, and reconcile complex grading logic without hopping between
              apps. Scholix keeps leadership, registrars, and examiners in lockstep.
            </p>
            <ul style={{ marginTop: '1.5rem', paddingLeft: '1.25rem', lineHeight: 1.7, color: 'rgba(237,242,247,0.85)' }}>
              <li>Granular SIS controls with contextual validation</li>
              <li>Secure CBT attempts with autosave + audit trails</li>
              <li>Upcoming: configurable result computation engine</li>
            </ul>
          </div>
          <div>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              {(['login', 'register'] as Mode[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setMode(tab)}
                  style={{
                    flex: 1,
                    padding: '0.75rem 1rem',
                    borderRadius: 16,
                    border: '1px solid rgba(255,255,255,0.2)',
                    background: mode === tab ? 'rgba(15,23,42,0.75)' : 'transparent',
                    color: 'inherit',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {tab === 'login' ? 'Sign in' : 'Create admin'}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <label>
                <span>Email</span>
                <input
                  className="input-field"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="registrar@academy.edu"
                  required
                />
              </label>

              <label>
                <span>Password</span>
                <input
                  className="input-field"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder="••••••••"
                  required
                />
              </label>

              {mode === 'login' && (
                <label>
                  <span>Setup Key (optional)</span>
                  <input
                    className="input-field"
                    type="password"
                    value={form.setupKey}
                    onChange={(e) => setForm((prev) => ({ ...prev, setupKey: e.target.value }))}
                    placeholder="Enter once to bootstrap superadmin"
                  />
                </label>
              )}

              {mode === 'register' && (
                <label>
                  <span>School Name</span>
                  <input
                    className="input-field"
                    value={form.schoolName}
                    onChange={(e) => setForm((prev) => ({ ...prev, schoolName: e.target.value }))}
                    placeholder="Aurora Science Academy"
                    required
                  />
                </label>
              )}

              {error && <p className="form-error">{error}</p>}

              <button className="gradient-button" type="submit" disabled={!canSubmit || busy}>
                {busy ? 'Please wait…' : mode === 'login' ? 'Enter control room' : 'Launch Scholix portal'}
              </button>
            </form>
          </div>
        </div>
      )}

      {status === 'authenticated' && (
        <p className="text-muted" style={{ margin: 0 }}>
          Redirecting to dashboard…
        </p>
      )}
    </div>
  );
}
