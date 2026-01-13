'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { getAccessToken } from '@/lib/client-auth';

export type TenantTerm = {
  id: string;
  name: string;
  startsAt: string | null;
  endsAt: string | null;
};

export type TenantSession = {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  terms: TenantTerm[];
};

export type TenantMembership = {
  schoolId: string;
  schoolName: string;
  tenantRole: string;
};

export type TenantFeatureFlag = {
  id: string;
  slug: string;
  isEnabled: boolean;
  config: unknown;
};

export type TenantContextPayload = {
  userId: string;
  email: string;
  systemRoles: string[];
  school: {
    id: string;
    name: string;
    logoUrl: string | null;
    primaryColor: string | null;
    secondaryColor: string | null;
    accentColor: string | null;
    tagline: string | null;
    shortCode: string | null;
    location: string | null;
  } | null;
  memberships: TenantMembership[];
  tenantRole: string | null;
  activeSession: TenantSession | null;
  activeTerm: TenantTerm | null;
  sessions: TenantSession[];
  featureFlags: TenantFeatureFlag[];
  auditSummary: { pendingAlerts: number; lastEventAt: string | null };
};

type TenantContextValue = {
  context: TenantContextPayload | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  updateSelector: (selector: { schoolId?: string; sessionId?: string; termId?: string }) => Promise<void>;
};

const TenantContext = createContext<TenantContextValue | undefined>(undefined);

export function useTenantContext() {
  const value = useContext(TenantContext);
  if (!value) {
    throw new Error('useTenantContext must be used within a TenantContextProvider');
  }
  return value;
}

export function TenantContextProvider({ children }: { children: ReactNode }) {
  const [context, setContext] = useState<TenantContextPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContext = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      setLoading(false);
      setError('unauthorized');
      setContext(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/portal/context', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: 'Unable to load portal context' }));
        throw new Error(body.message || 'Unable to load portal context');
      }
      const data = (await res.json()) as TenantContextPayload;
      setContext(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load portal context');
      setContext(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchContext();
  }, [fetchContext]);

  const updateSelector = useCallback(
    async (selector: { schoolId?: string; sessionId?: string; termId?: string }) => {
      const token = getAccessToken();
      if (!token) {
        setError('unauthorized');
        return;
      }
      const res = await fetch('/api/portal/context/selector', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(selector),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: 'Unable to update selector' }));
        throw new Error(body.message || 'Unable to update selector');
      }
      await fetchContext();
    },
    [fetchContext],
  );

  const value = useMemo<TenantContextValue>(
    () => ({
      context,
      loading,
      error,
      refresh: fetchContext,
      updateSelector,
    }),
    [context, loading, error, fetchContext, updateSelector],
  );

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}
