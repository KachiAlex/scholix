'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { clearAccessToken, getAccessToken, saveAccessToken } from '@/lib/client-auth';
import { createPlatformTenant, fetchPlatformTenants, type PlatformTenantSummary } from '@/lib/platform-tenants';
import type { ResultTemplatePayload, StudentResultDraftPayload, ResultDraftStatus } from '@/lib/results';
import {
  createResultDraft,
  createResultTemplate,
  duplicateResultTemplate,
  fetchResultDrafts,
  fetchResultTemplates,
  publishResultTemplate,
  updateResultDraft,
  updateResultTemplate,
} from '@/lib/results';

const quickMetrics = [
  { label: 'Active Students', value: '742', trend: '+4.2% WoW' },
  { label: 'CBT Sessions Today', value: '12', trend: '4 live • 8 scheduled' },
  { label: 'Pending Result Reviews', value: '28', trend: 'Needs registrar sign-off' },
];

const roadmapItems = [
  { title: 'Result Engine', detail: 'Map grading bands + weighting templates' },
  { title: 'Attendance Sync', detail: 'Biometrics import → SIS timeline' },
  { title: 'Guardian Portal', detail: 'CBT score releases & transcript requests' },
];

type Mode = 'login' | 'register';

type AuthUser = {
  id: string;
  email: string;
  roles?: string[];
};

export function AuthGateway({ initialMode = 'login' }: { initialMode?: Mode }) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [status, setStatus] = useState<'unauthenticated' | 'loading' | 'authenticated'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [form, setForm] = useState({ email: '', password: '', schoolName: '' });
  const isSuperadmin = !!user?.roles?.includes('SUPERADMIN');

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
    setToken(null);
    setStatus('unauthenticated');
    setError(null);
    setForm({ email: '', password: '', schoolName: '' });
  }, []);

  useEffect(() => {
    const storedToken = getAccessToken();
    if (!storedToken) {
      resetToAuth();
      return;
    }
    setToken(storedToken);

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
      } catch (err) {
        console.warn('AUTH_SESSION_CHECK_FAILED', err);
        clearAccessToken();
        resetToAuth();
      }
    })();

    return () => controller.abort();
  }, [resetToAuth]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy || !canSubmit) return;

    setBusy(true);
    setError(null);

    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const payload =
        mode === 'login'
          ? { email: form.email, password: form.password }
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
      setToken(data.accessToken);
      setUser(data.user);
      setStatus('authenticated');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = () => {
    clearAccessToken();
    resetToAuth();
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

      {status === 'authenticated' && user && token && (
        <>
          <ResultTemplatePanel userEmail={user.email} token={token} onLogout={handleLogout} />
          {isSuperadmin && <PlatformTenantPanel token={token} />}
        </>
      )}
    </div>
  );
}

