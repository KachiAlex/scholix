const BASE_PATH = '/api/platform/tenants';

type CountSummary = {
  memberships: number;
  students: number;
  classes: number;
  subjects: number;
};

export type PlatformTenantSummary = {
  id: string;
  name: string;
  licenseSeats: number;
  licenseExpiresAt: string | null;
  licenseNotes: string | null;
  isSuspended: boolean;
  createdAt: string;
  updatedAt: string;
  _count: CountSummary;
};

function normalizeCountSummary(value: unknown): CountSummary {
  const maybe = value as Partial<CountSummary> | null;
  return {
    memberships: typeof maybe?.memberships === 'number' ? maybe.memberships : 0,
    students: typeof maybe?.students === 'number' ? maybe.students : 0,
    classes: typeof maybe?.classes === 'number' ? maybe.classes : 0,
    subjects: typeof maybe?.subjects === 'number' ? maybe.subjects : 0,
  };
}

function normalizeTenant(raw: unknown): PlatformTenantSummary {
  const tenant = raw as Partial<PlatformTenantSummary> | null;
  return {
    id: typeof tenant?.id === 'string' ? tenant.id : '',
    name: typeof tenant?.name === 'string' ? tenant.name : '',
    licenseSeats: typeof tenant?.licenseSeats === 'number' ? tenant.licenseSeats : 100,
    licenseExpiresAt: typeof tenant?.licenseExpiresAt === 'string' ? tenant.licenseExpiresAt : null,
    licenseNotes: typeof tenant?.licenseNotes === 'string' ? tenant.licenseNotes : null,
    isSuspended: typeof tenant?.isSuspended === 'boolean' ? tenant.isSuspended : false,
    createdAt: typeof tenant?.createdAt === 'string' ? tenant.createdAt : new Date(0).toISOString(),
    updatedAt: typeof tenant?.updatedAt === 'string' ? tenant.updatedAt : new Date(0).toISOString(),
    _count: normalizeCountSummary((tenant as any)?._count),
  };
}

export type UpdatePlatformTenantPayload = Partial<{
  name: string;
  licenseSeats: number;
  licenseExpiresAt: string | null;
  licenseNotes: string | null;
  isSuspended: boolean;
}>;

function buildAuthHeaders(token: string, extra?: HeadersInit): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    ...(extra ?? {}),
  };
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.ok) {
    return res.json();
  }
  const body = await res.json().catch(() => ({ message: 'Request failed' }));
  throw new Error(body.message || 'Request failed');
}

export async function fetchPlatformTenants(token: string): Promise<PlatformTenantSummary[]> {
  const res = await fetch(BASE_PATH, {
    headers: buildAuthHeaders(token),
    cache: 'no-store',
  });
  const data = await handleResponse<unknown>(res);
  return Array.isArray(data) ? data.map(normalizeTenant) : [];
}

export async function createPlatformTenant(token: string, name: string): Promise<PlatformTenantSummary> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error('Tenant name is required');
  }
  const res = await fetch(BASE_PATH, {
    method: 'POST',
    headers: buildAuthHeaders(token, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({ name: trimmed }),
  });
  const data = await handleResponse<unknown>(res);
  return normalizeTenant(data);
}

export async function updatePlatformTenant(
  token: string,
  tenantId: string,
  payload: UpdatePlatformTenantPayload,
): Promise<PlatformTenantSummary> {
  const res = await fetch(`${BASE_PATH}/${tenantId}`, {
    method: 'PATCH',
    headers: buildAuthHeaders(token, { 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  const data = await handleResponse<unknown>(res);
  return normalizeTenant(data);
}

export async function suspendPlatformTenant(token: string, tenantId: string, isSuspended: boolean) {
  return updatePlatformTenant(token, tenantId, { isSuspended });
}

export async function deletePlatformTenant(token: string, tenantId: string): Promise<void> {
  const res = await fetch(`${BASE_PATH}/${tenantId}`, {
    method: 'DELETE',
    headers: buildAuthHeaders(token),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(body.message || 'Unable to delete tenant');
  }
}
