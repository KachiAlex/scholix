const BASE_PATH = '/api/platform/plans';

export type PlatformPlan = {
  slug: string;
  name: string;
  description: string | null;
  currency: string;
  seatPrice: number;
  billingInterval: string;
  minSeats: number;
  discountPercent: number | null;
  discountLabel: string | null;
  features: string[];
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
};

type RequestOptions = {
  token?: string;
  method?: string;
  body?: any;
};

async function request<T>(path: string, { token, method = 'GET', body }: RequestOptions = {}): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    cache: method === 'GET' ? 'no-store' : undefined,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(data.message || 'Request failed');
  }

  return res.json();
}

export function fetchPlatformPlans(): Promise<PlatformPlan[]> {
  return request<PlatformPlan[]>(BASE_PATH);
}

export function createPlatformPlanClient(token: string, payload: Partial<PlatformPlan>): Promise<PlatformPlan> {
  return request<PlatformPlan>(BASE_PATH, { token, method: 'POST', body: payload });
}

export function updatePlatformPlanClient(
  token: string,
  slug: string,
  payload: Partial<PlatformPlan> & { slug?: string },
): Promise<PlatformPlan> {
  return request<PlatformPlan>(`${BASE_PATH}/${slug}`, { token, method: 'PATCH', body: payload });
}

export function deletePlatformPlanClient(token: string, slug: string): Promise<{ ok: true }> {
  return request<{ ok: true }>(`${BASE_PATH}/${slug}`, { token, method: 'DELETE' });
}
