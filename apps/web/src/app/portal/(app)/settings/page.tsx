'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  createPlatformTenant,
  createTenantAdmin,
  fetchPlatformTenants,
  fetchTenantAdmins,
  removeTenantAdmin,
  resetTenantAdminPassword,
  suspendPlatformTenant,
  type PlatformTenantSummary,
  type TenantAdminSummary,
} from '@/lib/platform-tenants';
import { getAccessToken } from '@/lib/client-auth';
import { useTenantContext } from '@/components/portal/TenantContextProvider';

type AdminState = {
  loading: boolean;
  data: TenantAdminSummary[] | null;
  error: string | null;
};

export default function SettingsPage() {
  const { context, loading, error } = useTenantContext();
  const [token, setToken] = useState<string | null>(null);
  const [tokenLoading, setTokenLoading] = useState(true);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [tenants, setTenants] = useState<PlatformTenantSummary[]>([]);
  const [tenantsLoading, setTenantsLoading] = useState(false);
  const [tenantsError, setTenantsError] = useState<string | null>(null);
  const [createTenantName, setCreateTenantName] = useState('');
  const [creatingTenant, setCreatingTenant] = useState(false);
  const [expandedTenantId, setExpandedTenantId] = useState<string | null>(null);
  const [adminState, setAdminState] = useState<Record<string, AdminState>>({});
  const [adminForms, setAdminForms] = useState<Record<string, { email: string; password: string }>>({});
  const [adminActionMessage, setAdminActionMessage] = useState<string | null>(null);

  const isSuperadmin = useMemo(() => context?.systemRoles?.includes('SUPERADMIN') ?? false, [context?.systemRoles]);

  useEffect(() => {
    const storedToken = getAccessToken();
    if (!storedToken) {
      setTokenError('Please sign in again to manage settings.');
      setToken(null);
    } else {
      setToken(storedToken);
      setTokenError(null);
    }
    setTokenLoading(false);
  }, []);

  const loadTenants = useCallback(async () => {
    if (!token || !isSuperadmin) return;
    setTenantsLoading(true);
    setTenantsError(null);
    try {
      const list = await fetchPlatformTenants(token);
      setTenants(list);
    } catch (err) {
      setTenantsError(err instanceof Error ? err.message : 'Unable to load tenants');
    } finally {
      setTenantsLoading(false);
    }
  }, [isSuperadmin, token]);

  const loadTenantAdmins = useCallback(
    async (tenantId: string) => {
      if (!token || !isSuperadmin) return;
      setAdminState((prev) => ({
        ...prev,
        [tenantId]: { loading: true, data: prev[tenantId]?.data ?? null, error: null },
      }));
      try {
        const admins = await fetchTenantAdmins(token, tenantId);
        setAdminState((prev) => ({
          ...prev,
          [tenantId]: { loading: false, data: admins, error: null },
        }));
      } catch (err) {
        setAdminState((prev) => ({
          ...prev,
          [tenantId]: {
            loading: false,
            data: prev[tenantId]?.data ?? null,
            error: err instanceof Error ? err.message : 'Unable to load admins',
          },
        }));
      }
    },
    [isSuperadmin, token],
  );

  useEffect(() => {
    void loadTenants();
  }, [loadTenants]);

  useEffect(() => {
    if (expandedTenantId && !adminState[expandedTenantId]?.data && !adminState[expandedTenantId]?.loading) {
      void loadTenantAdmins(expandedTenantId);
    }
  }, [adminState, expandedTenantId, loadTenantAdmins]);

  const handleCreateTenant = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;
    const trimmed = createTenantName.trim();
    if (!trimmed) {
      setTenantsError('Tenant name is required');
      return;
    }
    setCreatingTenant(true);
    setTenantsError(null);
    try {
      const tenant = await createPlatformTenant(token, trimmed);
      setTenants((prev) => [tenant, ...prev]);
      setCreateTenantName('');
    } catch (err) {
      setTenantsError(err instanceof Error ? err.message : 'Unable to create tenant');
    } finally {
      setCreatingTenant(false);
    }
  };

  const handleToggleTenantPanel = (tenantId: string) => {
    setExpandedTenantId((prev) => (prev === tenantId ? null : tenantId));
    setAdminActionMessage(null);
  };

  const handleAdminFormChange = (tenantId: string, field: 'email' | 'password', value: string) => {
    setAdminForms((prev) => ({
      ...prev,
      [tenantId]: {
        email: field === 'email' ? value : prev[tenantId]?.email ?? '',
        password: field === 'password' ? value : prev[tenantId]?.password ?? '',
      },
    }));
  };

  const handleCreateAdmin = async (tenantId: string) => {
    if (!token) return;
    const form = adminForms[tenantId] ?? { email: '', password: '' };
    if (!form.email.trim() || !form.password.trim()) {
      setAdminActionMessage('Email and password are required to create an admin.');
      return;
    }
    setAdminActionMessage(null);
    setAdminState((prev) => ({
      ...prev,
      [tenantId]: { loading: true, data: prev[tenantId]?.data ?? null, error: null },
    }));
    try {
      const admin = await createTenantAdmin(token, tenantId, {
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });
      setAdminState((prev) => ({
        ...prev,
        [tenantId]: {
          loading: false,
          data: [admin, ...(prev[tenantId]?.data ?? [])],
          error: null,
        },
      }));
      setAdminForms((prev) => ({ ...prev, [tenantId]: { email: '', password: '' } }));
      setAdminActionMessage('Admin created successfully.');
    } catch (err) {
      setAdminState((prev) => ({
        ...prev,
        [tenantId]: { loading: false, data: prev[tenantId]?.data ?? null, error: null },
      }));
      setAdminActionMessage(err instanceof Error ? err.message : 'Unable to create tenant admin.');
    }
  };

  const handleResetPassword = async (tenantId: string, userId: string) => {
    if (!token) return;
    const password = window.prompt('Enter a new password for this admin');
    if (!password) return;
    setAdminActionMessage(null);
    try {
      await resetTenantAdminPassword(token, tenantId, userId, password);
      setAdminActionMessage('Password reset successfully.');
    } catch (err) {
      setAdminActionMessage(err instanceof Error ? err.message : 'Unable to reset password.');
    }
  };

  const handleRemoveAdmin = async (tenantId: string, userId: string) => {
    if (!token) return;
    const confirmed = window.confirm('Remove this admin from the tenant?');
    if (!confirmed) return;
    setAdminActionMessage(null);
    setAdminState((prev) => ({
      ...prev,
      [tenantId]: { loading: true, data: prev[tenantId]?.data ?? null, error: null },
    }));
    try {
      await removeTenantAdmin(token, tenantId, userId);
      setAdminState((prev) => ({
        ...prev,
        [tenantId]: {
          loading: false,
          data: (prev[tenantId]?.data ?? []).filter((admin) => admin.userId !== userId),
          error: null,
        },
      }));
      setAdminActionMessage('Admin removed successfully.');
    } catch (err) {
      setAdminState((prev) => ({
        ...prev,
        [tenantId]: { loading: false, data: prev[tenantId]?.data ?? null, error: null },
      }));
      setAdminActionMessage(err instanceof Error ? err.message : 'Unable to remove admin.');
    }
  };

  const handleToggleSuspension = async (tenant: PlatformTenantSummary) => {
    if (!token) return;
    try {
      const updated = await suspendPlatformTenant(token, tenant.id, !tenant.isSuspended);
      setTenants((prev) => prev.map((item) => (item.id === tenant.id ? updated : item)));
    } catch (err) {
      setTenantsError(err instanceof Error ? err.message : 'Unable to update tenant status');
    }
  };

  if (loading || tokenLoading) {
    return (
      <section style={{ display: 'grid', gap: '0.75rem' }}>
        <h1 style={{ margin: 0 }}>Settings</h1>
        <p className="text-muted">Loading settings…</p>
      </section>
    );
  }

  if (error === 'unauthorized' || tokenError) {
    return (
      <section style={{ display: 'grid', gap: '0.75rem' }}>
        <h1 style={{ margin: 0 }}>Settings</h1>
        <p className="form-error">{tokenError ?? 'Session expired. Please sign in again.'}</p>
      </section>
    );
  }

  if (error && error !== 'unauthorized') {
    return (
      <section style={{ display: 'grid', gap: '0.75rem' }}>
        <h1 style={{ margin: 0 }}>Settings</h1>
        <p className="form-error">{error}</p>
      </section>
    );
  }

  if (!context) {
    return (
      <section style={{ display: 'grid', gap: '0.75rem' }}>
        <h1 style={{ margin: 0 }}>Settings</h1>
        <p className="form-error">Unable to load portal context. Try refreshing.</p>
      </section>
    );
  }

  if (!isSuperadmin) {
    return (
      <section style={{ display: 'grid', gap: '0.75rem' }}>
        <h1 style={{ margin: 0 }}>Settings</h1>
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <p style={{ margin: 0, fontWeight: 600 }}>Portal settings are limited.</p>
          <p className="text-muted" style={{ margin: 0, marginTop: 6 }}>
            Only platform superadmins can manage tenant workspaces and admins. Contact your platform owner for access.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section style={{ display: 'grid', gap: '1.5rem' }}>
      <header>
        <h1 style={{ marginBottom: '0.25rem' }}>Platform Control</h1>
        <p className="text-muted" style={{ margin: 0 }}>
          Create school workspaces, invite tenant admins, and toggle access in real time.
        </p>
      </header>

      <div className="glass-card" style={{ padding: '1.5rem', display: 'grid', gap: '1rem' }}>
        <div>
          <p style={{ margin: 0, fontWeight: 600 }}>Create tenant</p>
          <p className="text-muted" style={{ margin: 0 }}>Spin up a new school workspace with default license seats.</p>
        </div>
        <form onSubmit={handleCreateTenant} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <input
            className="input-field"
            placeholder="e.g. Aurora Science Academy"
            value={createTenantName}
            onChange={(event) => setCreateTenantName(event.target.value)}
            style={{ flex: 1, minWidth: 220 }}
          />
          <button className="gradient-button" type="submit" disabled={creatingTenant}>
            {creatingTenant ? 'Creating…' : 'Create workspace'}
          </button>
        </form>
        {tenantsError && <p className="form-error" style={{ margin: 0 }}>{tenantsError}</p>}
      </div>

      <div style={{ display: 'grid', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <h2 style={{ margin: 0 }}>Tenant workspaces</h2>
          <button
            className="pill"
            type="button"
            style={{ cursor: 'pointer' }}
            onClick={() => {
              setTenantsError(null);
              void loadTenants();
            }}
          >
            Refresh
          </button>
          {tenantsLoading && <span className="text-muted">Loading…</span>}
        </div>

        {tenants.length === 0 && !tenantsLoading && (
          <div className="glass-card" style={{ padding: '1.25rem' }}>
            <p style={{ margin: 0, fontWeight: 600 }}>No tenants yet</p>
            <p className="text-muted" style={{ margin: 0, marginTop: 6 }}>
              Use the form above to create your first school workspace.
            </p>
          </div>
        )}

        <div style={{ display: 'grid', gap: '1rem' }}>
          {tenants.map((tenant) => {
            const admins = adminState[tenant.id]?.data ?? [];
            const adminLoading = adminState[tenant.id]?.loading ?? false;
            const adminError = adminState[tenant.id]?.error;
            const adminForm = adminForms[tenant.id] ?? { email: '', password: '' };

            return (
              <div
                key={tenant.id}
                className="glass-card"
                style={{ padding: '1.25rem', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <p style={{ margin: 0, fontWeight: 700 }}>{tenant.name}</p>
                    <p className="text-muted" style={{ margin: 0, marginTop: 4 }}>
                      Seats: {tenant.licenseSeats} · Created {new Date(tenant.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    type={tenant.isSuspended ? 'button' : 'button'}
                    className="pill"
                    onClick={() => handleToggleSuspension(tenant)}
                    style={{
                      cursor: 'pointer',
                      borderColor: tenant.isSuspended ? 'rgba(248,113,113,0.4)' : 'rgba(125,211,252,0.4)',
                    }}
                  >
                    {tenant.isSuspended ? 'Reinstate access' : 'Suspend tenant'}
                  </button>
                  <button
                    type="button"
                    className="pill"
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleToggleTenantPanel(tenant.id)}
                  >
                    {expandedTenantId === tenant.id ? 'Hide admins' : 'Manage admins'}
                  </button>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gap: '0.5rem',
                    marginTop: '0.85rem',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  }}
                >
                  <StatTile label="Admins" value={tenant._count.memberships.toString()} />
                  <StatTile label="Students" value={tenant._count.students.toString()} />
                  <StatTile label="Classes" value={tenant._count.classes.toString()} />
                  <StatTile label="Subjects" value={tenant._count.subjects.toString()} />
                </div>

                {expandedTenantId === tenant.id && (
                  <div style={{ marginTop: '1rem', display: 'grid', gap: '1rem' }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: 600 }}>Tenant admins</p>
                      <p className="text-muted" style={{ margin: 0 }}>
                        Invite operations staff or registrars. New admins receive credentials out-of-band.
                      </p>
                    </div>

                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <input
                          className="input-field"
                          placeholder="admin@school.edu"
                          value={adminForm.email}
                          onChange={(event) => handleAdminFormChange(tenant.id, 'email', event.target.value)}
                          style={{ flex: 1, minWidth: 220 }}
                        />
                        <input
                          className="input-field"
                          type="password"
                          placeholder="Temporary password"
                          value={adminForm.password}
                          onChange={(event) => handleAdminFormChange(tenant.id, 'password', event.target.value)}
                          style={{ flex: 1, minWidth: 220 }}
                        />
                        <button
                          className="gradient-button"
                          type="button"
                          disabled={adminLoading}
                          onClick={() => handleCreateAdmin(tenant.id)}
                        >
                          {adminLoading ? 'Processing…' : 'Add admin'}
                        </button>
                      </div>
                      {adminActionMessage && <p className="text-muted" style={{ margin: 0 }}>{adminActionMessage}</p>}
                      {adminError && <p className="form-error" style={{ margin: 0 }}>{adminError}</p>}
                    </div>

                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '0.75rem' }}>
                      {adminLoading && admins.length === 0 && (
                        <p className="text-muted" style={{ margin: 0 }}>
                          Loading admins…
                        </p>
                      )}
                      {!adminLoading && admins.length === 0 && (
                        <p className="text-muted" style={{ margin: 0 }}>
                          No admins yet. Use the form above to invite one.
                        </p>
                      )}
                      <div style={{ display: 'grid', gap: '0.5rem' }}>
                        {admins.map((admin) => (
                          <div
                            key={admin.userId}
                            style={{
                              display: 'flex',
                              flexWrap: 'wrap',
                              gap: '0.5rem',
                              alignItems: 'center',
                              padding: '0.75rem',
                              borderRadius: 12,
                              border: '1px solid rgba(255,255,255,0.08)',
                            }}
                          >
                            <div style={{ flex: 1, minWidth: 220 }}>
                              <p style={{ margin: 0, fontWeight: 600 }}>{admin.email}</p>
                              <p className="text-muted" style={{ margin: 0 }}>
                                Role: {admin.role} · Added {new Date(admin.createdAt).toLocaleString()}
                              </p>
                            </div>
                            <button
                              className="pill"
                              type="button"
                              style={{ cursor: 'pointer' }}
                              onClick={() => handleResetPassword(tenant.id, admin.userId)}
                            >
                              Reset password
                            </button>
                            <button
                              className="pill"
                              type="button"
                              style={{ cursor: 'pointer', borderColor: 'rgba(248,113,113,0.4)', color: '#fecaca' }}
                              onClick={() => handleRemoveAdmin(tenant.id, admin.userId)}
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        borderRadius: 14,
        border: '1px solid rgba(255,255,255,0.08)',
        padding: '0.9rem',
        background: 'rgba(15,23,42,0.6)',
      }}
    >
      <p className="text-muted" style={{ margin: 0 }}>
        {label}
      </p>
      <strong style={{ fontSize: '1.2rem' }}>{value}</strong>
    </div>
  );
}
