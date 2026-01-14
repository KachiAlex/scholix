'use client';

export type AcademicTermPayload = {
  id: string;
  sessionId: string;
  name: string;
  startsAt: string | null;
  endsAt: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type AcademicSessionPayload = {
  id: string;
  schoolId: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  terms: AcademicTermPayload[];
};

export type ActiveContextPayload = {
  schoolId: string;
  activeSessionId: string | null;
  activeTermId: string | null;
  activeSession: AcademicSessionPayload | null;
  activeTerm: AcademicTermPayload | null;
};

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.ok) {
    return res.json();
  }
  const body = await res.json().catch(() => ({ message: 'Request failed' }));
  throw new Error(body.message || 'Request failed');
}

function buildAuthHeaders(token: string, extra?: HeadersInit): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    ...(extra ?? {}),
  };
}

export async function fetchAcademicSessions(token: string): Promise<AcademicSessionPayload[]> {
  const res = await fetch('/api/sis/sessions', {
    headers: buildAuthHeaders(token),
    cache: 'no-store',
  });
  return handleResponse<AcademicSessionPayload[]>(res);
}

export async function createAcademicSession(
  token: string,
  payload: { name: string; isActive?: boolean },
): Promise<AcademicSessionPayload> {
  const res = await fetch('/api/sis/sessions', {
    method: 'POST',
    headers: buildAuthHeaders(token, { 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  return handleResponse<AcademicSessionPayload>(res);
}

export async function createAcademicTerm(
  token: string,
  sessionId: string,
  payload: { name: string; startsAt?: string | null; endsAt?: string | null },
): Promise<AcademicTermPayload> {
  const res = await fetch(`/api/sis/sessions/${sessionId}/terms`, {
    method: 'POST',
    headers: buildAuthHeaders(token, { 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  return handleResponse<AcademicTermPayload>(res);
}

export async function setActiveAcademicContext(
  token: string,
  payload: { sessionId?: string | null; termId?: string | null },
): Promise<ActiveContextPayload> {
  const res = await fetch('/api/sis/active', {
    method: 'PUT',
    headers: buildAuthHeaders(token, { 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  return handleResponse<ActiveContextPayload>(res);
}
