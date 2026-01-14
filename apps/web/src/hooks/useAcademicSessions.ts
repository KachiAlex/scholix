'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTenantContext } from '@/components/portal/TenantContextProvider';
import { getAccessToken } from '@/lib/client-auth';
import {
  createAcademicSession,
  createAcademicTerm,
  fetchAcademicSessions,
  setActiveAcademicContext,
  type AcademicSessionPayload,
} from '@/lib/sis';

function resolveTokenOrThrow() {
  const token = getAccessToken();
  if (!token) {
    throw new Error('Please sign in again to manage academic sessions.');
  }
  return token;
}

export type UseAcademicSessionsReturn = {
  sessions: AcademicSessionPayload[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createSession: (payload: { name: string; isActive?: boolean }) => Promise<void>;
  createTerm: (
    sessionId: string,
    payload: { name: string; startsAt?: string | null; endsAt?: string | null },
  ) => Promise<void>;
  setActiveSession: (sessionId: string) => Promise<void>;
  setActiveTerm: (sessionId: string, termId: string) => Promise<void>;
  canManage: boolean;
};

export function useAcademicSessions(): UseAcademicSessionsReturn {
  const { context, refresh: refreshTenantContext } = useTenantContext();
  const [sessions, setSessions] = useState<AcademicSessionPayload[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canManage = useMemo(
    () => ['ADMIN', 'OWNER'].includes(context?.tenantRole ?? ''),
    [context?.tenantRole],
  );

  const loadSessions = useCallback(async () => {
    if (!context?.school?.id) {
      setSessions([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const token = resolveTokenOrThrow();
      const data = await fetchAcademicSessions(token);
      setSessions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load academic sessions');
    } finally {
      setLoading(false);
    }
  }, [context?.school?.id]);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  const createSession = useCallback(
    async (payload: { name: string; isActive?: boolean }) => {
      if (!canManage) {
        throw new Error('You need ADMIN access to manage academic sessions.');
      }
      const token = resolveTokenOrThrow();
      await createAcademicSession(token, payload);
      await Promise.all([loadSessions(), refreshTenantContext()]);
    },
    [canManage, loadSessions, refreshTenantContext],
  );

  const createTerm = useCallback(
    async (sessionId: string, payload: { name: string; startsAt?: string | null; endsAt?: string | null }) => {
      if (!canManage) {
        throw new Error('You need ADMIN access to manage academic sessions.');
      }
      const token = resolveTokenOrThrow();
      await createAcademicTerm(token, sessionId, payload);
      await Promise.all([loadSessions(), refreshTenantContext()]);
    },
    [canManage, loadSessions, refreshTenantContext],
  );

  const setActiveSession = useCallback(
    async (sessionId: string) => {
      if (!canManage) {
        throw new Error('You need ADMIN access to manage academic sessions.');
      }
      const token = resolveTokenOrThrow();
      await setActiveAcademicContext(token, { sessionId, termId: null });
      await Promise.all([loadSessions(), refreshTenantContext()]);
    },
    [canManage, loadSessions, refreshTenantContext],
  );

  const setActiveTerm = useCallback(
    async (sessionId: string, termId: string) => {
      if (!canManage) {
        throw new Error('You need ADMIN access to manage academic sessions.');
      }
      const token = resolveTokenOrThrow();
      await setActiveAcademicContext(token, { sessionId, termId });
      await Promise.all([loadSessions(), refreshTenantContext()]);
    },
    [canManage, loadSessions, refreshTenantContext],
  );

  return {
    sessions,
    loading,
    error,
    refresh: loadSessions,
    createSession,
    createTerm,
    setActiveSession,
    setActiveTerm,
    canManage,
  };
}
