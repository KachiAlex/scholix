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
  createdAt: string;
  updatedAt: string;
  _count: CountSummary;
};

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
