'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTenantContext } from '@/components/portal/TenantContextProvider';
import {
  ResultDraftStatus,
  ResultDraftPayload,
  ResultTemplatePayload,
  createResultDraft,
  createResultTemplate,
  fetchResultDrafts,
  fetchResultTemplates,
} from '@/lib/results';
import { getAccessToken } from '@/lib/client-auth';

const STATUS_OPTIONS: (ResultDraftStatus | 'all')[] = ['all', ...Object.values(ResultDraftStatus)];

function useToken(): string | null {
  const [token] = useState(() => getAccessToken());
  return token;
}

export default function ResultsPage() {
  const { context, loading: contextLoading, error: contextError } = useTenantContext();
  const token = useToken();
  const [templates, setTemplates] = useState<ResultTemplatePayload[]>([]);
  const [drafts, setDrafts] = useState<ResultDraftPayload[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);

  const [newTemplate, setNewTemplate] = useState({ name: '', description: '' });
  const [newDraft, setNewDraft] = useState({ templateId: '', studentId: '', termId: '', totalScore: '', notes: '' });
  const [filterTemplateId, setFilterTemplateId] = useState<'all' | string>('all');
  const [filterStatus, setFilterStatus] = useState<ResultDraftStatus | 'all'>('all');

  const canManage = useMemo(() => ['ADMIN', 'OWNER'].includes(context?.tenantRole ?? ''), [context?.tenantRole]);

  const ensureToken = useCallback(() => {
    if (!token) throw new Error('unauthorized');
    return token;
  }, [token]);

  const handleError = useCallback((err: unknown) => {
    if (err instanceof Error) {
      setPageError(err.message);
    } else {
      setPageError('Something went wrong');
    }
  }, []);

  const loadTemplates = useCallback(async () => {
    if (!context?.school) return;
    setTemplatesLoading(true);
    setPageError(null);
    try {
      const res = await fetchResultTemplates(ensureToken());
      setTemplates(res);
    } catch (err) {
      handleError(err);
    } finally {
      setTemplatesLoading(false);
    }
  }, [context?.school, ensureToken, handleError]);

  const loadDrafts = useCallback(
    async (opts?: { templateId?: string; status?: ResultDraftStatus }) => {
      if (!context?.school) return;
      setDraftsLoading(true);
      setPageError(null);
      try {
        const res = await fetchResultDrafts(ensureToken(), opts);
        setDrafts(res);
      } catch (err) {
        handleError(err);
      } finally {
        setDraftsLoading(false);
      }
    },
    [context?.school, ensureToken, handleError],
  );

  useEffect(() => {
    if (!context?.school || !canManage) {
      setTemplates([]);
      setDrafts([]);
      return;
    }
    void loadTemplates();
    void loadDrafts();
  }, [context?.school?.id, canManage, loadDrafts, loadTemplates]);

  const sessionLabel = context?.activeSession?.name ?? 'No session selected';
  const termLabel = context?.activeTerm?.name ?? 'No term selected';

  const onCreateTemplate = async () => {
    if (!newTemplate.name.trim()) {
      setPageError('Template name is required');
      return;
    }
    setPageError(null);
    try {
      await createResultTemplate(ensureToken(), {
        name: newTemplate.name,
        description: newTemplate.description || undefined,
      });
      setNewTemplate({ name: '', description: '' });
      await loadTemplates();
    } catch (err) {
      handleError(err);
    }
  };

  const onApplyFilters = () => {
    void loadDrafts({
      templateId: filterTemplateId === 'all' ? undefined : filterTemplateId,
      status: filterStatus === 'all' ? undefined : filterStatus,
    });
  };

  const onCreateDraft = async () => {
    if (!newDraft.templateId || !newDraft.studentId.trim()) {
      setPageError('Template and student ID are required');
      return;
    }
    setPageError(null);
    try {
      await createResultDraft(ensureToken(), {
        templateId: newDraft.templateId,
        studentId: newDraft.studentId.trim(),
        termId: newDraft.termId.trim() || undefined,
        totalScore: newDraft.totalScore ? Number(newDraft.totalScore) : undefined,
        notes: newDraft.notes?.trim() || undefined,
      });
      setNewDraft({ templateId: newDraft.templateId, studentId: '', termId: '', totalScore: '', notes: '' });
      await loadDrafts({
        templateId: filterTemplateId === 'all' ? undefined : filterTemplateId,
        status: filterStatus === 'all' ? undefined : filterStatus,
      });
    } catch (err) {
      handleError(err);
    }
  };

  if (contextLoading) {
    return <p className="text-muted">Loading results workspace…</p>;
  }

  if (contextError && contextError !== 'unauthorized') {
    return <p className="form-error">{contextError}</p>;
  }

  if (!context?.school) {
    return (
      <section style={{ display: 'grid', gap: '0.75rem' }}>
        <h1 style={{ margin: 0 }}>Results</h1>
        <p className="text-muted" style={{ margin: 0 }}>
          Switch to a tenant workspace to work on CA + results.
        </p>
      </section>
    );
  }

  if (!canManage) {
    return (
      <section style={{ display: 'grid', gap: '0.75rem' }}>
        <h1 style={{ margin: 0 }}>Results</h1>
        <p className="text-muted" style={{ margin: 0 }}>
          You need ADMIN access for {context.school.name} to manage templates and drafts.
        </p>
      </section>
    );
  }

  return (
    <section style={{ display: 'grid', gap: '1.5rem' }}>
      <header style={{ display: 'grid', gap: '0.35rem' }}>
        <p className="pill" style={{ width: 'fit-content', fontSize: 13 }}>
          {context.school.shortCode ?? context.school.name} · {context.tenantRole ?? 'Member'}
        </p>
        <h1 style={{ margin: 0 }}>Results workspace</h1>
        <p className="text-muted" style={{ margin: 0 }}>
          {sessionLabel} · {termLabel}
        </p>
      </header>

      {pageError ? <p className="form-error">{pageError}</p> : null}

      <div className="glass-card" style={{ padding: '1.5rem', display: 'grid', gap: '1rem' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Result templates</h2>
            <p className="text-muted" style={{ margin: 0 }}>
              Define grading schemas and computation configs per school.
            </p>
          </div>
          <button className="secondary" onClick={() => void loadTemplates()} disabled={templatesLoading}>
            {templatesLoading ? 'Refreshing…' : 'Refresh'}
          </button>
        </header>

        {templates.length === 0 ? (
          <p className="text-muted" style={{ margin: 0 }}>
            No templates yet. Create one to start managing drafts.
          </p>
        ) : (
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {templates.map((template) => (
              <article key={template.id} className="card-row">
                <div>
                  <strong>{template.name}</strong>
                  <p className="text-muted" style={{ margin: 0 }}>
                    {template.description || 'No description'}
                  </p>
                </div>
                <span style={{ fontSize: 12, opacity: 0.75 }}>{new Date(template.updatedAt).toLocaleString()}</span>
              </article>
            ))}
          </div>
        )}

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1rem', display: 'grid', gap: '0.75rem' }}>
          <h3 style={{ margin: 0, fontSize: '1rem' }}>New template</h3>
          <div style={{ display: 'grid', gap: '0.65rem' }}>
            <input
              placeholder="Template name"
              value={newTemplate.name}
              onChange={(e) => setNewTemplate((prev) => ({ ...prev, name: e.target.value }))}
            />
            <textarea
              placeholder="Optional description"
              value={newTemplate.description}
              onChange={(e) => setNewTemplate((prev) => ({ ...prev, description: e.target.value }))}
            />
            <button onClick={onCreateTemplate} disabled={templatesLoading}>
              Create template
            </button>
          </div>
        </div>
      </div>

      <div className="glass-card" style={{ padding: '1.5rem', display: 'grid', gap: '1rem' }}>
        <header style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Result drafts</h2>
            <p className="text-muted" style={{ margin: 0 }}>
              Filter drafts by template and status to monitor progress.
            </p>
          </div>
          <button className="secondary" onClick={onApplyFilters} disabled={draftsLoading}>
            {draftsLoading ? 'Filtering…' : 'Apply filters'}
          </button>
        </header>

        <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))' }}>
          <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
            Template
            <select value={filterTemplateId} onChange={(e) => setFilterTemplateId(e.target.value as any)}>
              <option value="all">All templates</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
            Status
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as ResultDraftStatus | 'all')}>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status === 'all' ? 'All statuses' : capitalize(status)}
                </option>
              ))}
            </select>
          </label>
        </div>

        {drafts.length === 0 ? (
          <p className="text-muted" style={{ margin: 0 }}>
            No drafts match the selected filters.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Template</th>
                  <th>Status</th>
                  <th>Total</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {drafts.map((draft) => (
                  <tr key={draft.id}>
                    <td>
                      {draft.student.firstName} {draft.student.lastName}
                    </td>
                    <td>{draft.template.name}</td>
                    <td>{capitalize(draft.status)}</td>
                    <td>{draft.totalScore ?? '—'}</td>
                    <td>{new Date(draft.updatedAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1rem', display: 'grid', gap: '0.65rem' }}>
          <h3 style={{ margin: 0, fontSize: '1rem' }}>Quick draft capture</h3>
          <div style={{ display: 'grid', gap: '0.65rem', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))' }}>
            <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
              Template
              <select
                value={newDraft.templateId}
                onChange={(e) => setNewDraft((prev) => ({ ...prev, templateId: e.target.value }))}
              >
                <option value="">Select template</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
              Student ID
              <input
                placeholder="stu_xxxx"
                value={newDraft.studentId}
                onChange={(e) => setNewDraft((prev) => ({ ...prev, studentId: e.target.value }))}
              />
            </label>
            <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
              Term ID (optional)
              <input
                placeholder="term_xxxx"
                value={newDraft.termId}
                onChange={(e) => setNewDraft((prev) => ({ ...prev, termId: e.target.value }))}
              />
            </label>
            <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
              Total score
              <input
                type="number"
                placeholder="e.g. 78.5"
                value={newDraft.totalScore}
                onChange={(e) => setNewDraft((prev) => ({ ...prev, totalScore: e.target.value }))}
              />
            </label>
          </div>
          <textarea
            placeholder="Notes (optional)"
            value={newDraft.notes}
            onChange={(e) => setNewDraft((prev) => ({ ...prev, notes: e.target.value }))}
          />
          <button onClick={onCreateDraft} disabled={!templates.length}>
            Capture draft
          </button>
        </div>
      </div>
    </section>
  );
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}
