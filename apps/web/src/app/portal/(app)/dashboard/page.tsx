'use client';

import { useMemo } from 'react';
import { useTenantContext } from '@/components/portal/TenantContextProvider';

export default function PortalDashboardPage() {
  const { context, loading, error } = useTenantContext();

  const schoolName = useMemo(() => context?.school?.name ?? 'Your school', [context?.school?.name]);
  const tagline =
    context?.school?.tagline ||
    'Tenant dashboard (phase 1 shell)';

  if (loading) {
    return <p className="text-muted">Loading school dashboard…</p>;
  }

  if (error && error !== 'unauthorized') {
    return <p className="form-error">{error}</p>;
  }

  if (!context?.school) {
    return (
      <div
        style={{
          borderRadius: 18,
          border: '1px solid rgba(255,255,255,0.12)',
          padding: '1.25rem',
          background: 'rgba(15,23,42,0.65)',
        }}
      >
        <p style={{ margin: 0, fontWeight: 600 }}>No school membership found</p>
        <p className="text-muted" style={{ margin: 0, marginTop: 6 }}>
          Ask the platform superadmin to assign you to a school.
        </p>
      </div>
    );
  }

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h1 style={{ margin: 0 }}>{schoolName}</h1>
        <p className="text-muted" style={{ margin: 0, marginTop: 6 }}>
          {tagline}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem' }}>
        {[
          { label: 'Total Students', value: '—', detail: 'Active | New | Withdrawn' },
          { label: 'Attendance Today', value: '—', detail: '% Present | % Absent | Late' },
          { label: 'Upcoming Exams', value: '—', detail: 'Next exam date + subjects' },
          { label: 'Results Status', value: '—', detail: 'Draft | Pending | Published' },
          { label: 'Outstanding Fees', value: '—', detail: '₦ Amount | % Collected' },
          { label: 'Staff on Duty', value: '—', detail: 'Present vs Expected' },
        ].map((card) => (
          <div
            key={card.label}
            style={{
              borderRadius: 18,
              border: '1px solid rgba(255,255,255,0.15)',
              padding: '1.25rem',
              background: 'rgba(15,23,42,0.6)',
            }}
          >
            <p className="text-muted" style={{ marginBottom: 4 }}>
              {card.label}
            </p>
            <div style={{ fontSize: '2rem', fontWeight: 600 }}>{card.value}</div>
            <p style={{ color: '#a5f3fc', marginTop: 6 }}>{card.detail}</p>
          </div>
        ))}
      </div>

      <div
        style={{
          borderRadius: 18,
          border: '1px solid rgba(255,255,255,0.12)',
          padding: '1.25rem',
          background: 'rgba(15,23,42,0.65)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
        }}
      >
        <p style={{ margin: 0, fontWeight: 700 }}>Next up</p>
        <p className="text-muted" style={{ margin: 0 }}>
          We’ll progressively add modules: Students, Academics, Exams, Results, Finance, Settings.
        </p>
      </div>
    </section>
  );
}