function PlatformTenantPanel({ token }: { token: string }) {
  const [tenants, setTenants] = useState<PlatformTenantSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [tenantName, setTenantName] = useState('');

  const loadTenants = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await fetchPlatformTenants(token);
      setTenants(data);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Unable to load tenants');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadTenants();
  }, [loadTenants]);

  const handleCreateTenant = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (creating || !tenantName.trim()) return;
    try {
      setCreating(true);
      const tenant = await createPlatformTenant(token, tenantName);
      setTenants((prev) => [tenant, ...prev]);
      setTenantName('');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Unable to create tenant');
    } finally {
      setCreating(false);
    }
  };

  return (
    <section
      style={{
        marginTop: '2rem',
        borderRadius: 20,
        border: '1px solid rgba(255,255,255,0.15)',
        background: 'rgba(15,23,42,0.7)',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p className="text-muted" style={{ marginBottom: 4 }}>
            Superadmin tools
          </p>
          <h3 style={{ margin: 0 }}>Tenant directory</h3>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button type="button" className="pill" style={{ cursor: 'pointer' }} onClick={() => void loadTenants()}>
            Refresh
          </button>
        </div>
      </div>

      <form
        onSubmit={handleCreateTenant}
        style={{
          display: 'flex',
          gap: '0.75rem',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <input
          className="input-field"
          style={{ flex: '1 1 320px' }}
          value={tenantName}
          onChange={(e) => setTenantName(e.target.value)}
          placeholder="New tenant name"
          required
        />
        <button className="gradient-button" type="submit" disabled={creating}>
          {creating ? 'Creating…' : 'Add tenant'}
        </button>
      </form>

      {errorMessage && (
        <p className="form-error" style={{ margin: 0 }}>
          {errorMessage}
        </p>
      )}

      {loading ? (
        <p className="text-muted" style={{ margin: 0 }}>
          Loading tenants…
        </p>
      ) : tenants.length === 0 ? (
        <p className="text-muted" style={{ margin: 0 }}>
          No tenants yet. Use the form above to create the first school workspace.
        </p>
      ) : (
        <div
          style={{
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 18,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr repeat(4, 1fr)',
              gap: '0.5rem',
              padding: '0.75rem 1rem',
              background: 'rgba(15,23,42,0.85)',
              fontWeight: 600,
            }}
          >
            <span>Name</span>
            <span>Members</span>
            <span>Students</span>
            <span>Classes</span>
            <span>Subjects</span>
          </div>
          {tenants.map((tenant, index) => (
            <div
              key={tenant.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr repeat(4, 1fr)',
                gap: '0.5rem',
                padding: '0.75rem 1rem',
                background: index % 2 === 0 ? 'rgba(15,23,42,0.65)' : 'rgba(15,23,42,0.5)',
              }}
            >
              <span>{tenant.name}</span>
              <span>{tenant._count.memberships}</span>
              <span>{tenant._count.students}</span>
              <span>{tenant._count.classes}</span>
              <span>{tenant._count.subjects}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function ResultTemplatePanel({
  userEmail,
  token,
  onLogout,
}: {
  userEmail: string;
  token: string;
  onLogout: () => void;
}) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
        <div>
          <p className="text-muted" style={{ marginBottom: 4 }}>
            Signed in as
          </p>
          <h2 style={{ margin: 0 }}>{userEmail}</h2>
          <p className="text-muted" style={{ marginTop: 4 }}>
            Portal admin
          </p>
        </div>
        <div style={{ flexGrow: 1 }} />
        <button type="button" className="gradient-button" onClick={onLogout}>
          Sign out
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        {quickMetrics.map((metric) => (
          <div
            key={metric.label}
            style={{
              borderRadius: 18,
              border: '1px solid rgba(255,255,255,0.15)',
              padding: '1.25rem',
              background: 'rgba(15,23,42,0.6)',
            }}
          >
            <p className="text-muted" style={{ marginBottom: 4 }}>
              {metric.label}
            </p>
            <div style={{ fontSize: '2rem', fontWeight: 600 }}>{metric.value}</div>
            <p style={{ color: '#a5f3fc', marginTop: 6 }}>{metric.trend}</p>
          </div>
        ))}
      </div>

      <div
        style={{
          borderRadius: 20,
          border: '1px solid rgba(255,255,255,0.15)',
          padding: '1.5rem',
          background: 'rgba(15,23,42,0.75)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p className="text-muted" style={{ marginBottom: 6 }}>
              Result engine
            </p>
            <h3 style={{ margin: 0 }}>Template orchestration</h3>
          </div>
          <span className="pill">Beta</span>
        </div>
        <ResultTemplateManager token={token} />
      </div>
      <div
        style={{
          borderRadius: 20,
          border: '1px solid rgba(255,255,255,0.15)',
          padding: '1.5rem',
          background: 'rgba(15,23,42,0.75)',
        }}
      >
        <ResultDraftManager token={token} />
      </div>
      <div
        style={{
          borderRadius: 18,
          border: '1px solid rgba(255,255,255,0.12)',
          padding: '1.25rem',
          background: 'rgba(15,23,42,0.65)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
        }}
      >
        <p className="text-muted" style={{ margin: 0 }}>
          Ops roadmap
        </p>
        {roadmapItems.map((item) => (
          <div
            key={item.title}
            style={{
              padding: '0.85rem 1rem',
              borderRadius: 14,
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(15,23,42,0.45)',
            }}
          >
            <p style={{ fontWeight: 600, margin: 0 }}>{item.title}</p>
            <p className="text-muted" style={{ margin: 0 }}>
              {item.detail}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ResultTemplateManager({ token }: { token: string }) {
  const [templates, setTemplates] = useState<ResultTemplatePayload[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    weightsJson: '{"continuousAssessment":0.4,"exam":0.6}',
    gradingJson: '{"A":"80-100","B":"70-79","C":"60-69"}',
  });

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await fetchResultTemplates(token);
      setTemplates(data);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Unable to load result templates');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  const replaceTemplate = useCallback((updated: ResultTemplatePayload) => {
    setTemplates((prev) => prev.map((template) => (template.id === updated.id ? updated : template)));
  }, []);

  const handleRename = async (template: ResultTemplatePayload) => {
    const nextName = window.prompt('Rename template', template.name);
    if (nextName === null) return;
    const trimmed = nextName.trim();
    if (!trimmed) {
      alert('Name cannot be empty');
      return;
    }

    try {
      setActionBusyId(template.id);
      setActionError(null);
      const updated = await updateResultTemplate(token, template.id, { name: trimmed });
      replaceTemplate(updated);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to rename template');
    } finally {
      setActionBusyId(null);
    }
  };

  const handleDuplicateTemplate = async (template: ResultTemplatePayload) => {
    try {
      setActionBusyId(template.id);
      setActionError(null);
      const copy = await duplicateResultTemplate(token, template);
      setTemplates((prev) => [copy, ...prev]);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to duplicate template');
    } finally {
      setActionBusyId(null);
    }
  };

  const handlePublishToggle = async (template: ResultTemplatePayload) => {
    try {
      setActionBusyId(template.id);
      setActionError(null);
      const updated = await publishResultTemplate(token, template.id, !template.publishedAt);
      replaceTemplate(updated);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to update publish state');
    } finally {
      setActionBusyId(null);
    }
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    setFormError(null);

    const trimmedName = form.name.trim();
    if (!trimmedName) {
      setFormError('Name is required');
      return;
    }

    try {
      setSubmitting(true);
      const weights = parseJsonObject<Record<string, number>>(form.weightsJson, 'weights');
      const gradingBands = parseJsonObject<Record<string, unknown>>(form.gradingJson, 'grading bands');

      const created = await createResultTemplate(token, {
        name: trimmedName,
        weights,
        gradingBands,
      });

      setTemplates((prev) => [created, ...prev]);
      setForm({
        name: '',
        weightsJson: form.weightsJson,
        gradingJson: form.gradingJson,
      });
      setFormOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to create template');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
        <div>
          <h4 style={{ margin: 0 }}>Result Templates</h4>
          <p className="text-muted" style={{ margin: 0 }}>
            Configure grading weights & bands
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button type="button" className="pill" style={{ cursor: 'pointer' }} onClick={() => void loadTemplates()}>
            Refresh
          </button>
          <button type="button" className="gradient-button" onClick={() => setFormOpen((prev) => !prev)}>
            {formOpen ? 'Close form' : 'New template'}
          </button>
        </div>
      </div>

      {formOpen && (
        <form
          onSubmit={handleCreate}
          style={{
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 18,
            padding: '1rem',
            display: 'grid',
            gap: '0.75rem',
            background: 'rgba(15,23,42,0.5)',
          }}
        >
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span>Name</span>
            <input
              className='input-field'
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder='Mid-Term weighting'
              required
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span>Weights JSON</span>
            <textarea
              className='input-field'
              style={{ minHeight: 80, fontFamily: 'monospace' }}
              value={form.weightsJson}
              onChange={(e) => setForm((prev) => ({ ...prev, weightsJson: e.target.value }))}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span>Grading bands JSON</span>
            <textarea
              className='input-field'
              style={{ minHeight: 80, fontFamily: 'monospace' }}
              value={form.gradingJson}
              onChange={(e) => setForm((prev) => ({ ...prev, gradingJson: e.target.value }))}
            />
          </label>
          {formError && <p className='form-error'>{formError}</p>}
          <button className='gradient-button' type='submit' disabled={submitting}>
            {submitting ? 'Creating…' : 'Create template'}
          </button>
        </form>
      )}

      <div
        style={{
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 20,
          padding: '1.25rem',
          background: 'rgba(15,23,42,0.65)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        {loading && <p className='text-muted'>Loading templates…</p>}
        {errorMessage && (
          <p className='form-error' style={{ margin: 0 }}>
            {errorMessage}
          </p>
        )}
        {!loading && !errorMessage && templates.length === 0 && (
          <p className='text-muted' style={{ margin: 0 }}>
            No templates yet. Create one to define weighting logic.
          </p>
        )}
        {actionError && (
          <p className='form-error' style={{ margin: 0 }}>
            {actionError}
          </p>
        )}

        {templates.map((template) => (
          <div
            key={template.id}
            style={{
              padding: '1rem',
              borderRadius: 16,
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(15,23,42,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <p style={{ margin: 0, fontWeight: 600 }}>{template.name}</p>
                <span className='pill' style={{ background: template.publishedAt ? 'rgba(34,197,94,0.18)' : 'rgba(248,250,252,0.1)' }}>
                  {template.publishedAt ? 'Published' : 'Draft'}
                </span>
              </div>
              <p className='text-muted' style={{ margin: 0 }}>
                Updated {new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(template.updatedAt))}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', fontSize: '0.85rem' }}>
                {Object.entries(template.weights).map(([label, value]) => (
                  <span key={label} className='pill'>
                    {label}: {(value * 100).toFixed(0)}%
                  </span>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type='button'
                className='pill'
                style={{ cursor: 'pointer' }}
                disabled={actionBusyId === template.id}
                onClick={() => handleDuplicateTemplate(template)}
              >
                Duplicate
              </button>
              <button
                type='button'
                className='pill'
                style={{ cursor: 'pointer' }}
                disabled={actionBusyId === template.id}
                onClick={() => handleRename(template)}
              >
                Rename
              </button>
              <button
                type='button'
                className='pill'
                style={{ cursor: 'pointer' }}
                disabled={actionBusyId === template.id}
                onClick={() => handlePublishToggle(template)}
              >
                {template.publishedAt ? 'Unpublish' : 'Publish'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const draftStatusOrder: ResultDraftStatus[] = ['DRAFT', 'LOCKED', 'PUBLISHED'];

function ResultDraftManager({ token }: { token: string }) {
  const [drafts, setDrafts] = useState<StudentResultDraftPayload[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [updatingDraftId, setUpdatingDraftId] = useState<string | null>(null);
  const [commentEdits, setCommentEdits] = useState<Record<string, string>>({});
  const [payloadEdits, setPayloadEdits] = useState<Record<string, string>>({});
  const updateCommentDraft = useCallback(
    (draftId: string, value: string) => {
      setCommentEdits((prev) => ({ ...prev, [draftId]: value }));
    },
    [setCommentEdits],
  );
  const updatePayloadDraft = useCallback(
    (draftId: string, value: string) => {
      setPayloadEdits((prev) => ({ ...prev, [draftId]: value }));
    },
    [setPayloadEdits],
  );
  const [form, setForm] = useState({
    studentId: '',
    templateId: '',
    sessionId: '',
    termId: '',
    payloadJson: '{"subjects":[{"name":"Mathematics","score":94}]}',
    comments: '',
  });

  const loadDrafts = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await fetchResultDrafts(token);
      setDrafts(data);
      setCommentEdits(Object.fromEntries(data.map((draft) => [draft.id, draft.comments ?? ''])));
      setPayloadEdits(Object.fromEntries(data.map((draft) => [draft.id, JSON.stringify(draft.payload, null, 2)])));
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Unable to load result drafts');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadDrafts();
  }, [loadDrafts]);

  const replaceDraft = useCallback((updated: StudentResultDraftPayload) => {
    setDrafts((prev) => prev.map((draft) => (draft.id === updated.id ? updated : draft)));
    setCommentEdits((prev) => ({ ...prev, [updated.id]: updated.comments ?? '' }));
    setPayloadEdits((prev) => ({ ...prev, [updated.id]: JSON.stringify(updated.payload, null, 2) }));
  }, []);

  const handleCreateDraft = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    const trimmedStudentId = form.studentId.trim();
    if (!trimmedStudentId) {
      setFormError('Student ID is required');
      return;
    }

    try {
      setSubmitting(true);
      setFormError(null);

      const payload = parseJsonObject<Record<string, unknown>>(form.payloadJson, 'payload');

      const created = await createResultDraft(token, {
        studentId: trimmedStudentId,
        templateId: form.templateId.trim() || undefined,
        sessionId: form.sessionId.trim() || undefined,
        termId: form.termId.trim() || undefined,
        payload,
        comments: form.comments.trim() || undefined,
      });

      setDrafts((prev) => [created, ...prev]);
      setCommentEdits((prev) => ({ ...prev, [created.id]: created.comments ?? '' }));
      setPayloadEdits((prev) => ({ ...prev, [created.id]: JSON.stringify(created.payload, null, 2) }));
      setForm((prev) => ({
        ...prev,
        studentId: '',
        comments: '',
      }));
      setFormOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to create draft');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (draftId: string, status: ResultDraftStatus) => {
    try {
      setUpdatingDraftId(draftId);
      const updated = await updateResultDraft(token, draftId, { status });
      replaceDraft(updated);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Unable to update status');
    } finally {
      setUpdatingDraftId(null);
    }
  };

  const handleSaveComment = async (draft: StudentResultDraftPayload) => {
    const comment = commentEdits[draft.id] ?? '';

    try {
      setUpdatingDraftId(draft.id);
      setSaveError(null);
      const updated = await updateResultDraft(token, draft.id, { comments: comment.trim() || null });
      replaceDraft(updated);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Unable to update comment');
    } finally {
      setUpdatingDraftId(null);
    }
  };

  const handleSavePayload = async (draft: StudentResultDraftPayload) => {
    const raw = payloadEdits[draft.id] ?? '{}';
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(raw);
    } catch {
      setSaveError('Payload JSON is invalid');
      return;
    }

    try {
      setUpdatingDraftId(draft.id);
      setSaveError(null);
      const updated = await updateResultDraft(token, draft.id, { payload: parsed });
      replaceDraft(updated);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Unable to update payload');
    } finally {
      setUpdatingDraftId(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
        <div>
          <h4 style={{ margin: 0 }}>Student Result Drafts</h4>
          <p className="text-muted" style={{ margin: 0 }}>
            Track grading progress per student
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button type="button" className="pill" style={{ cursor: 'pointer' }} onClick={() => void loadDrafts()}>
            Refresh
          </button>
          <button type="button" className="gradient-button" onClick={() => setFormOpen((prev) => !prev)}>
            {formOpen ? 'Close form' : 'Add draft'}
          </button>
        </div>
      </div>

      {formOpen && (
        <form
          onSubmit={handleCreateDraft}
          style={{
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 20,
            padding: '1rem',
            background: 'rgba(15,23,42,0.6)',
            display: 'grid',
            gap: '0.75rem',
          }}
        >
          <div style={{ display: 'grid', gap: '0.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span>Student ID</span>
              <input
                className="input-field"
                value={form.studentId}
                onChange={(e) => setForm((prev) => ({ ...prev, studentId: e.target.value }))}
                placeholder="stud_123"
                required
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span>Template ID (optional)</span>
              <input
                className="input-field"
                value={form.templateId}
                onChange={(e) => setForm((prev) => ({ ...prev, templateId: e.target.value }))}
                placeholder="tmpl_123"
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span>Session ID (optional)</span>
              <input
                className="input-field"
                value={form.sessionId}
                onChange={(e) => setForm((prev) => ({ ...prev, sessionId: e.target.value }))}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span>Term ID (optional)</span>
              <input
                className="input-field"
                value={form.termId}
                onChange={(e) => setForm((prev) => ({ ...prev, termId: e.target.value }))}
              />
            </label>
          </div>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span>Payload JSON</span>
            <textarea
              className="input-field"
              style={{ minHeight: 80, fontFamily: 'monospace' }}
              value={form.payloadJson}
              onChange={(e) => setForm((prev) => ({ ...prev, payloadJson: e.target.value }))}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span>Registrar comments (optional)</span>
            <textarea
              className="input-field"
              style={{ minHeight: 60 }}
              value={form.comments}
              onChange={(e) => setForm((prev) => ({ ...prev, comments: e.target.value }))}
            />
          </label>
          {formError && <p className="form-error">{formError}</p>}
          <button className="gradient-button" type="submit" disabled={submitting}>
            {submitting ? 'Saving draft…' : 'Save draft'}
          </button>
        </form>
      )}

      <div
        style={{
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 20,
          padding: '1.25rem',
          background: 'rgba(15,23,42,0.65)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        {loading && <p className="text-muted">Loading drafts…</p>}
        {errorMessage && (
          <p className="form-error" style={{ margin: 0 }}>
            {errorMessage}
          </p>
        )}
        {saveError && (
          <p className="form-error" style={{ margin: 0 }}>
            {saveError}
          </p>
        )}
        {!loading && !errorMessage && drafts.length === 0 && (
          <p className="text-muted" style={{ margin: 0 }}>
            No drafts captured for this school yet.
          </p>
        )}

        {drafts.map((draft) => (
          <div
            key={draft.id}
            style={{
              padding: '1rem',
              borderRadius: 16,
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(15,23,42,0.5)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <p style={{ margin: 0, fontWeight: 600 }}>
                  {draft.student.firstName} {draft.student.lastName}
                </p>
                <p className="text-muted" style={{ margin: 0 }}>
                  {draft.student.studentNo || draft.student.id} · {draft.session.name}
                  {draft.term ? ` • ${draft.term.name}` : ''}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <span className="pill">{draft.template?.name || 'Custom payload'}</span>
                <span className="pill" style={{ background: 'rgba(59,130,246,0.2)' }}>
                  Status: {draft.status}
                </span>
              </div>
            </div>
            <p className="text-muted" style={{ margin: 0 }}>
              Updated {new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(draft.updatedAt))}
            </p>
            {draft.comments && (
              <p style={{ margin: 0, color: '#c4fff9' }}>
                “{draft.comments}”
              </p>
            )}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <div style={{ flexBasis: '100%', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span className="text-muted">Registrar comment</span>
                  <textarea
                    className="input-field"
                    style={{ minHeight: 60 }}
                    value={commentEdits[draft.id] ?? ''}
                    onChange={(e) => updateCommentDraft(draft.id, e.target.value)}
                  />
                </label>
                <button
                  type="button"
                  className="pill"
                  style={{ alignSelf: 'flex-start', cursor: 'pointer' }}
                  disabled={updatingDraftId === draft.id}
                  onClick={() => handleSaveComment(draft)}
                >
                  Save comment
                </button>
              </div>
              <div style={{ flexBasis: '100%', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span className="text-muted">Payload JSON</span>
                  <textarea
                    className="input-field"
                    style={{ minHeight: 100, fontFamily: 'monospace' }}
                    value={payloadEdits[draft.id] ?? '{}'}
                    onChange={(e) => updatePayloadDraft(draft.id, e.target.value)}
                  />
                </label>
                <button
                  type="button"
                  className="pill"
                  style={{ alignSelf: 'flex-start', cursor: 'pointer' }}
                  disabled={updatingDraftId === draft.id}
                  onClick={() => handleSavePayload(draft)}
                >
                  Save payload
                </button>
              </div>
              {draftStatusOrder.map((status) => (
                <button
                  key={status}
                  type="button"
                  className="pill"
                  style={{
                    cursor: 'pointer',
                    opacity: draft.status === status ? 0.6 : 1,
                  }}
                  disabled={draft.status === status || updatingDraftId === draft.id}
                  onClick={() => handleStatusChange(draft.id, status)}
                >
                  Mark {status.toLowerCase()}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function parseJsonObject<T extends Record<string, unknown>>(value: string, label: string): T {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error(`Invalid ${label} JSON`);
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`${label} must be a JSON object`);
  }

  return parsed as T;
}
