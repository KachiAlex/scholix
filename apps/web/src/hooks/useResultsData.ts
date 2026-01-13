'use client';

import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { useTenantContext } from '@/components/portal/TenantContextProvider';
import { getAccessToken } from '@/lib/client-auth';
import {
  createResultDraft,
  createResultTemplate,
  fetchResultDrafts,
  fetchResultTemplates,
  updateResultDraft,
  updateResultTemplate,
  type ResultDraftPayload,
  type ResultTemplatePayload,
  ResultDraftStatus,
} from '@/lib/results';

type DraftFilters = {
  templateId?: string;
  status?: ResultDraftStatus;
};

type UseResultsDataReturn = {
  templates: ResultTemplatePayload[];
  templatesLoading: boolean;
  templatesError: string | null;
  drafts: ResultDraftPayload[];
  draftsLoading: boolean;
  draftsError: string | null;
  draftFilters: DraftFilters;
  setDraftFilters: Dispatch<SetStateAction<DraftFilters>>;
  refreshTemplates: () => Promise<void>;
  refreshDrafts: () => Promise<void>;
  createTemplate: (payload: { name: string; description?: string | null; gradingConfig?: unknown }) => Promise<ResultTemplatePayload>;
  updateTemplate: (
    templateId: string,
    payload: Partial<{ name: string; description: string | null; gradingConfig: unknown; isArchived: boolean }>,
  ) => Promise<ResultTemplatePayload>;
  createDraft: (payload: {
    templateId: string;
    studentId: string;
    termId?: string | null;
    totalScore?: number | null;
    data?: unknown;
    notes?: string | null;
  }) => Promise<ResultDraftPayload>;
  updateDraft: (
    draftId: string,
    payload: Partial<{ status: ResultDraftStatus; totalScore: number | null; data: unknown; notes: string | null; publishedAt: string | null }>,
  ) => Promise<ResultDraftPayload>;
  canManage: boolean;
};

function resolveTokenOrThrow() {
  const token = getAccessToken();
  if (!token) {
    throw new Error('Please sign in again to manage results.');
  }
  return token;
}

export function useResultsData(): UseResultsDataReturn {
  const { context } = useTenantContext();
  const canManage = useMemo(() => ['ADMIN', 'OWNER'].includes(context?.tenantRole ?? ''), [context?.tenantRole]);

  const [templates, setTemplates] = useState<ResultTemplatePayload[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templatesError, setTemplatesError] = useState<string | null>(null);

  const [drafts, setDrafts] = useState<ResultDraftPayload[]>([]);
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [draftsError, setDraftsError] = useState<string | null>(null);
  const [draftFilters, setDraftFilters] = useState<DraftFilters>({});

  const loadTemplates = useCallback(async () => {
    if (!context?.school?.id || !canManage) {
      setTemplates([]);
      setTemplatesError(null);
      setTemplatesLoading(false);
      return;
    }

    setTemplatesLoading(true);
    setTemplatesError(null);
    try {
      const token = resolveTokenOrThrow();
      const data = await fetchResultTemplates(token);
      setTemplates(data);
    } catch (err) {
      setTemplatesError(err instanceof Error ? err.message : 'Unable to load result templates');
    } finally {
      setTemplatesLoading(false);
    }
  }, [context?.school?.id, canManage]);

  const loadDrafts = useCallback(async () => {
    if (!context?.school?.id || !canManage) {
      setDrafts([]);
      setDraftsError(null);
      setDraftsLoading(false);
      return;
    }

    setDraftsLoading(true);
    setDraftsError(null);
    try {
      const token = resolveTokenOrThrow();
      const data = await fetchResultDrafts(token, draftFilters);
      setDrafts(data);
    } catch (err) {
      setDraftsError(err instanceof Error ? err.message : 'Unable to load result drafts');
    } finally {
      setDraftsLoading(false);
    }
  }, [context?.school?.id, canManage, draftFilters]);

  useEffect(() => {
    if (context?.school?.id && canManage) {
      void loadTemplates();
    } else {
      setTemplates([]);
      setTemplatesError(null);
      setTemplatesLoading(false);
    }
  }, [canManage, context?.school?.id, loadTemplates]);

  useEffect(() => {
    if (context?.school?.id && canManage) {
      void loadDrafts();
    } else {
      setDrafts([]);
      setDraftsError(null);
      setDraftsLoading(false);
    }
  }, [canManage, context?.school?.id, loadDrafts]);

  const createTemplate = useCallback(
    async (payload: { name: string; description?: string | null; gradingConfig?: unknown }) => {
      if (!canManage) {
        throw new Error('You need ADMIN access to manage result templates.');
      }
      const token = resolveTokenOrThrow();
      const template = await createResultTemplate(token, payload);
      setTemplates((prev) => [template, ...prev]);
      return template;
    },
    [canManage],
  );

  const updateTemplate = useCallback(
    async (
      templateId: string,
      payload: Partial<{ name: string; description: string | null; gradingConfig: unknown; isArchived: boolean }>,
    ) => {
      if (!canManage) {
        throw new Error('You need ADMIN access to manage result templates.');
      }
      const token = resolveTokenOrThrow();
      const updated = await updateResultTemplate(token, templateId, payload);
      setTemplates((prev) => prev.map((template) => (template.id === templateId ? updated : template)));
      return updated;
    },
    [canManage],
  );

  const createDraft = useCallback(
    async (payload: {
      templateId: string;
      studentId: string;
      termId?: string | null;
      totalScore?: number | null;
      data?: unknown;
      notes?: string | null;
    }) => {
      if (!canManage) {
        throw new Error('You need ADMIN access to manage result drafts.');
      }
      const token = resolveTokenOrThrow();
      const draft = await createResultDraft(token, payload);
      setDrafts((prev) => [draft, ...prev]);
      return draft;
    },
    [canManage],
  );

  const updateDraft = useCallback(
    async (
      draftId: string,
      payload: Partial<{ status: ResultDraftStatus; totalScore: number | null; data: unknown; notes: string | null; publishedAt: string | null }>,
    ) => {
      if (!canManage) {
        throw new Error('You need ADMIN access to manage result drafts.');
      }
      const token = resolveTokenOrThrow();
      const updated = await updateResultDraft(token, draftId, payload);
      setDrafts((prev) => prev.map((draft) => (draft.id === draftId ? updated : draft)));
      return updated;
    },
    [canManage],
  );

  const value = useMemo<UseResultsDataReturn>(
    () => ({
      templates,
      templatesLoading,
      templatesError,
      drafts,
      draftsLoading,
      draftsError,
      draftFilters,
      setDraftFilters,
      refreshTemplates: loadTemplates,
      refreshDrafts: loadDrafts,
      createTemplate,
      updateTemplate,
      createDraft,
      updateDraft,
      canManage,
    }),
    [
      templates,
      templatesLoading,
      templatesError,
      drafts,
      draftsLoading,
      draftsError,
      draftFilters,
      loadTemplates,
      loadDrafts,
      createTemplate,
      updateTemplate,
      createDraft,
      updateDraft,
      canManage,
    ],
  );

  return value;
}

export { ResultDraftStatus };
