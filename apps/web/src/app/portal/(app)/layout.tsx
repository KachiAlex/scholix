'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { TenantContextProvider, useTenantContext } from '@/components/portal/TenantContextProvider';

const NAV_ITEMS: Array<{ href: string; label: string }> = [
  { href: '/portal/dashboard', label: 'Dashboard' },
  { href: '/portal/students', label: 'Students' },
  { href: '/portal/academics', label: 'Academics' },
  { href: '/portal/exams', label: 'CBT & Exams' },
  { href: '/portal/results', label: 'Results' },
  { href: '/portal/finance', label: 'Finance' },
  { href: '/portal/settings', label: 'Settings' },
];

const SUPERADMIN_NAV: Array<{ href: string; label: string }> = [
  { href: '/portal/settings', label: 'Platform Control' },
];

export default function PortalAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <TenantContextProvider>
      <PortalShell>{children}</PortalShell>
    </TenantContextProvider>
  );
}

function PortalShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { context, loading, error, updateSelector } = useTenantContext();
  const [selectorBusy, setSelectorBusy] = useState(false);
  const [selectorError, setSelectorError] = useState<string | null>(null);

  useEffect(() => {
    if (error === 'unauthorized') {
      router.replace('/portal?mode=login');
    }
  }, [error, router]);

  const systemRoles = context?.systemRoles ?? [];
  const isSuperadmin = systemRoles.includes('SUPERADMIN');
  const hasTenantMembership = Boolean(context?.tenantRole);
  const isPlatformSuperadminOnly = isSuperadmin && !hasTenantMembership;

  useEffect(() => {
    if (isPlatformSuperadminOnly && pathname !== '/portal/settings') {
      router.replace('/portal/settings');
    }
  }, [isPlatformSuperadminOnly, pathname, router]);

  if (loading) {
    return (
      <main style={{ padding: '2.5rem clamp(1.5rem, 5vw, 5rem)', minHeight: '100vh' }}>
        <p className="text-muted">Loading portal…</p>
      </main>
    );
  }

  if (!context) {
    return (
      <main style={{ padding: '2.5rem clamp(1.5rem, 5vw, 5rem)', minHeight: '100vh' }}>
        <p className="form-error">{error ?? 'Unable to load tenant context'}</p>
      </main>
    );
  }

  const sessions = context.sessions;
  const activeSessionId = context.activeSession?.id ?? '';
  const activeTermId = context.activeTerm?.id ?? '';
  const navItems = isPlatformSuperadminOnly ? SUPERADMIN_NAV : NAV_ITEMS;

  const handleSessionChange = async (nextSessionId: string) => {
    if (!nextSessionId || nextSessionId === activeSessionId || selectorBusy) return;
    try {
      setSelectorBusy(true);
      setSelectorError(null);
      await updateSelector({ sessionId: nextSessionId });
    } catch (err) {
      setSelectorError(err instanceof Error ? err.message : 'Unable to switch session');
    } finally {
      setSelectorBusy(false);
    }
  };

  const handleTermChange = async (nextTermId: string) => {
    if (!nextTermId || nextTermId === activeTermId || selectorBusy) return;
    try {
      setSelectorBusy(true);
      setSelectorError(null);
      await updateSelector({ termId: nextTermId });
    } catch (err) {
      setSelectorError(err instanceof Error ? err.message : 'Unable to switch term');
    } finally {
      setSelectorBusy(false);
    }
  };

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
          <div style={{ fontWeight: 800, letterSpacing: 0.3 }}>
            {isPlatformSuperadminOnly
              ? 'Scholix Platform'
              : context.school?.shortCode ?? context.school?.name ?? 'Scholix'}
          </div>
          <div className="text-muted" style={{ fontSize: 13 }}>
            {context.email}
          </div>
          {isSuperadmin && <span className="pill">SUPERADMIN</span>}
          {isPlatformSuperadminOnly && (
            <span className="text-muted" style={{ fontSize: 12 }}>
              Manage tenant workspaces only
            </span>
          )}
        </div>

        {!isPlatformSuperadminOnly && context.school ? (
          <div style={{ display: 'grid', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
              <span className="text-muted">Academic Session</span>
              <select
                value={activeSessionId}
                onChange={(e) => handleSessionChange(e.target.value)}
                disabled={selectorBusy || sessions.length === 0}
                className="input-field"
                style={{ padding: '0.45rem 0.6rem', fontSize: 14 }}
              >
                {sessions.map((session) => (
                  <option key={session.id} value={session.id}>
                    {session.name}
                  </option>
                ))}
              </select>
            </label>

            {context.activeSession?.terms?.length ? (
              <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
                <span className="text-muted">Academic Term</span>
                <select
                  value={activeTermId}
                  onChange={(e) => handleTermChange(e.target.value)}
                  disabled={selectorBusy}
                  className="input-field"
                  style={{ padding: '0.45rem 0.6rem', fontSize: 14 }}
                >
                  {context.activeSession.terms.map((term) => (
                    <option key={term.id} value={term.id}>
                      {term.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            {selectorError && (
              <p className="form-error" style={{ margin: 0, fontSize: 13 }}>
                {selectorError}
              </p>
            )}

            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
              <strong>Audit:</strong> {context.auditSummary.pendingAlerts} alerts ·{' '}
              {context.auditSummary.lastEventAt ? new Date(context.auditSummary.lastEventAt).toLocaleString() : 'No events yet'}
            </div>
          </div>
        ) : null}

        <nav style={{ display: 'grid', gap: '0.35rem' }}>
          {navItems.map((item) => {
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
