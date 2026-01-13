'use client';

import { useTenantContext } from '@/components/portal/TenantContextProvider';

export default function FinancePage() {
  const { context, loading, error } = useTenantContext();

  if (loading) {
    return <p className="text-muted">Loading finance workspace…</p>;
  }

  if (error && error !== 'unauthorized') {
    return <p className="form-error">{error}</p>;
  }

  if (!context?.school) {
    return (
      <section style={{ display: 'grid', gap: '0.75rem' }}>
        <h1 style={{ margin: 0 }}>Finance</h1>
        <p className="text-muted" style={{ margin: 0 }}>
          Join a tenant workspace to configure fees and invoices.
        </p>
      </section>
    );
  }

  const sessionLabel = context.activeSession?.name ?? 'No session selected';
  const termLabel = context.activeTerm?.name ?? 'No term selected';

  return (
    <section style={{ display: 'grid', gap: '1.25rem' }}>
      <header style={{ display: 'grid', gap: '0.35rem' }}>
        <p className="pill" style={{ width: 'fit-content', fontSize: 13 }}>
          {context.school.shortCode ?? context.school.name} · {context.tenantRole ?? 'Member'}
        </p>
        <h1 style={{ margin: 0 }}>Finance</h1>
        <p className="text-muted" style={{ margin: 0 }}>
          {sessionLabel} · {termLabel}
        </p>
      </header>

      <div className="glass-card" style={{ padding: '1.5rem', display: 'grid', gap: '0.85rem' }}>
        <p style={{ margin: 0, fontWeight: 600 }}>Coming next</p>
        <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'rgba(255,255,255,0.75)' }}>
          <li>Fee structures & billing cycles</li>
          <li>Invoice + receipt generation</li>
          <li>Collections dashboard with aging</li>
          <li>Payment integrations & reminders</li>
        </ul>
      </div>
    </section>
  );
}
