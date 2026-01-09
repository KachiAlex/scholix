export default function HomePage() {
  return (
    <main style={{ minHeight: '100vh' }}>
      <div style={{ padding: '2.5rem clamp(1.5rem, 5vw, 5rem) 4rem' }}>
        <header style={{ maxWidth: 1240, margin: '0 auto', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className="pill">Scholix</div>
          <div style={{ flexGrow: 1 }} />
          <a className="pill" href="/signin" style={{ cursor: 'pointer' }}>
            Sign in
          </a>
          <a className="gradient-button" href="/signup" style={{ display: 'inline-flex', alignItems: 'center' }}>
            Create account
          </a>
        </header>

        <section
          style={{
            maxWidth: 1240,
            margin: '3.5rem auto 0',
            display: 'grid',
            gap: '2.5rem',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
            <div className="pill" style={{ width: 'fit-content' }}>
              Unified School OS · SIS · CBT · Results
            </div>
            <div>
              <h1 style={{ fontSize: 'clamp(3rem, 5.5vw, 4.6rem)', lineHeight: 1.05, marginBottom: '1rem' }}>
                Run your school like a modern institution.
              </h1>
              <p className="text-muted" style={{ fontSize: '1.1rem', lineHeight: 1.9, maxWidth: 560, margin: 0 }}>
                Scholix brings student information, secure CBT, and result workflows into one deliberate portal—built for
                school leaders, registrars, exam officers, and guardians.
              </p>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.9rem' }}>
              <a className="gradient-button" href="/signin" style={{ display: 'inline-flex', alignItems: 'center' }}>
                Sign in to your portal
              </a>
              <a className="pill" href="/signup" style={{ cursor: 'pointer' }}>
                Create a new school workspace
              </a>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1rem' }}>
              {[
                { label: 'CBT autosave', value: 'Instant persistence' },
                { label: 'Academic context', value: 'Sessions & terms' },
                { label: 'Audit-ready', value: 'Role-based access' },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    padding: '1.1rem 1.2rem',
                    borderRadius: 18,
                    border: '1px solid rgba(255,255,255,0.14)',
                    background: 'rgba(15,23,42,0.55)',
                  }}
                >
                  <p className="text-muted" style={{ margin: 0 }}>
                    {item.label}
                  </p>
                  <strong style={{ fontSize: '1.15rem' }}>{item.value}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card" style={{ padding: '2.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.9rem' }}>Everything leaders need, in one cockpit</h2>
              <p className="text-muted" style={{ marginTop: '0.75rem', lineHeight: 1.8 }}>
                Configure classes, subjects, sessions, and exams. Start CBT attempts with autosave. Publish results using
                templates.
              </p>
            </div>
            <div style={{ display: 'grid', gap: '0.85rem' }}>
              {[
                { title: 'SIS Controls', detail: 'Enroll students, manage classes & subjects, lock active sessions.' },
                { title: 'Secure CBT', detail: 'Question banks, timed exams, attempts, autosave answers.' },
                { title: 'Results (coming)', detail: 'Weighted grading, broadsheets, transcripts, approvals.' },
              ].map((feature) => (
                <div
                  key={feature.title}
                  style={{
                    padding: '1rem 1.1rem',
                    borderRadius: 18,
                    border: '1px solid rgba(255,255,255,0.12)',
                    background: 'rgba(15,23,42,0.65)',
                  }}
                >
                  <p style={{ margin: 0, fontWeight: 650 }}>{feature.title}</p>
                  <p className="text-muted" style={{ margin: 0, marginTop: 6, lineHeight: 1.6 }}>
                    {feature.detail}
                  </p>
                </div>
              ))}
            </div>
            <div className="pill" style={{ justifyContent: 'space-between' }}>
              <span>API status</span>
              <strong style={{ color: '#86efac' }}>Healthy</strong>
            </div>
            <code style={{ fontSize: '0.95rem', opacity: 0.9 }}>GET /api/health</code>
          </div>
        </section>

        <section style={{ maxWidth: 1240, margin: '4rem auto 0' }}>
          <div style={{ display: 'grid', gap: '1.25rem', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
            {[
              {
                title: 'For Proprietors',
                detail: 'Get dashboards across campuses, term cycles, and exam readiness at a glance.',
              },
              {
                title: 'For Registrars',
                detail: 'Maintain clean student records, enforce context, and reconcile changes with clarity.',
              },
              {
                title: 'For Exam Officers',
                detail: 'Schedule exams, monitor attempts, and retrieve submissions without manual spreadsheets.',
              },
              {
                title: 'For Guardians',
                detail: 'Upcoming: view results, attendance snapshots, and transcript requests from one portal.',
              },
            ].map((card) => (
              <div key={card.title} className="glass-card" style={{ padding: '1.6rem' }}>
                <h3 style={{ marginTop: 0, marginBottom: '0.6rem' }}>{card.title}</h3>
                <p className="text-muted" style={{ margin: 0, lineHeight: 1.8 }}>
                  {card.detail}
                </p>
              </div>
            ))}
          </div>
        </section>

        <footer style={{ maxWidth: 1240, margin: '4.5rem auto 0', paddingBottom: '2rem' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
            <p className="text-muted" style={{ margin: 0 }}>
              © {new Date().getFullYear()} Scholix. Built for modern academies.
            </p>
            <div style={{ flexGrow: 1 }} />
            <a className="pill" href="/portal" style={{ cursor: 'pointer' }}>
              Access portal
            </a>
          </div>
        </footer>
      </div>
    </main>
  );
}
