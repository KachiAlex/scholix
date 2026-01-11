'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { clearAccessToken, getAccessToken } from '@/lib/client-auth';

type AuthUser = {
  userId: string;
  email: string;
  roles: string[];
};

const NAV_ITEMS: Array<{ href: string; label: string }> = [
  { href: '/portal/dashboard', label: 'Dashboard' },
  { href: '/portal/students', label: 'Students' },
  { href: '/portal/academics', label: 'Academics' },
  { href: '/portal/exams', label: 'CBT & Exams' },
  { href: '/portal/results', label: 'Results' },
  { href: '/portal/finance', label: 'Finance' },
  { href: '/portal/settings', label: 'Settings' },
];

export default function PortalAppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace('/portal?mode=login');
      return;
    }

    const controller = new AbortController();
    (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/auth/me', {
          signal: controller.signal,
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        if (!res.ok) throw new Error('Session expired');
        const data = (await res.json()) as AuthUser;
        setUser(data);
      } catch {
        clearAccessToken();
        router.replace('/portal?mode=login');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [router]);

  const isSuperadmin = useMemo(() => user?.roles?.includes('SUPERADMIN') ?? false, [user]);

  if (loading) {
    return (
      <main style={{ padding: '2.5rem clamp(1.5rem, 5vw, 5rem)', minHeight: '100vh' }}>
        <p className="text-muted">Loading portal…</p>
      </main>
    );
  }

  if (!user) return null;

  return (
    <main style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '260px 1fr' }}>
      <aside
        style={{
          borderRight: '1px solid rgba(255,255,255,0.08)',
          padding: '2rem 1.25rem',
          background: 'rgba(15,23,42,0.5)',
        }}
      >
        <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <div style={{ fontWeight: 800, letterSpacing: 0.3 }}>Scholix</div>
          <div className="text-muted" style={{ fontSize: 13 }}>
            {user.email}
          </div>
          {isSuperadmin && <span className="pill">SUPERADMIN</span>}
        </div>

        <nav style={{ display: 'grid', gap: '0.35rem' }}>
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="pill"
                style={{
                  display: 'block',
                  padding: '0.6rem 0.85rem',
                  borderRadius: 14,
                  background: active ? 'rgba(15,23,42,0.75)' : 'transparent',
                  border: active ? '1px solid rgba(255,255,255,0.18)' : '1px solid transparent',
                  fontWeight: active ? 700 : 600,
                  textDecoration: 'none',
                  color: 'inherit',
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <section style={{ padding: '2.5rem clamp(1.5rem, 4vw, 3rem)' }}>{children}</section>
    </main>
  );
}
