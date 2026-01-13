import { ResultDraftStatus } from '@prisma/client';

const BASE_PATH = '/api/portal/results';

function authHeaders(token: string, extra?: HeadersInit): HeadersInit {
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

export type ResultTemplatePayload = {
  id: string;
  name: string;
  description: string | null;
  gradingConfig: unknown;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
};

export async function fetchResultTemplates(token: string): Promise<ResultTemplatePayload[]> {
  const res = await fetch(`${BASE_PATH}/templates`, {
    headers: authHeaders(token),
    cache: 'no-store',
  });
  return handleResponse(res);
}

export async function createResultTemplate(
  token: string,
  payload: { name: string; description?: string | null; gradingConfig?: unknown },
): Promise<ResultTemplatePayload> {
  const res = await fetch(`${BASE_PATH}/templates`, {
    method: 'POST',
    headers: authHeaders(token, { 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function updateResultTemplate(
  token: string,
  templateId: string,
  payload: Partial<{ name: string; description: string | null; gradingConfig: unknown; isArchived: boolean }>,
): Promise<ResultTemplatePayload> {
  const res = await fetch(`${BASE_PATH}/templates/${templateId}`, {
    method: 'PATCH',
    headers: authHeaders(token, { 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export type ResultDraftPayload = {
  id: string;
  templateId: string;
  studentId: string;
  termId: string | null;
  status: ResultDraftStatus;
  totalScore: number | null;
  data: unknown;
  notes: string | null;
  publishedAt: string | null;
  student: { id: string; firstName: string; lastName: string };
  template: { id: string; name: string };
  term: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
};

export async function fetchResultDrafts(
  token: string,
  query?: { templateId?: string; status?: ResultDraftStatus },
): Promise<ResultDraftPayload[]> {
  const params = new URLSearchParams();
  if (query?.templateId) params.set('templateId', query.templateId);
  if (query?.status) params.set('status', query.status);

  const res = await fetch(`${BASE_PATH}/drafts?${params.toString()}`, {
    headers: authHeaders(token),
    cache: 'no-store',
  });
  return handleResponse(res);
}

export async function createResultDraft(
  token: string,
  payload: { templateId: string; studentId: string; termId?: string | null; totalScore?: number | null; data?: unknown; notes?: string | null },
): Promise<ResultDraftPayload> {
  const res = await fetch(`${BASE_PATH}/drafts`, {
    method: 'POST',
    headers: authHeaders(token, { 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function updateResultDraft(
  token: string,
  draftId: string,
  payload: Partial<{ status: ResultDraftStatus; totalScore: number | null; data: unknown; notes: string | null; publishedAt: string | null }>,
): Promise<ResultDraftPayload> {
  const res = await fetch(`${BASE_PATH}/drafts/${draftId}`, {
    method: 'PATCH',
    headers: authHeaders(token, { 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export { ResultDraftStatus };
