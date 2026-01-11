'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { clearAccessToken, getAccessToken, saveAccessToken } from '@/lib/client-auth';
import {
  createTenantAdmin,
  createPlatformTenant,
  deletePlatformTenant,
  fetchTenantAdmins,
  fetchPlatformTenants,
  removeTenantAdmin,
  resetTenantAdminPassword,
  suspendPlatformTenant,
  updatePlatformTenant,
  type TenantAdminSummary,
  type PlatformTenantSummary,
} from '@/lib/platform-tenants';

type PortalContext = {
  userId: string;
  email: string;
  school: { id: string; name: string } | null;
  tenantRole: string | null;
  systemRoles: string[];
};

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
  const [form, setForm] = useState({ email: '', password: '', schoolName: '', setupKey: '' });
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
    setForm({ email: '', password: '', schoolName: '', setupKey: '' });
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
      )
    }

    {status === 'authenticated' && user && token && (
      isSuperadmin ? (
        <SuperadminPanel user={user} token={token} onLogout={handleLogout} />
      ) : (
        <TenantDashboardPanel user={user} token={token} onLogout={handleLogout} />
      )
    )}
  </div>
);
}

function SuperadminPanel({ user, token, onLogout }: { user: AuthUser; token: string; onLogout: () => void }) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
        <div>
          <p className="text-muted" style={{ marginBottom: 4 }}>
            Signed in as
          </p>
          <h2 style={{ margin: 0 }}>{user.email}</h2>
          <p className="text-muted" style={{ marginTop: 4 }}>
            Superadmin
          </p>
        </div>
        <div style={{ flexGrow: 1 }} />
        <button type="button" className="gradient-button" onClick={onLogout}>
          Sign out
        </button>
      </div>

      <div
        style={{
          borderRadius: 20,
          border: '1px solid rgba(255,255,255,0.12)',
          padding: '1.5rem',
          background: 'rgba(15,23,42,0.65)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <p className="text-muted" style={{ marginBottom: 4 }}>
              Platform command center
            </p>
            <h3 style={{ margin: 0 }}>Tenant governance</h3>
          </div>
          <span className="pill">SUPERADMIN</span>
        </div>
        <p className="text-muted" style={{ margin: 0 }}>
          Review every workspace, adjust license envelopes, and take action when compliance flags pop up.
        </p>
      </div>

      <PlatformTenantPanel token={token} />
    </section>
  );
}

