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
import {
  fetchPlatformPlans,
  createPlatformPlanClient,
  updatePlatformPlanClient,
  deletePlatformPlanClient,
  type PlatformPlan,
} from '@/lib/platform-plans';
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
  const [adminResetControls, setAdminResetControls] = useState<
    Record<string, { open: boolean; value: string; busy: boolean }>
  >({});
  const [plans, setPlans] = useState<PlatformPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [plansError, setPlansError] = useState<string | null>(null);
  const [planForms, setPlanForms] = useState<
    Record<
      string,
      {
        name: string;
        description: string;
        currency: string;
        seatPrice: string;
        billingInterval: string;
        minSeats: string;
        discountPercent: string;
        discountLabel: string;
        features: string;
        isFeatured: boolean;
      }
    >
  >({});
  const [newPlanForm, setNewPlanForm] = useState({
    name: '',
    description: '',
    currency: 'NGN',
    seatPrice: '',
    billingInterval: 'student/month',
    minSeats: '',
    discountPercent: '',
    discountLabel: '',
    features: '',
    isFeatured: false,
  });
  const [planActionMessage, setPlanActionMessage] = useState<string | null>(null);
  const [creatingPlan, setCreatingPlan] = useState(false);
  const [planSavingSlug, setPlanSavingSlug] = useState<string | null>(null);
  const [planDeletingSlug, setPlanDeletingSlug] = useState<string | null>(null);

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

  const planToForm = useCallback((plan: PlatformPlan) => {
    return {
      name: plan.name,
      description: plan.description ?? '',
      currency: plan.currency,
      seatPrice: plan.seatPrice.toString(),
      billingInterval: plan.billingInterval,
      minSeats: plan.minSeats.toString(),
      discountPercent: plan.discountPercent !== null ? plan.discountPercent.toString() : '',
      discountLabel: plan.discountLabel ?? '',
      features: plan.features.join('\n'),
      isFeatured: plan.isFeatured,
    };
  }, []);

  const parsePositiveInt = (value: string, label: string) => {
    const num = Number(value);
    if (!Number.isFinite(num) || !Number.isInteger(num) || num <= 0) {
      throw new Error(`${label} must be a positive integer`);
    }
    return num;
  };

  const parseDiscount = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const num = Number(trimmed);
    if (!Number.isFinite(num) || !Number.isInteger(num) || num < 0 || num > 100) {
      throw new Error('Discount percent must be between 0 and 100');
    }
    return num;
  };

  const featuresFromText = (value: string) =>
    value
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

  const formToPayload = (form: (typeof planForms)[string]) => {
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      currency: form.currency.trim().toUpperCase() || 'NGN',
      seatPrice: parsePositiveInt(form.seatPrice, 'Seat price'),
      billingInterval: form.billingInterval.trim() || 'student/month',
      minSeats: parsePositiveInt(form.minSeats, 'Minimum seats'),
      discountPercent: form.discountPercent.trim() ? parseDiscount(form.discountPercent) : null,
      discountLabel: form.discountLabel.trim() || null,
      features: featuresFromText(form.features),
      isFeatured: form.isFeatured,
    };
    return payload;
  };

  const newFormToPayload = () => {
    const payload = {
      name: newPlanForm.name.trim(),
      description: newPlanForm.description.trim() || null,
      currency: newPlanForm.currency.trim().toUpperCase() || 'NGN',
      seatPrice: parsePositiveInt(newPlanForm.seatPrice, 'Seat price'),
      billingInterval: newPlanForm.billingInterval.trim() || 'student/month',
      minSeats: parsePositiveInt(newPlanForm.minSeats, 'Minimum seats'),
      discountPercent: newPlanForm.discountPercent.trim() ? parseDiscount(newPlanForm.discountPercent) : null,
      discountLabel: newPlanForm.discountLabel.trim() || null,
      features: featuresFromText(newPlanForm.features),
      isFeatured: newPlanForm.isFeatured,
    };
    if (!payload.name) {
      throw new Error('Plan name is required');
    }
    return payload;
  };

  const loadPlans = useCallback(async () => {
    if (!token || !isSuperadmin) return;
    setPlansLoading(true);
    setPlansError(null);
    try {
      const list = await fetchPlatformPlans();
      setPlans(list);
      setPlanForms(
        list.reduce<Record<string, ReturnType<typeof planToForm>>>((acc, plan) => {
          acc[plan.slug] = planToForm(plan);
          return acc;
        }, {}),
      );
    } catch (err) {
      setPlansError(err instanceof Error ? err.message : 'Unable to load plans');
    } finally {
      setPlansLoading(false);
    }
  }, [fetchPlatformPlans, planToForm, isSuperadmin, token]);

  useEffect(() => {
    void loadPlans();
  }, [loadPlans]);

  const handlePlanFormChange = (slug: string, field: keyof (typeof planForms)[string], value: string | boolean) => {
    setPlanForms((prev) => {
      const next = {
        ...prev,
        [slug]: {
          ...prev[slug],
          [field]: typeof value === 'string' ? value : value,
        },
      };
      return next;
    });
  };

  const handlePlanSave = async (slug: string) => {
    if (!token) return;
    const form = planForms[slug];
    if (!form) return;
    try {
      setPlanSavingSlug(slug);
      setPlanActionMessage(null);
      const payload = formToPayload(form);
      const updated = await updatePlatformPlanClient(token, slug, payload);
      setPlans((prev) => prev.map((plan) => (plan.slug === slug ? updated : plan)));
      setPlanForms((prev) => ({ ...prev, [updated.slug]: planToForm(updated) }));
      setPlanActionMessage('Plan updated successfully.');
    } catch (err) {
      setPlanActionMessage(err instanceof Error ? err.message : 'Unable to update plan.');
    } finally {
      setPlanSavingSlug(null);
    }
  };

  const handlePlanDelete = async (slug: string) => {
    if (!token) return;
    const confirmed = window.confirm('Delete this plan? This cannot be undone.');
    if (!confirmed) return;
    try {
      setPlanDeletingSlug(slug);
      setPlanActionMessage(null);
      await deletePlatformPlanClient(token, slug);
      setPlans((prev) => prev.filter((plan) => plan.slug !== slug));
      setPlanForms((prev) => {
        const next = { ...prev };
        delete next[slug];
        return next;
      });
      setPlanActionMessage('Plan deleted.');
    } catch (err) {
      setPlanActionMessage(err instanceof Error ? err.message : 'Unable to delete plan.');
    } finally {
      setPlanDeletingSlug(null);
    }
  };

  const handleNewPlanChange = (field: keyof typeof newPlanForm, value: string | boolean) => {
    setNewPlanForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCreatePlan = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;
    try {
      setCreatingPlan(true);
      setPlanActionMessage(null);
      const payload = newFormToPayload();
      const created = await createPlatformPlanClient(token, payload);
      setPlans((prev) => [created, ...prev]);
      setPlanForms((prev) => ({ ...prev, [created.slug]: planToForm(created) }));
      setNewPlanForm({
        name: '',
        description: '',
        currency: 'NGN',
        seatPrice: '',
        billingInterval: 'student/month',
        minSeats: '',
        discountPercent: '',
        discountLabel: '',
        features: '',
        isFeatured: false,
      });
      setPlanActionMessage('Plan created successfully.');
    } catch (err) {
      setPlanActionMessage(err instanceof Error ? err.message : 'Unable to create plan.');
    } finally {
      setCreatingPlan(false);
    }
  };

  const buildResetKey = (tenantId: string, userId: string) => `${tenantId}:${userId}`;

  const toggleResetPanel = (tenantId: string, userId: string) => {
    const key = buildResetKey(tenantId, userId);
    setAdminResetControls((prev) => {
      const current = prev[key];
      const nextState = current?.open
        ? { open: false, value: '', busy: false }
        : { open: true, value: current?.value ?? '', busy: false };
      return { ...prev, [key]: nextState };
    });
  };

  const handleResetInputChange = (tenantId: string, userId: string, value: string) => {
    const key = buildResetKey(tenantId, userId);
    setAdminResetControls((prev) => ({
      ...prev,
      [key]: { open: true, value, busy: prev[key]?.busy ?? false },
    }));
  };

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
    if (!token) {
      setAdminActionMessage('Please sign in again to reset passwords.');
      return;
    }
    const key = buildResetKey(tenantId, userId);
    const entry = adminResetControls[key];
    const password = entry?.value.trim();
    if (!entry || !password) {
      setAdminActionMessage('Enter a temporary password before resetting.');
      return;
    }
    setAdminActionMessage(null);
    setAdminResetControls((prev) => ({
      ...prev,
      [key]: { ...entry, busy: true },
    }));
    try {
      await resetTenantAdminPassword(token, tenantId, userId, password);
      setAdminActionMessage('Password reset successfully.');
      setAdminResetControls((prev) => ({
        ...prev,
        [key]: { open: false, value: '', busy: false },
      }));
    } catch (err) {
      setAdminActionMessage(err instanceof Error ? err.message : 'Unable to reset password.');
      setAdminResetControls((prev) => ({
        ...prev,
        [key]: { ...entry, busy: false },
      }));
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
                        {admins.map((admin) => {
                          const resetKey = buildResetKey(tenant.id, admin.userId);
                          const resetControl = adminResetControls[resetKey] ?? { open: false, value: '', busy: false };
                          const isResetOpen = resetControl.open;

                          return (
                            <div
                              key={admin.userId}
                              style={{
                                display: 'grid',
                                gap: '0.6rem',
                                padding: '0.85rem',
                                borderRadius: 12,
                                border: '1px solid rgba(255,255,255,0.08)',
                              }}
                            >
                              <div
                                style={{
                                  display: 'flex',
                                  flexWrap: 'wrap',
                                  gap: '0.5rem',
                                  alignItems: 'center',
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
                                  onClick={() => toggleResetPanel(tenant.id, admin.userId)}
                                >
                                  {isResetOpen ? 'Close reset' : 'Reset password'}
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

                              {isResetOpen && (
                                <div
                                  style={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: '0.5rem',
                                    alignItems: 'center',
                                  }}
                                >
                                  <input
                                    className="input-field"
                                    type="password"
                                    placeholder="Temporary password"
                                    value={resetControl.value}
                                    onChange={(event) =>
                                      handleResetInputChange(tenant.id, admin.userId, event.target.value)
                                    }
                                    style={{ flex: 1, minWidth: 220 }}
                                  />
                                  <button
                                    className="gradient-button"
                                    type="button"
                                    disabled={resetControl.busy}
                                    onClick={() => handleResetPassword(tenant.id, admin.userId)}
                                  >
                                    {resetControl.busy ? 'Resetting…' : 'Confirm reset'}
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="glass-card" style={{ padding: '1.5rem', display: 'grid', gap: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div>
            <p style={{ margin: 0, fontWeight: 600 }}>Pricing & plans</p>
            <p className="text-muted" style={{ margin: 0 }}>
              Edit seat pricing, discounts, and feature bundles shown on the public site.
            </p>
          </div>
          <div style={{ flexGrow: 1 }} />
          <button
            className="pill"
            type="button"
            style={{ cursor: 'pointer' }}
            onClick={() => {
              setPlansError(null);
              setPlanActionMessage(null);
              void loadPlans();
            }}
          >
            Refresh plans
          </button>
          {plansLoading && <span className="text-muted">Loading…</span>}
        </div>

        {planActionMessage && (
          <p className="text-muted" style={{ margin: 0 }}>
            {planActionMessage}
          </p>
        )}
        {plansError && (
          <p className="form-error" style={{ margin: 0 }}>
            {plansError}
          </p>
        )}

        <form onSubmit={handleCreatePlan} style={{ display: 'grid', gap: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <strong>Create new plan</strong>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
              <input
                type="checkbox"
                checked={newPlanForm.isFeatured}
                onChange={(event) => handleNewPlanChange('isFeatured', event.target.checked)}
              />
              Featured
            </label>
          </div>
          <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
            <input
              className="input-field"
              placeholder="Plan name"
              value={newPlanForm.name}
              onChange={(event) => handleNewPlanChange('name', event.target.value)}
            />
            <input
              className="input-field"
              placeholder="Currency"
              value={newPlanForm.currency}
              onChange={(event) => handleNewPlanChange('currency', event.target.value)}
            />
            <input
              className="input-field"
              placeholder="Seat price"
              value={newPlanForm.seatPrice}
              onChange={(event) => handleNewPlanChange('seatPrice', event.target.value)}
            />
            <input
              className="input-field"
              placeholder="Billing interval"
              value={newPlanForm.billingInterval}
              onChange={(event) => handleNewPlanChange('billingInterval', event.target.value)}
            />
            <input
              className="input-field"
              placeholder="Minimum seats"
              value={newPlanForm.minSeats}
              onChange={(event) => handleNewPlanChange('minSeats', event.target.value)}
            />
            <input
              className="input-field"
              placeholder="Discount %"
              value={newPlanForm.discountPercent}
              onChange={(event) => handleNewPlanChange('discountPercent', event.target.value)}
            />
            <input
              className="input-field"
              placeholder="Discount label"
              value={newPlanForm.discountLabel}
              onChange={(event) => handleNewPlanChange('discountLabel', event.target.value)}
            />
          </div>
          <textarea
            className="input-field"
            placeholder="Short description"
            value={newPlanForm.description}
            onChange={(event) => handleNewPlanChange('description', event.target.value)}
            rows={2}
          />
          <textarea
            className="input-field"
            placeholder="Features (one per line)"
            value={newPlanForm.features}
            onChange={(event) => handleNewPlanChange('features', event.target.value)}
            rows={3}
          />
          <button className="gradient-button" type="submit" disabled={creatingPlan}>
            {creatingPlan ? 'Creating plan…' : 'Add plan'}
          </button>
        </form>

        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {plans.map((plan) => {
            const form = planForms[plan.slug] ?? planToForm(plan);
            return (
              <div
                key={plan.slug}
                className="glass-card"
                style={{ padding: '1.25rem', border: '1px solid rgba(255,255,255,0.08)', display: 'grid', gap: '0.9rem' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                  <strong style={{ fontSize: '1.1rem' }}>{plan.name}</strong>
                  <span className="pill">Slug: {plan.slug}</span>
                  {plan.isFeatured && <span className="pill">Featured</span>}
                </div>
                <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                  <input
                    className="input-field"
                    value={form.name}
                    onChange={(event) => handlePlanFormChange(plan.slug, 'name', event.target.value)}
                    placeholder="Plan name"
                  />
                  <input
                    className="input-field"
                    value={form.currency}
                    onChange={(event) => handlePlanFormChange(plan.slug, 'currency', event.target.value)}
                    placeholder="Currency"
                  />
                  <input
                    className="input-field"
                    value={form.seatPrice}
                    onChange={(event) => handlePlanFormChange(plan.slug, 'seatPrice', event.target.value)}
                    placeholder="Seat price"
                  />
                  <input
                    className="input-field"
                    value={form.billingInterval}
                    onChange={(event) => handlePlanFormChange(plan.slug, 'billingInterval', event.target.value)}
                    placeholder="Billing interval"
                  />
                  <input
                    className="input-field"
                    value={form.minSeats}
                    onChange={(event) => handlePlanFormChange(plan.slug, 'minSeats', event.target.value)}
                    placeholder="Minimum seats"
                  />
                  <input
                    className="input-field"
                    value={form.discountPercent}
                    onChange={(event) => handlePlanFormChange(plan.slug, 'discountPercent', event.target.value)}
                    placeholder="Discount %"
                  />
                  <input
                    className="input-field"
                    value={form.discountLabel}
                    onChange={(event) => handlePlanFormChange(plan.slug, 'discountLabel', event.target.value)}
                    placeholder="Discount label"
                  />
                </div>
                <textarea
                  className="input-field"
                  value={form.description}
                  onChange={(event) => handlePlanFormChange(plan.slug, 'description', event.target.value)}
                  rows={2}
                />
                <textarea
                  className="input-field"
                  value={form.features}
                  onChange={(event) => handlePlanFormChange(plan.slug, 'features', event.target.value)}
                  rows={3}
                  placeholder="Features (one per line)"
                />
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                  <input
                    type="checkbox"
                    checked={form.isFeatured}
                    onChange={(event) => handlePlanFormChange(plan.slug, 'isFeatured', event.target.checked)}
                  />
                  Featured plan
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    className="gradient-button"
                    type="button"
                    onClick={() => handlePlanSave(plan.slug)}
                    disabled={planSavingSlug === plan.slug}
                  >
                    {planSavingSlug === plan.slug ? 'Saving…' : 'Save changes'}
                  </button>
                  <button
                    className="pill"
                    type="button"
                    style={{ cursor: 'pointer', borderColor: 'rgba(248,113,113,0.45)', color: '#fecaca' }}
                    onClick={() => handlePlanDelete(plan.slug)}
                    disabled={planDeletingSlug === plan.slug}
                  >
                    {planDeletingSlug === plan.slug ? 'Removing…' : 'Delete'}
                  </button>
                </div>
              </div>
            );
          })}
          {plans.length === 0 && !plansLoading && (
            <p className="text-muted" style={{ margin: 0 }}>
              No pricing plans yet. Create one above to get started.
            </p>
          )}
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
