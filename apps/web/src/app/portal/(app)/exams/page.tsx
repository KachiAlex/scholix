'use client';

import { useTenantContext } from '@/components/portal/TenantContextProvider';

export default function ExamsPage() {
  const { context, loading, error } = useTenantContext();

  if (loading) {
    return <p className="text-muted">Loading exam workspace…</p>;
  }

  if (error && error !== 'unauthorized') {
    return <p className="form-error">{error}</p>;
  }

  if (!context?.school) {
    return (
      <section style={{ display: 'grid', gap: '0.75rem' }}>
        <h1 style={{ margin: 0 }}>CBT & Exams</h1>
        <p className="text-muted" style={{ margin: 0 }}>
          Switch to a tenant workspace to prepare assessments.
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
        <h1 style={{ margin: 0 }}>CBT & Exams</h1>
        <p className="text-muted" style={{ margin: 0 }}>
          {sessionLabel} · {termLabel}
        </p>
      </header>

      <div className="glass-card" style={{ padding: '1.5rem', display: 'grid', gap: '0.85rem' }}>
        <p style={{ margin: 0, fontWeight: 600 }}>Coming next</p>
        <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'rgba(255,255,255,0.75)' }}>
          <li>Exam builder + question banks</li>
          <li>CBT scheduling and session locks</li>
          <li>Attendance + live proctoring feed</li>
          <li>Auto grading + moderation pipelines</li>
        </ul>
      </div>
    </section>
  );
}
