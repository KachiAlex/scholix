import Image from 'next/image';
import { listPlatformPlans } from '@/lib/platform-plans-server';

export const dynamic = 'force-dynamic';

function formatPrice(currency: string, amount: number) {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

export default async function HomePage() {
  const containerPadding = '2.5rem clamp(1.5rem, 5vw, 5rem) 4.5rem';
  const plans = await listPlatformPlans().catch(() => []);

  return (
    <main style={{ minHeight: '100vh' }}>
      <div style={{ padding: containerPadding }}>
        <header className="page-container page-header">
          <div className="pill">Scholix</div>
          <div className="page-spacer" />
          <a className="pill" href="/signin" style={{ cursor: 'pointer' }}>
            Sign in
          </a>
          <a className="gradient-button" href="/signup" style={{ display: 'inline-flex', alignItems: 'center' }}>
            Create account
          </a>
        </header>

        <section className="hero-section grid-two">
          <div className="stack">
            <div className="pill" style={{ width: 'fit-content' }}>
              Unified School OS · SIS · CBT · Results
            </div>
            <div>
              <h1 style={{ fontSize: 'clamp(2.9rem, 5.2vw, 4.7rem)', lineHeight: 1.04, marginBottom: '1rem' }}>
                A modern portal for African schools.
              </h1>
              <p className="text-muted" style={{ fontSize: '1.1rem', lineHeight: 1.95, maxWidth: 620, margin: 0 }}>
                Scholix helps you run admissions, student records, CBT exams, and result workflows with speed, clarity, and
                accountability—so your staff can focus on teaching and student outcomes.
              </p>
            </div>

            <div className="cta-row">
              <a className="gradient-button" href="/signin" style={{ display: 'inline-flex', alignItems: 'center' }}>
                Access your portal
              </a>
              <a className="pill" href="/signup" style={{ cursor: 'pointer' }}>
                Create a school workspace
              </a>
            </div>

            <div className="feature-tiles">
              {[
                { label: 'Fast onboarding', value: 'Classes & students in minutes' },
                { label: 'Secure CBT', value: 'Timed exams + autosave' },
                { label: 'Role-based access', value: 'Audit-ready workflows' },
              ].map((item) => (
                <div key={item.label} className="tile">
                  <p className="text-muted" style={{ margin: 0 }}>
                    {item.label}
                  </p>
                  <strong style={{ fontSize: '1.05rem' }}>{item.value}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="image-mosaic">
            <div
              className="glass-card image-card image-card-rel"
              style={{
                gridColumn: 'span 4',
                minHeight: 360,
              }}
            >
              <Image
                alt="African students learning together"
                fill
                priority
                sizes="(max-width: 900px) 100vw, 60vw"
                src="https://images.unsplash.com/photo-1529390079861-591de354faf5?auto=format&fit=crop&w=1600&q=80"
                style={{ objectFit: 'cover' }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background:
                    'linear-gradient(140deg, rgba(2,6,23,0.75) 0%, rgba(2,6,23,0.35) 40%, rgba(2,6,23,0.78) 100%)',
                }}
              />
              <div style={{ position: 'absolute', inset: 0, padding: '1.5rem', display: 'flex', alignItems: 'flex-end' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: 520 }}>
                  <div className="pill" style={{ width: 'fit-content' }}>
                    Built for local realities
                  </div>
                  <p style={{ margin: 0, fontWeight: 650, fontSize: '1.2rem', lineHeight: 1.4 }}>
                    Run registration, exams, and reporting without spreadsheets, paper trails, or guesswork.
                  </p>
                </div>
              </div>
            </div>

            <div className="glass-card image-card" style={{ gridColumn: 'span 2', minHeight: 170 }}>
              <div className="image-card-rel" style={{ width: '100%', height: '100%' }}>
                <Image
                  alt="African pupil in class"
                  fill
                  sizes="(max-width: 900px) 100vw, 33vw"
                  src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=900&q=80"
                  style={{ objectFit: 'cover' }}
                />
              </div>
            </div>

            <div className="glass-card" style={{ gridColumn: 'span 2', padding: '1.35rem', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              <div className="pill" style={{ justifyContent: 'space-between' }}>
                <span>API status</span>
                <strong style={{ color: '#86efac' }}>Healthy</strong>
              </div>
              <div>
                <p style={{ margin: 0, fontWeight: 650, fontSize: '1.1rem' }}>One cockpit, many workflows</p>
                <p className="text-muted" style={{ margin: 0, marginTop: 8, lineHeight: 1.7 }}>
                  Keep SIS, CBT, and results aligned by session and term—with clean permissions and traceable changes.
                </p>
              </div>
              <code style={{ fontSize: '0.95rem', opacity: 0.9 }}>GET /api/health</code>
            </div>

            <div className="glass-card image-card" style={{ gridColumn: 'span 4', minHeight: 200 }}>
              <div className="image-card-rel" style={{ width: '100%', height: '100%' }}>
                <Image
                  alt="African students collaborating"
                  fill
                  sizes="(max-width: 900px) 100vw, 60vw"
                  src="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1400&q=80"
                  style={{ objectFit: 'cover' }}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="grid-cards-wide">
            <div>
              <h2 className="section-title" style={{ marginTop: 0 }}>
                What Scholix does
              </h2>
              <p className="section-subtitle" style={{ maxWidth: 560 }}>
                A school management solution that replaces fragmented tools with a single, secure system.
              </p>
              <div style={{ display: 'grid', gap: '0.9rem' }}>
                {[
                  { title: 'Student Information System (SIS)', detail: 'Enroll students, manage classes, subjects, sessions, and terms.' },
                  { title: 'Computer Based Testing (CBT)', detail: 'Create exams, set timers, autosave attempts, and track submissions.' },
                  { title: 'Results workflow', detail: 'Prepare templates, publish with approvals, and keep grading consistent across classes.' },
                ].map((feature) => (
                  <div
                    key={feature.title}
                    style={{
                      padding: '1rem 1.1rem',
                      borderRadius: 18,
                      border: '1px solid rgba(255,255,255,0.12)',
                      background: 'rgba(15,23,42,0.6)',
                    }}
                  >
                    <p style={{ margin: 0, fontWeight: 650 }}>{feature.title}</p>
                    <p className="text-muted" style={{ margin: 0, marginTop: 6, lineHeight: 1.6 }}>
                      {feature.detail}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.55rem' }}>From chaos to clarity</h3>
              <p className="text-muted" style={{ margin: 0, lineHeight: 1.85 }}>
                Stop chasing spreadsheets, WhatsApp lists, and duplicated entries. Scholix keeps your academic context
                consistent so student records and exam data always match the right session, term, class, and subject.
              </p>
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {[
                  { label: 'Data integrity', value: 'One source of truth' },
                  { label: 'Operational speed', value: 'Less admin overhead' },
                  { label: 'Trust', value: 'Transparent actions & access' },
                ].map((stat) => (
                  <div key={stat.label} className="pill" style={{ justifyContent: 'space-between' }}>
                    <span style={{ opacity: 0.85 }}>{stat.label}</span>
                    <strong>{stat.value}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="section">
          <h2 className="section-title" style={{ marginTop: 0 }}>
            How it works
          </h2>
          <p className="section-subtitle" style={{ maxWidth: 720 }}>
            Set up once, then run every term with the same clean process.
          </p>
          <div className="grid-cards">
            {[
              { step: '01', title: 'Create your workspace', detail: 'Add school profile, campuses, sessions, and terms.' },
              { step: '02', title: 'Organize academics', detail: 'Define classes, subjects, and student enrollment.' },
              { step: '03', title: 'Run CBT securely', detail: 'Publish exams, track attempts, and keep answers safe with autosave.' },
              { step: '04', title: 'Compile and publish results', detail: 'Use templates, approvals, and consistent grading rules.' },
            ].map((item) => (
              <div key={item.step} className="glass-card" style={{ padding: '1.6rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div className="pill" style={{ width: 'fit-content' }}>
                  Step {item.step}
                </div>
                <h3 style={{ margin: 0 }}>{item.title}</h3>
                <p className="text-muted" style={{ margin: 0, lineHeight: 1.8 }}>
                  {item.detail}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="section">
          <h2 className="section-title" style={{ marginTop: 0 }}>
            Built for every role
          </h2>
          <p className="section-subtitle" style={{ maxWidth: 760 }}>
            A shared system with tailored experiences for leadership, admin, and guardians.
          </p>
          <div className="grid-cards">
            {[
              {
                title: 'For Proprietors',
                detail: 'Dashboards across terms and campuses; visibility into exam readiness, performance, and operations.',
              },
              {
                title: 'For Registrars',
                detail: 'Clean student data, controlled edits, and consistent academic context across the entire school.',
              },
              {
                title: 'For Exam Officers',
                detail: 'Schedule CBT exams, monitor attempts, and retrieve submissions without spreadsheet chaos.',
              },
              {
                title: 'For Teachers',
                detail: 'Structured class lists, subject mapping, and streamlined assessment workflows per term.',
              },
              {
                title: 'For Guardians',
                detail: 'Upcoming: view results, request transcripts, and stay informed from one portal.',
              },
              {
                title: 'For Students',
                detail: 'A focused CBT exam experience that reduces mistakes with autosave and clear timing.',
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

        <section className="section">
          <div className="section-intro">
            <div>
              <h2 className="section-title" style={{ marginTop: 0 }}>
                Pricing built for African schools
              </h2>
              <p className="section-subtitle" style={{ maxWidth: 720 }}>
                Superadmin updates flow straight to these plans. Seat-based pricing keeps things predictable while discounts
                help large teams modernize faster.
              </p>
            </div>
            <a className="pill" href="/portal" style={{ cursor: 'pointer' }}>
              Manage plans in portal
            </a>
          </div>

          {plans.length === 0 ? (
            <div className="glass-card" style={{ padding: '1.75rem' }}>
              <p style={{ margin: 0, fontWeight: 600 }}>Plans syncing</p>
              <p className="text-muted" style={{ margin: 0, marginTop: 6 }}>
                Pricing updates are in progress. Check back shortly or configure plans from the superadmin portal.
              </p>
            </div>
          ) : (
            <div className="grid-cards" style={{ gap: '1.25rem' }}>
              {plans.map((plan) => (
                <div
                  key={plan.slug}
                  className="glass-card"
                  style={{
                    padding: '1.75rem',
                    border: plan.isFeatured ? '1px solid rgba(248, 250, 252, 0.8)' : '1px solid rgba(255,255,255,0.08)',
                    background: plan.isFeatured ? 'linear-gradient(135deg, rgba(147,197,253,0.2), rgba(14,165,233,0.15))' : undefined,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1.1rem',
                    position: 'relative',
                  }}
                >
                  {plan.isFeatured && (
                    <span
                      className="pill"
                      style={{
                        position: 'absolute',
                        top: 16,
                        right: 16,
                        background: 'rgba(14,165,233,0.2)',
                        borderColor: 'rgba(125, 211, 252, 0.6)',
                      }}
                    >
                      Featured
                    </span>
                  )}
                  <div>
                    <p style={{ margin: 0, fontSize: '1.35rem', fontWeight: 650 }}>{plan.name}</p>
                    {plan.description && (
                      <p className="text-muted" style={{ margin: 0, marginTop: 6, lineHeight: 1.7 }}>
                        {plan.description}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-muted" style={{ margin: 0 }}>Starting at</p>
                    <p style={{ margin: '0.2rem 0 0', fontSize: '2rem', fontWeight: 650 }}>
                      {formatPrice(plan.currency, plan.seatPrice)}{' '}
                      <span style={{ fontSize: '1rem', fontWeight: 500, opacity: 0.8 }}>/ {plan.billingInterval}</span>
                    </p>
                    <p className="text-muted" style={{ margin: '0.35rem 0 0', fontSize: '0.95rem' }}>
                      Minimum {plan.minSeats.toLocaleString()} seats
                    </p>
                    {(plan.discountPercent !== null || plan.discountLabel) && (
                      <p
                        className="pill"
                        style={{
                          width: 'fit-content',
                          marginTop: '0.65rem',
                          borderColor: 'rgba(74,222,128,0.4)',
                          color: '#86efac',
                        }}
                      >
                        {plan.discountLabel || `${plan.discountPercent}% discount`}
                      </p>
                    )}
                  </div>
                  {plan.features.length > 0 && (
                    <ul style={{ margin: 0, paddingLeft: '1.2rem', display: 'grid', gap: '0.35rem' }}>
                      {plan.features.map((feature) => (
                        <li key={feature} style={{ lineHeight: 1.6 }}>{feature}</li>
                      ))}
                    </ul>
                  )}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem', marginTop: 'auto' }}>
                    <a className="gradient-button" href="/signup" style={{ display: 'inline-flex', alignItems: 'center' }}>
                      Choose {plan.name}
                    </a>
                    <a className="pill" href="/signin" style={{ cursor: 'pointer' }}>
                      Explore portal
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="section">
          <div className="glass-card cta-card" style={{ padding: '2.25rem' }}>
            <div>
              <h2 style={{ marginTop: 0, fontSize: 'clamp(1.9rem, 2.6vw, 2.4rem)', marginBottom: '0.75rem' }}>
                Ready to modernize your school operations?
              </h2>
              <p className="text-muted" style={{ margin: 0, lineHeight: 1.9, maxWidth: 560 }}>
                Create a workspace, invite your staff, and start your next term with structure. Scholix keeps your records
                clean and your assessments secure.
              </p>
            </div>
            <div className="cta-actions">
              <a className="gradient-button" href="/signup" style={{ display: 'inline-flex', alignItems: 'center' }}>
                Get started
              </a>
              <a className="pill" href="/signin" style={{ cursor: 'pointer' }}>
                Sign in
              </a>
              <a className="pill" href="/portal" style={{ cursor: 'pointer' }}>
                Open portal
              </a>
            </div>
          </div>
        </section>

        <footer className="footer">
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
