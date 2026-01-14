'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { useTenantContext } from '@/components/portal/TenantContextProvider';
import { useAcademicSessions } from '@/hooks/useAcademicSessions';

type TermFormState = {
  name: string;
  startsAt: string;
  endsAt: string;
};

export default function AcademicsPage() {
  const { context, loading, error } = useTenantContext();
  const {
    sessions,
    loading: sessionsLoading,
    error: sessionsError,
    createSession,
    createTerm,
    setActiveSession,
    setActiveTerm,
    canManage,
  } = useAcademicSessions();

  const [sessionName, setSessionName] = useState('');
  const [sessionActivate, setSessionActivate] = useState(true);
  const [termForms, setTermForms] = useState<Record<string, TermFormState>>({});
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const activeSessionId = context?.activeSession?.id ?? null;
  const activeTermId = context?.activeTerm?.id ?? null;

  const isLoading = loading || sessionsLoading;
  const fatalError = error && error !== 'unauthorized' ? error : sessionsError;

  const roleLabel = context?.tenantRole ?? 'Member';
  const schoolLabel = context?.school?.shortCode ?? context?.school?.name ?? 'No school';

  const sortedSessions = useMemo(
    () => sessions.slice().sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [sessions],
  );

  if (isLoading) {
    return (
      <section style={{ display: 'grid', gap: '0.75rem' }}>
        <h1 style={{ margin: 0 }}>Academics</h1>
        <p className="text-muted" style={{ margin: 0 }}>
          Loading academic context…
        </p>
      </section>
    );
  }

  if (fatalError) {
    return (
      <section style={{ display: 'grid', gap: '0.75rem' }}>
        <h1 style={{ margin: 0 }}>Academics</h1>
        <p className="form-error">{fatalError}</p>
      </section>
    );
  }

  if (!context?.school) {
    return (
      <section style={{ display: 'grid', gap: '0.75rem' }}>
        <h1 style={{ margin: 0 }}>Academics</h1>
        <p className="text-muted" style={{ margin: 0 }}>
          Switch to a school workspace to manage academic sessions and terms.
        </p>
      </section>
    );
  }

  const setTermFormValue = (sessionId: string, change: Partial<TermFormState>) => {
    setTermForms((prev) => ({
      ...prev,
      [sessionId]: {
        name: change.name ?? prev[sessionId]?.name ?? '',
        startsAt: change.startsAt ?? prev[sessionId]?.startsAt ?? '',
        endsAt: change.endsAt ?? prev[sessionId]?.endsAt ?? '',
      },
    }));
  };

  const handleCreateSession = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActionMessage(null);
    setActionError(null);

    if (!sessionName.trim()) {
      setActionError('Provide a session name.');
      return;
    }
    setBusyKey('create-session');
    try {
      await createSession({ name: sessionName.trim(), isActive: sessionActivate });
      setSessionName('');
      setSessionActivate(true);
      setActionMessage('Session created successfully.');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to create session.');
    } finally {
      setBusyKey(null);
    }
  };

  const handleCreateTerm = async (sessionId: string) => {
    setActionMessage(null);
    setActionError(null);
    const form = termForms[sessionId] ?? { name: '', startsAt: '', endsAt: '' };
    if (!form.name.trim()) {
      setActionError('Provide a term name before saving.');
      return;
    }
    setBusyKey(`term:${sessionId}`);
    try {
      await createTerm(sessionId, {
        name: form.name.trim(),
        startsAt: form.startsAt || null,
        endsAt: form.endsAt || null,
      });
      setTermForms((prev) => ({ ...prev, [sessionId]: { name: '', startsAt: '', endsAt: '' } }));
      setActionMessage('Term added.');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to create term.');
    } finally {
      setBusyKey(null);
    }
  };

  const handleActivateSession = async (sessionId: string) => {
    setActionMessage(null);
    setActionError(null);
    setBusyKey(`activate-session:${sessionId}`);
    try {
      await setActiveSession(sessionId);
      setActionMessage('Active session updated.');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to set active session.');
    } finally {
      setBusyKey(null);
    }
  };

  const handleActivateTerm = async (sessionId: string, termId: string) => {
    setActionMessage(null);
    setActionError(null);
    setBusyKey(`activate-term:${termId}`);
    try {
      await setActiveTerm(sessionId, termId);
      setActionMessage('Active term updated.');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to set active term.');
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <section style={{ display: 'grid', gap: '1.5rem' }}>
      <header style={{ display: 'grid', gap: '0.25rem' }}>
        <p className="pill" style={{ width: 'fit-content', fontSize: 13 }}>
          {schoolLabel} · {roleLabel}
        </p>
        <h1 style={{ margin: 0 }}>Academic Sessions</h1>
        <p className="text-muted" style={{ margin: 0 }}>
          {context.activeSession?.name ?? 'No active session'} ·{' '}
          {context.activeTerm?.name ?? 'No active term'}
        </p>
      </header>

      {!canManage && (
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <p style={{ margin: 0, fontWeight: 600 }}>View only</p>
          <p className="text-muted" style={{ margin: '0.35rem 0 0' }}>
            You need ADMIN access to change academic sessions. Contact an owner to elevate your role.
          </p>
        </div>
      )}

      <div
        className="glass-card"
        style={{ padding: '1.5rem', display: 'grid', gap: '0.85rem', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div>
          <p style={{ margin: 0, fontWeight: 600 }}>Create session</p>
          <p className="text-muted" style={{ margin: 0 }}>
            Stand up a new academic session and optionally activate it immediately.
          </p>
        </div>
        <form onSubmit={handleCreateSession} style={{ display: 'grid', gap: '0.75rem', maxWidth: 520 }}>
          <input
            className="input-field"
            placeholder="e.g. 2024 / 2025"
            value={sessionName}
            onChange={(event) => setSessionName(event.target.value)}
            disabled={!canManage}
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: 14 }}>
            <input
              type="checkbox"
              checked={sessionActivate}
              onChange={(event) => setSessionActivate(event.target.checked)}
              disabled={!canManage}
            />
            Make this the active session now
          </label>
          <button className="gradient-button" type="submit" disabled={!canManage || busyKey === 'create-session'}>
            {busyKey === 'create-session' ? 'Creating…' : 'Create session'}
          </button>
        </form>
      </div>

      {(actionMessage || actionError) && (
        <div
          className="glass-card"
          style={{
            padding: '1rem',
            border: `${
              actionError ? 'rgba(248,113,113,0.4)' : 'rgba(125,211,252,0.4)'
            }`,
          }}
        >
          <p style={{ margin: 0 }} className={actionError ? 'form-error' : 'text-muted'}>
            {actionError ?? actionMessage}
          </p>
        </div>
      )}

      <div style={{ display: 'grid', gap: '1rem' }}>
        {sortedSessions.length === 0 && (
          <div className="glass-card" style={{ padding: '1.25rem' }}>
            <p style={{ margin: 0, fontWeight: 600 }}>No sessions yet</p>
            <p className="text-muted" style={{ margin: '0.35rem 0 0' }}>
              Create your first academic session to begin tracking terms, enrollments, and results.
            </p>
          </div>
        )}

        {sortedSessions.map((session) => {
          const termForm = termForms[session.id] ?? { name: '', startsAt: '', endsAt: '' };
          const isSessionActive = activeSessionId === session.id;

          return (
            <div
              key={session.id}
              className="glass-card"
              style={{
                padding: '1.5rem',
                display: 'grid',
                gap: '1rem',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: '0.75rem',
                }}
              >
                <div style={{ flex: 1, minWidth: 220 }}>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: '1.05rem' }}>{session.name}</p>
                  <p className="text-muted" style={{ margin: 0 }}>
                    Created {new Date(session.createdAt).toLocaleDateString()} ·{' '}
                    {session.terms.length} term{session.terms.length === 1 ? '' : 's'}
                  </p>
                </div>
                {canManage && (
                  <button
                    type="button"
                    className="pill"
                    style={{
                      cursor: 'pointer',
                      borderColor: isSessionActive ? 'rgba(125,211,252,0.5)' : 'rgba(255,255,255,0.2)',
                    }}
                    onClick={() => handleActivateSession(session.id)}
                    disabled={busyKey === `activate-session:${session.id}`}
                  >
                    {busyKey === `activate-session:${session.id}`
                      ? 'Updating…'
                      : isSessionActive
                        ? 'Active session'
                        : 'Set active session'}
                  </button>
                )}
              </div>

              <div style={{ display: 'grid', gap: '0.6rem' }}>
                {session.terms.length === 0 && (
                  <p className="text-muted" style={{ margin: 0 }}>
                    No terms yet. Add one below.
                  </p>
                )}

                {session.terms.map((term) => {
                  const isTermActive = activeTermId === term.id;
                  return (
                    <div
                      key={term.id}
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '0.5rem',
                        alignItems: 'center',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 12,
                        padding: '0.75rem 1rem',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <p style={{ margin: 0, fontWeight: 600 }}>{term.name}</p>
                        <p className="text-muted" style={{ margin: 0 }}>
                          {term.startsAt
                            ? `${new Date(term.startsAt).toLocaleDateString()} – ${term.endsAt ? new Date(term.endsAt).toLocaleDateString() : 'No end'}`
                            : 'Dates not set'}
                        </p>
                      </div>
                      {canManage && (
                        <button
                          type="button"
                          className="pill"
                          style={{
                            cursor: 'pointer',
                            borderColor: isTermActive ? 'rgba(187,247,208,0.5)' : 'rgba(255,255,255,0.2)',
                          }}
                          onClick={() => handleActivateTerm(session.id, term.id)}
                          disabled={busyKey === `activate-term:${term.id}`}
                        >
                          {busyKey === `activate-term:${term.id}`
                            ? 'Updating…'
                            : isTermActive
                              ? 'Active term'
                              : 'Set active term'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {canManage && (
                <div
                  style={{
                    marginTop: '0.25rem',
                    borderTop: '1px solid rgba(255,255,255,0.08)',
                    paddingTop: '0.75rem',
                    display: 'grid',
                    gap: '0.5rem',
                  }}
                >
                  <p style={{ margin: 0, fontWeight: 600 }}>Add term</p>
                  <div style={{ display: 'grid', gap: '0.5rem', maxWidth: 640 }}>
                    <input
                      className="input-field"
                      placeholder="Term name (e.g. First Term)"
                      value={termForm.name}
                      onChange={(event) =>
                        setTermFormValue(session.id, { name: event.target.value })
                      }
                    />
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <input
                        className="input-field"
                        type="date"
                        value={termForm.startsAt}
                        onChange={(event) =>
                          setTermFormValue(session.id, { startsAt: event.target.value })
                        }
                        style={{ flex: 1, minWidth: 150 }}
                      />
                      <input
                        className="input-field"
                        type="date"
                        value={termForm.endsAt}
                        onChange={(event) =>
                          setTermFormValue(session.id, { endsAt: event.target.value })
                        }
                        style={{ flex: 1, minWidth: 150 }}
                      />
                    </div>
                    <button
                      className="gradient-button"
                      type="button"
                      onClick={() => handleCreateTerm(session.id)}
                      disabled={busyKey === `term:${session.id}`}
                    >
                      {busyKey === `term:${session.id}` ? 'Saving…' : 'Save term'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
