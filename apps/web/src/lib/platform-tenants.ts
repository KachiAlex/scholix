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
  return handleResponse<PlatformTenantSummary[]>(res);
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
  return handleResponse<PlatformTenantSummary>(res);
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
  return handleResponse<PlatformTenantSummary>(res);
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
