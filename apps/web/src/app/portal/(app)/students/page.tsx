'use client';

import { useTenantContext } from '@/components/portal/TenantContextProvider';

export default function StudentsPage() {
  const { context, loading, error } = useTenantContext();

  if (loading) {
    return <p className="text-muted">Loading student workspace…</p>;
  }

  if (error && error !== 'unauthorized') {
    return <p className="form-error">{error}</p>;
  }

  if (!context?.school) {
    return (
      <section style={{ display: 'grid', gap: '0.75rem' }}>
        <h1 style={{ margin: 0 }}>Students</h1>
        <p className="text-muted" style={{ margin: 0 }}>
          Join a school workspace to manage enrollments and profiles.
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
        <h1 style={{ margin: 0 }}>Students</h1>
        <p className="text-muted" style={{ margin: 0 }}>
          {sessionLabel} · {termLabel}
        </p>
      </header>

      <div className="glass-card" style={{ padding: '1.5rem', display: 'grid', gap: '0.85rem' }}>
        <p style={{ margin: 0, fontWeight: 600 }}>Coming next</p>
        <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'rgba(255,255,255,0.75)' }}>
          <li>Enrollment + promotion workflow</li>
          <li>Student profiles with guardians & documents</li>
          <li>Class/arm assignments tied to session + term</li>
          <li>Bulk import & ID/pass issuance</li>
        </ul>
      </div>
    </section>
  );
}