function TenantDashboardPanel({
  user,
  token,
  onLogout,
}: {
  user: AuthUser;
  token: string;
  onLogout: () => void;
}) {
  const [context, setContext] = useState<PortalContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [term, setTerm] = useState('Term 1');

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const res = await fetch('/api/portal/context', {
          signal: controller.signal,
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({ message: 'Unable to load portal context' }));
          throw new Error(body.message || 'Unable to load portal context');
        }

        const data = (await res.json()) as PortalContext;
        setContext(data);
      } catch (err) {
        if (controller.signal.aborted) return;
        setLoadError(err instanceof Error ? err.message : 'Unable to load portal context');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [token]);

  const schoolName = context?.school?.name ?? 'School dashboard';

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
        <div>
          <p className="text-muted" style={{ marginBottom: 4 }}>
            Signed in as
          </p>
          <h2 style={{ margin: 0 }}>{user.email}</h2>
          <p className="text-muted" style={{ marginTop: 4 }}>{schoolName}</p>
        </div>
        <div style={{ flexGrow: 1 }} />

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <label className="pill" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ opacity: 0.85 }}>Term</span>
            <select
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'inherit',
                fontWeight: 600,
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="Term 1">Term 1</option>
              <option value="Term 2">Term 2</option>
              <option value="Term 3">Term 3</option>
            </select>
          </label>
          <button type="button" className="gradient-button" onClick={onLogout}>
            Sign out
          </button>
        </div>
      </div>

      {loading && <p className="text-muted">Loading school dashboard…</p>}
      {loadError && <p className="form-error">{loadError}</p>}

      {!loading && !loadError && (
        <>
          {!context?.school ? (
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
          ) : (
            <>
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
                <p style={{ margin: 0, fontWeight: 700 }}>Academic Performance Overview</p>
                <p className="text-muted" style={{ margin: 0 }}>
                  Trend charts, at-risk students, and subject effectiveness will appear here.
                </p>
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
                <p style={{ margin: 0, fontWeight: 700 }}>CBT & Examination Control Center</p>
                <p className="text-muted" style={{ margin: 0 }}>
                  Exam status, live monitoring, and quick actions will appear here.
                </p>
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
                <p style={{ margin: 0, fontWeight: 700 }}>Results & Assessment Management</p>
                <p className="text-muted" style={{ margin: 0 }}>
                  Result pipeline tracking, integrity panels, and top performers will appear here.
                </p>
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
                <p style={{ margin: 0, fontWeight: 700 }}>Financial Overview</p>
                <p className="text-muted" style={{ margin: 0 }}>
                  Fee collection KPIs and bursar actions will appear here.
                </p>
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
                <p style={{ margin: 0, fontWeight: 700 }}>Staff & Operations</p>
                <p className="text-muted" style={{ margin: 0 }}>
                  Workforce visibility and teacher load insights will appear here.
                </p>
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
                <p style={{ margin: 0, fontWeight: 700 }}>Alerts, Tasks & Approvals</p>
                <p className="text-muted" style={{ margin: 0 }}>
                  Approvals queue and system alerts will appear here.
                </p>
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
                <p style={{ margin: 0, fontWeight: 700 }}>Communication Center</p>
                <p className="text-muted" style={{ margin: 0 }}>
                  Announcements, messages, and broadcast tools will appear here.
                </p>
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}

function PlatformTenantPanel({ token }: { token: string }) {
  const [tenants, setTenants] = useState<PlatformTenantSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [tenantName, setTenantName] = useState('');
  const [editingTenantId, setEditingTenantId] = useState<string | null>(null);
  const [licenseForm, setLicenseForm] = useState({
    name: '',
    seats: '',
    expiresAt: '',
    notes: '',
  });
  const [savingLicense, setSavingLicense] = useState(false);
  const [rowBusyId, setRowBusyId] = useState<string | null>(null);
  const [deletingTenantId, setDeletingTenantId] = useState<string | null>(null);
  const [managingTenantId, setManagingTenantId] = useState<string | null>(null);
  const [tenantAdmins, setTenantAdmins] = useState<Record<string, TenantAdminSummary[]>>({});
  const [adminsLoading, setAdminsLoading] = useState(false);
  const [adminsError, setAdminsError] = useState<string | null>(null);
  const [newAdminForm, setNewAdminForm] = useState({ email: '', password: '' });

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

  const formatDate = (value: string | null) =>
    value ? new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(value)) : 'No expiry';

  const beginEdit = (tenant: PlatformTenantSummary) => {
    setEditingTenantId(tenant.id);
    setLicenseForm({
      name: tenant.name,
      seats: tenant.licenseSeats.toString(),
      expiresAt: tenant.licenseExpiresAt?.slice(0, 10) ?? '',
      notes: tenant.licenseNotes ?? '',
    });
    setActionError(null);
  };

  const resetEditState = () => {
    setEditingTenantId(null);
    setLicenseForm({ name: '', seats: '', expiresAt: '', notes: '' });
    setSavingLicense(false);
  };

  const updateTenantInState = (updated: PlatformTenantSummary) => {
    setTenants((prev) => prev.map((tenant) => (tenant.id === updated.id ? updated : tenant)));
  };

  const handleSaveLicense = async (tenantId: string) => {
    if (savingLicense) return;
    const trimmedName = licenseForm.name.trim();
    if (!trimmedName) {
      setActionError('Tenant name is required');
      return;
    }

    const seats = Number.parseInt(licenseForm.seats, 10);
    if (!Number.isFinite(seats) || seats <= 0) {
      setActionError('License seats must be a positive number');
      return;
    }

    let expiresAt: string | null = null;
    if (licenseForm.expiresAt) {
      const parsed = new Date(`${licenseForm.expiresAt}T00:00:00Z`);
      if (Number.isNaN(parsed.getTime())) {
        setActionError('Invalid expiration date');
        return;
      }
      expiresAt = parsed.toISOString();
    }

    const notes = licenseForm.notes.trim() || null;

    setSavingLicense(true);
    setActionError(null);
    try {
      const updated = await updatePlatformTenant(token, tenantId, {
        name: trimmedName,
        licenseSeats: seats,
        licenseExpiresAt: expiresAt,
        licenseNotes: notes,
      });
      updateTenantInState(updated);
      resetEditState();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to update license');
    } finally {
      setSavingLicense(false);
    }
  };

  const handleSuspendToggle = async (tenant: PlatformTenantSummary) => {
    setRowBusyId(tenant.id);
    setActionError(null);
    try {
      const updated = await suspendPlatformTenant(token, tenant.id, !tenant.isSuspended);
      updateTenantInState(updated);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to update suspension state');
    } finally {
      setRowBusyId(null);
    }
  };

  const handleDeleteTenant = async (tenant: PlatformTenantSummary) => {
    if (!window.confirm(`Delete ${tenant.name}? This cannot be undone.`)) return;
    setDeletingTenantId(tenant.id);
    setActionError(null);
    try {
      await deletePlatformTenant(token, tenant.id);
      setTenants((prev) => prev.filter((item) => item.id !== tenant.id));
      if (editingTenantId === tenant.id) {
        resetEditState();
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to delete tenant');
    } finally {
      setDeletingTenantId(null);
    }
  };

  const loadTenantAdmins = useCallback(
    async (tenantId: string) => {
      setAdminsLoading(true);
      setAdminsError(null);
      try {
        const admins = await fetchTenantAdmins(token, tenantId);
        setTenantAdmins((prev) => ({ ...prev, [tenantId]: admins }));
      } catch (err) {
        setAdminsError(err instanceof Error ? err.message : 'Unable to load tenant admins');
      } finally {
        setAdminsLoading(false);
      }
    },
    [token],
  );

  const toggleManageAdmins = async (tenantId: string) => {
    if (managingTenantId === tenantId) {
      setManagingTenantId(null);
      setAdminsError(null);
      setNewAdminForm({ email: '', password: '' });
      return;
    }

    setManagingTenantId(tenantId);
    setAdminsError(null);
    setNewAdminForm({ email: '', password: '' });
    await loadTenantAdmins(tenantId);
  };

  const handleCreateAdmin = async (tenantId: string) => {
    if (adminsLoading) return;
    const email = newAdminForm.email.trim().toLowerCase();
    const password = newAdminForm.password;
    if (!email || !password) {
      setAdminsError('Admin email and password are required');
      return;
    }

    setAdminsLoading(true);
    setAdminsError(null);
    try {
      await createTenantAdmin(token, tenantId, { email, password });
      setNewAdminForm({ email: '', password: '' });
      await loadTenantAdmins(tenantId);
    } catch (err) {
      setAdminsError(err instanceof Error ? err.message : 'Unable to create admin');
    } finally {
      setAdminsLoading(false);
    }
  };

  const handleResetAdminPassword = async (tenantId: string, admin: TenantAdminSummary) => {
    const password = window.prompt(`Enter a new password for ${admin.email}`);
    if (!password) return;

    setAdminsLoading(true);
    setAdminsError(null);
    try {
      await resetTenantAdminPassword(token, tenantId, admin.userId, password);
    } catch (err) {
      setAdminsError(err instanceof Error ? err.message : 'Unable to reset password');
    } finally {
      setAdminsLoading(false);
    }
  };

  const handleRemoveAdmin = async (tenantId: string, admin: TenantAdminSummary) => {
    if (!window.confirm(`Remove ${admin.email} from this tenant?`)) return;

    setAdminsLoading(true);
    setAdminsError(null);
    try {
      await removeTenantAdmin(token, tenantId, admin.userId);
      await loadTenantAdmins(tenantId);
    } catch (err) {
      setAdminsError(err instanceof Error ? err.message : 'Unable to remove admin');
    } finally {
      setAdminsLoading(false);
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
      {actionError && (
        <p className="form-error" style={{ margin: 0 }}>
          {actionError}
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {tenants.map((tenant) => {
            const isEditing = editingTenantId === tenant.id;
            const suspended = tenant.isSuspended;
            const isManagingAdmins = managingTenantId === tenant.id;
            const adminsForTenant = tenantAdmins[tenant.id] ?? [];
            return (
              <div
                key={tenant.id}
                style={{
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 20,
                  padding: '1.25rem',
                  background: 'rgba(15,23,42,0.6)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem',
                }}
              >
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ margin: 0 }}>{tenant.name}</h4>
                    <p className="text-muted" style={{ margin: 0 }}>
                      Updated {new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(tenant.updatedAt))}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {suspended && (
                      <span className="pill" style={{ background: 'rgba(248,113,113,0.2)', color: '#fecaca' }}>
                        Suspended
                      </span>
                    )}
                    <span className="pill">Members: {tenant._count.memberships}</span>
                    <span className="pill">Students: {tenant._count.students}</span>
                    <span className="pill">Classes: {tenant._count.classes}</span>
                    <span className="pill">Subjects: {tenant._count.subjects}</span>
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '0.75rem',
                  }}
                >
                  <div>
                    <p className="text-muted" style={{ margin: 0 }}>
                      Licensed seats
                    </p>
                    <p style={{ margin: 0, fontWeight: 600 }}>{(tenant.licenseSeats ?? 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted" style={{ margin: 0 }}>
                      Expires
                    </p>
                    <p style={{ margin: 0, fontWeight: 600 }}>{formatDate(tenant.licenseExpiresAt)}</p>
                  </div>
                  <div>
                    <p className="text-muted" style={{ margin: 0 }}>
                      Notes
                    </p>
                    <p style={{ margin: 0, color: tenant.licenseNotes ? 'inherit' : 'rgba(255,255,255,0.5)' }}>
                      {tenant.licenseNotes || '—'}
                    </p>
                  </div>
                </div>

                {isEditing ? (
                  <div
                    style={{
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: 16,
                      padding: '1rem',
                      display: 'grid',
                      gap: '0.5rem',
                      background: 'rgba(15,23,42,0.5)',
                    }}
                  >
                    <div style={{ display: 'grid', gap: '0.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span>Name</span>
                        <input
                          className="input-field"
                          value={licenseForm.name}
                          onChange={(e) => setLicenseForm((prev) => ({ ...prev, name: e.target.value }))}
                        />
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span>Seats</span>
                        <input
                          className="input-field"
                          type="number"
                          min={1}
                          value={licenseForm.seats}
                          onChange={(e) => setLicenseForm((prev) => ({ ...prev, seats: e.target.value }))}
                        />
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span>Expiration (YYYY-MM-DD)</span>
                        <input
                          className="input-field"
                          type="date"
                          value={licenseForm.expiresAt}
                          onChange={(e) => setLicenseForm((prev) => ({ ...prev, expiresAt: e.target.value }))}
                        />
                      </label>
                    </div>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span>Notes</span>
                      <textarea
                        className="input-field"
                        value={licenseForm.notes}
                        onChange={(e) => setLicenseForm((prev) => ({ ...prev, notes: e.target.value }))}
                        style={{ minHeight: 60 }}
                      />
                    </label>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="gradient-button"
                        disabled={savingLicense}
                        onClick={() => void handleSaveLicense(tenant.id)}
                      >
                        {savingLicense ? 'Saving…' : 'Save license'}
                      </button>
                      <button type="button" className="pill" onClick={resetEditState} disabled={savingLicense}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button type="button" className="pill" onClick={() => beginEdit(tenant)}>
                      Edit license
                    </button>
                    <button type="button" className="pill" onClick={() => void toggleManageAdmins(tenant.id)}>
                      {isManagingAdmins ? 'Hide admins' : 'Manage admins'}
                    </button>
                    <button
                      type="button"
                      className="pill"
                      style={{ background: suspended ? 'rgba(34,197,94,0.15)' : 'rgba(248,113,113,0.2)', color: suspended ? '#4ade80' : '#fecaca' }}
                      onClick={() => void handleSuspendToggle(tenant)}
                      disabled={rowBusyId === tenant.id}
                    >
                      {suspended ? 'Unsuspend' : 'Suspend'}
                    </button>
                    <button
                      type="button"
                      className="pill"
                      style={{ background: 'rgba(248,113,113,0.25)', color: '#fecaca' }}
                      onClick={() => void handleDeleteTenant(tenant)}
                      disabled={deletingTenantId === tenant.id}
                    >
                      {deletingTenantId === tenant.id ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>
                )}

                {isManagingAdmins && (
                  <div
                    style={{
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: 16,
                      padding: '1rem',
                      display: 'grid',
                      gap: '0.75rem',
                      background: 'rgba(15,23,42,0.45)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <strong>Tenant admins</strong>
                      <button type="button" className="pill" onClick={() => void loadTenantAdmins(tenant.id)} disabled={adminsLoading}>
                        {adminsLoading ? 'Refreshing…' : 'Refresh admins'}
                      </button>
                    </div>

                    {adminsError && (
                      <p className="form-error" style={{ margin: 0 }}>
                        {adminsError}
                      </p>
                    )}

                    <div style={{ display: 'grid', gap: '0.5rem' }}>
                      {adminsForTenant.length === 0 ? (
                        <p className="text-muted" style={{ margin: 0 }}>
                          No admins yet.
                        </p>
                      ) : (
                        adminsForTenant.map((admin) => (
                          <div key={admin.userId} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
                            <div>
                              <p style={{ margin: 0, fontWeight: 600 }}>{admin.email}</p>
                              <p className="text-muted" style={{ margin: 0 }}>
                                {admin.role} · added {new Date(admin.createdAt).toLocaleString()}
                              </p>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                              <button
                                type="button"
                                className="pill"
                                onClick={() => void handleResetAdminPassword(tenant.id, admin)}
                                disabled={adminsLoading}
                              >
                                Reset password
                              </button>
                              <button
                                type="button"
                                className="pill"
                                style={{ background: 'rgba(248,113,113,0.25)', color: '#fecaca' }}
                                onClick={() => void handleRemoveAdmin(tenant.id, admin)}
                                disabled={adminsLoading}
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <div style={{ display: 'grid', gap: '0.5rem' }}>
                      <strong>Create admin</strong>
                      <div style={{ display: 'grid', gap: '0.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                        <input
                          className="input-field"
                          placeholder="Admin email"
                          value={newAdminForm.email}
                          onChange={(e) => setNewAdminForm((prev) => ({ ...prev, email: e.target.value }))}
                        />
                        <input
                          className="input-field"
                          placeholder="Temporary password"
                          value={newAdminForm.password}
                          onChange={(e) => setNewAdminForm((prev) => ({ ...prev, password: e.target.value }))}
                        />
                      </div>
                      <div>
                        <button
                          type="button"
                          className="gradient-button"
                          onClick={() => void handleCreateAdmin(tenant.id)}
                          disabled={adminsLoading}
                        >
                          {adminsLoading ? 'Saving…' : 'Create admin'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
