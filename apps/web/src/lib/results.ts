export type ResultTemplatePayload = {
  id: string;
  name: string;
  weights: Record<string, number>;
  gradingBands: Record<string, unknown>;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ResultDraftStatus = 'DRAFT' | 'LOCKED' | 'PUBLISHED';

export type StudentResultDraftPayload = {
  id: string;
  studentId: string;
  sessionId: string;
  termId: string | null;
  templateId: string | null;
  payload: Record<string, unknown>;
  comments: string | null;
  status: ResultDraftStatus;
  lockedAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    studentNo: string | null;
  };
  session: {
    id: string;
    name: string;
  };
  term: {
    id: string;
    name: string;
  } | null;
  template: {
    id: string;
    name: string;
  } | null;
};

export async function fetchResultTemplates(token: string): Promise<ResultTemplatePayload[]> {
  const res = await fetch('/api/results/templates', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: 'Unable to load result templates' }));
    throw new Error(body.message || 'Unable to load result templates');
  }

  return res.json();
}

export async function publishResultTemplate(token: string, templateId: string, published: boolean) {
  const res = await fetch(`/api/results/templates/${templateId}/publish`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ published }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: 'Unable to update publish state' }));
    throw new Error(body.message || 'Unable to update publish state');
  }

  return res.json();
}

export async function duplicateResultTemplate(
  token: string,
  template: ResultTemplatePayload,
  overrides?: { name?: string },
) {
  const name = overrides?.name?.trim() || `${template.name} Copy`;
  const res = await fetch('/api/results/templates', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name,
      weights: template.weights,
      gradingBands: template.gradingBands,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: 'Unable to duplicate result template' }));
    throw new Error(body.message || 'Unable to duplicate result template');
  }

  return res.json();
}

export async function fetchResultDrafts(token: string): Promise<StudentResultDraftPayload[]> {
  const res = await fetch('/api/results/drafts', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: 'Unable to load result drafts' }));
    throw new Error(body.message || 'Unable to load result drafts');
  }

  return res.json();
}

export async function createResultDraft(
  token: string,
  payload: {
    studentId: string;
    templateId?: string | null;
    sessionId?: string | null;
    termId?: string | null;
    payload: Record<string, unknown>;
    comments?: string | null;
  },
): Promise<StudentResultDraftPayload> {
  const res = await fetch('/api/results/drafts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: 'Unable to create result draft' }));
    throw new Error(body.message || 'Unable to create result draft');
  }

  return res.json();
}

export async function updateResultDraft(
  token: string,
  draftId: string,
  payload: Partial<{
    payload: Record<string, unknown>;
    comments: string | null;
    status: ResultDraftStatus;
  }>,
): Promise<StudentResultDraftPayload> {
  const res = await fetch(`/api/results/drafts/${draftId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: 'Unable to update result draft' }));
    throw new Error(body.message || 'Unable to update result draft');
  }

  return res.json();
}

export async function createResultTemplate(
  token: string,
  template: { name: string; weights: Record<string, number>; gradingBands: Record<string, unknown> },
) {
  const res = await fetch('/api/results/templates', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(template),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: 'Unable to create result template' }));
    throw new Error(body.message || 'Unable to create result template');
  }

  return res.json();
}

export async function updateResultTemplate(
  token: string,
  templateId: string,
  payload: Partial<{
    name: string;
    weights: Record<string, number>;
    gradingBands: Record<string, unknown>;
  }>,
) {
  const res = await fetch(`/api/results/templates/${templateId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: 'Unable to update result template' }));
    throw new Error(body.message || 'Unable to update result template');
  }

  return res.json();
}
