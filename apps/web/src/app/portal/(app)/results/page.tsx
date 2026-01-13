'use client';

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useTenantContext } from '@/components/portal/TenantContextProvider';
import { ResultDraftStatus, useResultsData } from '@/hooks/useResultsData';
import type { ResultTemplatePayload } from '@/lib/results';

const DRAFT_STATUS_OPTIONS = Object.values(ResultDraftStatus);
const STATUS_FILTER_OPTIONS: (ResultDraftStatus | 'all')[] = ['all', ...DRAFT_STATUS_OPTIONS];

type TemplateFormState = {
  name: string;
  description: string;
  gradingConfigText: string;
};

type TemplateEditFormState = TemplateFormState & {
  isArchived: boolean;
  originalGradingConfigText: string;
};

type TemplateSnapshot = {
  name: string;
  description: string | null;
  gradingConfig: unknown;
  isArchived: boolean;
};

type TemplateHistoryEntry = {
  timestamp: string;
  before: TemplateSnapshot | null;
  after: TemplateSnapshot;
};

type ImportContext = { mode: 'create' | 'edit'; templateId?: string };

const TEMPLATE_EDIT_INITIAL_STATE: TemplateEditFormState = {
  name: '',
  description: '',
  gradingConfigText: '',
  isArchived: false,
  originalGradingConfigText: '',
};

const TEMPLATE_FORM_INITIAL_STATE: TemplateFormState = {
  name: '',
  description: '',
  gradingConfigText: '',
};

export default function ResultsPage() {
  const { context, loading: contextLoading, error: contextError } = useTenantContext();
  const {
    templates,
    templatesLoading,
    templatesError,
    drafts,
    draftsLoading,
    draftsError,
    draftFilters,
    setDraftFilters,
    refreshTemplates,
    refreshDrafts,
    createTemplate,
    updateTemplate,
    createDraft,
    updateDraft,
    canManage,
  } = useResultsData();

  const [templateForm, setTemplateForm] = useState<TemplateFormState>(TEMPLATE_FORM_INITIAL_STATE);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [templateEditFormState, setTemplateEditFormState] = useState<TemplateEditFormState>(TEMPLATE_EDIT_INITIAL_STATE);
  const [templateSaving, setTemplateSaving] = useState(false);
  const [draftForm, setDraftForm] = useState({ templateId: '', studentId: '', termId: '', totalScore: '', notes: '' });
  const [draftEditState, setDraftEditState] = useState<Record<string, { status: ResultDraftStatus; totalScore: string; notes: string }>>({});
  const [draftSavingState, setDraftSavingState] = useState<Record<string, boolean>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [expandedTemplateId, setExpandedTemplateId] = useState<string | null>(null);
  const [historyExpandedId, setHistoryExpandedId] = useState<string | null>(null);
  const [templateHistories, setTemplateHistories] = useState<Record<string, TemplateHistoryEntry[]>>({});
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [importContext, setImportContext] = useState<ImportContext | null>(null);

  useEffect(() => {
    setTemplateHistories((prev) => {
      let mutated = false;
      const next = { ...prev };
      templates.forEach((template) => {
        if (!next[template.id]) {
          next[template.id] = [
            {
              timestamp: template.updatedAt,
              before: null,
              after: buildTemplateSnapshot(template),
            },
          ];
          mutated = true;
        }
      });
      return mutated ? next : prev;
    });
  }, [templates]);

  const recordTemplateHistory = (templateId: string, entry: TemplateHistoryEntry) => {
    setTemplateHistories((prev) => {
      const current = prev[templateId] ?? [];
      return {
        ...prev,
        [templateId]: [entry, ...current].slice(0, 8),
      };
    });
  };

  const toggleHistory = (templateId: string) => {
    setHistoryExpandedId((prev) => (prev === templateId ? null : templateId));
  };

  const handleImportTrigger = (context: ImportContext) => {
    setImportContext(context);
    importInputRef.current?.click();
  };

  const handleImportFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      event.target.value = '';
      return;
    }
    if (!importContext) {
      event.target.value = '';
      return;
    }

    try {
      const text = await file.text();
      const pretty = stringifyImportedConfig(text);
      if (importContext.mode === 'create') {
        setTemplateForm((prev) => ({ ...prev, gradingConfigText: pretty }));
      } else if (importContext.mode === 'edit') {
        setTemplateEditFormState((prev) => ({ ...prev, gradingConfigText: pretty }));
      }
      setFormError(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to import grading config');
    } finally {
      event.target.value = '';
      setImportContext(null);
    }
  };

  const sessionLabel = context?.activeSession?.name ?? 'No session selected';
  const termLabel = context?.activeTerm?.name ?? 'No term selected';

  const filterTemplateId = draftFilters.templateId ?? 'all';
  const filterStatus = draftFilters.status ?? 'all';

  const templateCountLabel = useMemo(() => `${templates.length} template${templates.length === 1 ? '' : 's'}`, [templates.length]);
  const draftCountLabel = useMemo(() => `${drafts.length} draft${drafts.length === 1 ? '' : 's'}`, [drafts.length]);

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

  const resetTemplateEditState = () => {
    setEditingTemplateId(null);
    setTemplateEditFormState(TEMPLATE_EDIT_INITIAL_STATE);
  };

  const beginTemplateEdit = (template: ResultTemplatePayload) => {
    setFormError(null);
    setEditingTemplateId(template.id);
    setTemplateEditFormState({
      name: template.name,
      description: template.description ?? '',
      gradingConfigText: stringifyConfigForEditor(template.gradingConfig),
      originalGradingConfigText: stringifyConfigForEditor(template.gradingConfig),
      isArchived: template.isArchived,
    });
  };

  const handleCreateTemplate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!templateForm.name.trim()) {
      setFormError('Template name is required');
      return;
    }
    const gradingConfig = parseConfigOrThrow(templateForm.gradingConfigText);

    try {
      setFormError(null);
      const created = await createTemplate({
        name: templateForm.name.trim(),
        description: templateForm.description.trim() || undefined,
        gradingConfig: gradingConfig ?? undefined,
      });
      recordTemplateHistory(created.id, {
        timestamp: created.updatedAt,
        before: null,
        after: buildTemplateSnapshot(created),
      });
      setTemplateForm(TEMPLATE_FORM_INITIAL_STATE);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to create template');
    }
  };

  const handleSubmitTemplateEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingTemplateId) {
      return;
    }
    if (!templateEditFormState.name.trim()) {
      setFormError('Template name is required');
      return;
    }
    const gradingConfig = parseConfigOrThrow(templateEditFormState.gradingConfigText);
    const previousTemplate = templates.find((template) => template.id === editingTemplateId);

    try {
      setFormError(null);
      setTemplateSaving(true);
      const updated = await updateTemplate(editingTemplateId, {
        name: templateEditFormState.name.trim(),
        description: templateEditFormState.description.trim() || null,
        gradingConfig: gradingConfig ?? null,
        isArchived: templateEditFormState.isArchived,
      });
      recordTemplateHistory(editingTemplateId, {
        timestamp: updated.updatedAt,
        before: previousTemplate ? buildTemplateSnapshot(previousTemplate) : null,
        after: buildTemplateSnapshot(updated),
      });
      resetTemplateEditState();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to update template');
    } finally {
      setTemplateSaving(false);
    }
  };

  const handleCreateDraft = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draftForm.templateId || !draftForm.studentId.trim()) {
      setFormError('Template and student ID are required');
      return;
    }

    try {
      setFormError(null);
      await createDraft({
        templateId: draftForm.templateId,
        studentId: draftForm.studentId.trim(),
        termId: draftForm.termId.trim() || undefined,
        totalScore: draftForm.totalScore ? Number(draftForm.totalScore) : undefined,
        notes: draftForm.notes.trim() || undefined,
      });
      setDraftForm((prev) => ({ ...prev, studentId: '', termId: '', totalScore: '', notes: '' }));
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to create draft');
    }
  };

  const handleFilterChange = (updates: { templateId?: string | 'all'; status?: ResultDraftStatus | 'all' }) => {
    setDraftFilters((prev) => ({
      ...prev,
      ...(updates.templateId !== undefined
        ? { templateId: updates.templateId === 'all' ? undefined : updates.templateId }
        : {}),
      ...(updates.status !== undefined ? { status: updates.status === 'all' ? undefined : updates.status } : {}),
    }));
  };

  const getDraftEditSnapshot = (draftId: string, fallback: { status: ResultDraftStatus; totalScore: string; notes: string }) => {
    return draftEditState[draftId] ?? fallback;
  };

  const handleDraftFieldChange = (
    draftId: string,
    fallback: { status: ResultDraftStatus; totalScore: string; notes: string },
    updates: Partial<{ status: ResultDraftStatus; totalScore: string; notes: string }>,
  ) => {
    setDraftEditState((prev) => {
      const base = prev[draftId] ?? fallback;
      return {
        ...prev,
        [draftId]: {
          ...base,
          ...updates,
        },
      };
    });
  };

  const resetDraftEdit = (draftId: string) => {
    setDraftEditState((prev) => {
      const next = { ...prev };
      delete next[draftId];
      return next;
    });
  };

  const draftHasChanges = (draftId: string, fallback: { status: ResultDraftStatus; totalScore: string; notes: string }) => {
    const snapshot = draftEditState[draftId];
    if (!snapshot) {
      return false;
    }
    return (
      snapshot.status !== fallback.status ||
      snapshot.totalScore !== fallback.totalScore ||
      snapshot.notes !== fallback.notes
    );
  };

  const handleDraftUpdate = async (draftId: string, snapshot: { status: ResultDraftStatus; totalScore: string; notes: string }) => {
    setFormError(null);
    setDraftSavingState((prev) => ({ ...prev, [draftId]: true }));
    try {
      await updateDraft(draftId, {
        status: snapshot.status,
        totalScore: snapshot.totalScore ? Number(snapshot.totalScore) : null,
        notes: snapshot.notes.trim() || null,
      });
      resetDraftEdit(draftId);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to update draft');
    } finally {
      setDraftSavingState((prev) => ({ ...prev, [draftId]: false }));
    }
  };

  const isDraftSaving = (draftId: string) => Boolean(draftSavingState[draftId]);

  return (
    <section style={{ display: 'grid', gap: '1.5rem' }}>
      <input
        ref={importInputRef}
        type="file"
        accept="application/json,.json"
        style={{ display: 'none' }}
        onChange={handleImportFileChange}
      />
      <header style={{ display: 'grid', gap: '0.35rem' }}>
        <p className="pill" style={{ width: 'fit-content', fontSize: 13 }}>
          {context.school.shortCode ?? context.school.name} · {context.tenantRole ?? 'Member'}
        </p>
        <h1 style={{ margin: 0 }}>Results workspace</h1>
        <p className="text-muted" style={{ margin: 0 }}>
          {sessionLabel} · {termLabel}
        </p>
      </header>

      {formError ? (
        <p className="form-error" style={{ margin: 0 }}>
          {formError}
        </p>
      ) : null}
      {templatesError ? (
        <p className="form-error" style={{ margin: 0 }}>
          {templatesError}
        </p>
      ) : null}
      {draftsError ? (
        <p className="form-error" style={{ margin: 0 }}>
          {draftsError}
        </p>
      ) : null}

      <div className="glass-card" style={{ padding: '1.5rem', display: 'grid', gap: '1rem' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Result templates</h2>
            <p className="text-muted" style={{ margin: 0 }}>
              {templateCountLabel} · define grading schemas and computation configs per school.
            </p>
          </div>
          <button className="secondary" onClick={() => void refreshTemplates()} disabled={templatesLoading}>
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
              <article key={template.id} className="card-row" style={{ alignItems: 'flex-start', gap: '1rem' }}>
                <div style={{ flex: 1, display: 'grid', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <strong>{template.name}</strong>
                    {template.isArchived ? (
                      <span className="pill" style={{ fontSize: 11, background: 'rgba(255,255,255,0.08)' }}>
                        Archived
                      </span>
                    ) : null}
                  </div>
                  <p className="text-muted" style={{ margin: 0 }}>
                    {template.description || 'No description'}
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {getGradingHighlights(template.gradingConfig).length > 0 ? (
                      getGradingHighlights(template.gradingConfig).map((highlight) => (
                        <span key={highlight} className="pill" style={{ fontSize: 11, background: 'rgba(255,255,255,0.08)' }}>
                          {highlight}
                        </span>
                      ))
                    ) : (
                      <span className="text-muted" style={{ fontSize: 12 }}>No grading metadata yet</span>
                    )}
                  </div>
                  <span style={{ fontSize: 12, opacity: 0.75 }}>
                    Updated {new Date(template.updatedAt).toLocaleString()}
                  </span>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="ghost"
                      style={{ width: 'fit-content', padding: '0.35rem 0.75rem', fontSize: 13 }}
                      onClick={() => setExpandedTemplateId((prev) => (prev === template.id ? null : template.id))}
                    >
                      {expandedTemplateId === template.id ? 'Hide grading config' : 'View grading config'}
                    </button>
                    <button
                      type="button"
                      className="ghost"
                      style={{ width: 'fit-content', padding: '0.35rem 0.75rem', fontSize: 13 }}
                      onClick={() => toggleHistory(template.id)}
                    >
                      {historyExpandedId === template.id ? 'Hide history' : 'View history'}
                    </button>
                  </div>
                  {expandedTemplateId === template.id ? (
                    <pre
                      style={{
                        margin: 0,
                        padding: '0.75rem',
                        background: 'rgba(255,255,255,0.05)',
                        borderRadius: 8,
                        maxHeight: 240,
                        overflow: 'auto',
                        fontSize: 12,
                      }}
                    >
                      {formatGradingConfigPreview(template.gradingConfig)}
                    </pre>
                  ) : null}
                  {historyExpandedId === template.id && templateHistories[template.id]?.length ? (
                    <div
                      style={{
                        borderRadius: 8,
                        border: '1px solid rgba(255,255,255,0.08)',
                        padding: '0.85rem',
                        display: 'grid',
                        gap: '0.65rem',
                      }}
                    >
                      <strong style={{ fontSize: 13, opacity: 0.85 }}>Change log</strong>
                      {templateHistories[template.id].map((entry, idx) => (
                        <article key={`${entry.timestamp}-${idx}`} style={{ display: 'grid', gap: '0.4rem' }}>
                          <span style={{ fontSize: 12, opacity: 0.75 }}>{new Date(entry.timestamp).toLocaleString()}</span>
                          <p style={{ margin: 0, fontSize: 13 }}>{describeSnapshotChange(entry.before, entry.after)}</p>
                          <details style={{ fontSize: 12 }}>
                            <summary style={{ cursor: 'pointer' }}>Diff preview</summary>
                            <div
                              style={{
                                marginTop: '0.5rem',
                                display: 'grid',
                                gap: '0.5rem',
                              }}
                            >
                              <div style={{ display: 'grid', gap: '0.35rem' }}>
                                <span style={{ opacity: 0.7 }}>Before</span>
                                <pre className="code-block">{formatSnapshotForDisplay(entry.before)}</pre>
                              </div>
                              <div style={{ display: 'grid', gap: '0.35rem' }}>
                                <span style={{ opacity: 0.7 }}>After</span>
                                <pre className="code-block">{formatSnapshotForDisplay(entry.after)}</pre>
                              </div>
                            </div>
                          </details>
                        </article>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div style={{ width: '100%', maxWidth: 380 }}>
                  {editingTemplateId === template.id ? (
                    <form onSubmit={handleSubmitTemplateEdit} style={{ display: 'grid', gap: '0.65rem' }}>
                      <input
                        placeholder="Template name"
                        value={templateEditFormState.name}
                        onChange={(e) => setTemplateEditFormState((prev) => ({ ...prev, name: e.target.value }))}
                      />
                      <textarea
                        placeholder="Description"
                        value={templateEditFormState.description}
                        onChange={(e) => setTemplateEditFormState((prev) => ({ ...prev, description: e.target.value }))}
                      />
                      <textarea
                        placeholder="Grading config JSON"
                        rows={8}
                        spellCheck={false}
                        value={templateEditFormState.gradingConfigText}
                        onChange={(e) => setTemplateEditFormState((prev) => ({ ...prev, gradingConfigText: e.target.value }))}
                      />
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="ghost"
                          onClick={() => handleImportTrigger({ mode: 'edit', templateId: template.id })}
                          disabled={templateSaving}
                        >
                          Import JSON
                        </button>
                        {templateEditFormState.gradingConfigText &&
                        templateEditFormState.gradingConfigText !== templateEditFormState.originalGradingConfigText ? (
                          <span style={{ fontSize: 12, color: '#9ef8d8' }}>Modified</span>
                        ) : null}
                      </div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: 13 }}>
                        <input
                          type="checkbox"
                          checked={templateEditFormState.isArchived}
                          onChange={(e) => setTemplateEditFormState((prev) => ({ ...prev, isArchived: e.target.checked }))}
                        />
                        Archive template
                      </label>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button type="submit" disabled={templateSaving}>
                          {templateSaving ? 'Saving…' : 'Save changes'}
                        </button>
                        <button
                          type="button"
                          className="ghost"
                          onClick={resetTemplateEditState}
                          disabled={templateSaving}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <button className="secondary" onClick={() => beginTemplateEdit(template)}>
                      Edit template
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1rem', display: 'grid', gap: '0.75rem' }}>
          <h3 style={{ margin: 0, fontSize: '1rem' }}>New template</h3>
          <form onSubmit={handleCreateTemplate} style={{ display: 'grid', gap: '0.65rem' }}>
            <input
              placeholder="Template name"
              value={templateForm.name}
              onChange={(e) => setTemplateForm((prev) => ({ ...prev, name: e.target.value }))}
            />
            <textarea
              placeholder="Optional description"
              value={templateForm.description}
              onChange={(e) => setTemplateForm((prev) => ({ ...prev, description: e.target.value }))}
            />
            <textarea
              placeholder="Grading config JSON (optional)"
              rows={6}
              spellCheck={false}
              value={templateForm.gradingConfigText}
              onChange={(e) => setTemplateForm((prev) => ({ ...prev, gradingConfigText: e.target.value }))}
            />
            <button
              type="button"
              className="ghost"
              style={{ width: 'fit-content' }}
              onClick={() => handleImportTrigger({ mode: 'create' })}
            >
              Import JSON
            </button>
            <button type="submit" disabled={templatesLoading}>
              Create template
            </button>
          </form>
        </div>
      </div>

      <div className="glass-card" style={{ padding: '1.5rem', display: 'grid', gap: '1rem' }}>
        <header style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Result drafts</h2>
            <p className="text-muted" style={{ margin: 0 }}>
              {draftCountLabel} · filter drafts by template and status to monitor progress.
            </p>
          </div>
          <button className="secondary" onClick={() => void refreshDrafts()} disabled={draftsLoading}>
            {draftsLoading ? 'Refreshing…' : 'Refresh'}
          </button>
        </header>

        <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))' }}>
          <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
            Template
            <select
              value={filterTemplateId}
              onChange={(e) => handleFilterChange({ templateId: e.target.value as string | 'all' })}
            >
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
            <select value={filterStatus} onChange={(e) => handleFilterChange({ status: e.target.value as ResultDraftStatus | 'all' })}>
              {STATUS_FILTER_OPTIONS.map((status) => (
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
                  <th>Quick edit</th>
                </tr>
              </thead>
              <tbody>
                {drafts.map((draft) => {
                  const fallback = {
                    status: draft.status,
                    totalScore: draft.totalScore?.toString() ?? '',
                    notes: draft.notes ?? '',
                  };
                  const snapshot = getDraftEditSnapshot(draft.id, fallback);
                  const hasChanges = draftHasChanges(draft.id, fallback);
                  const saving = isDraftSaving(draft.id);
                  return (
                    <tr key={draft.id}>
                      <td>
                        {draft.student.firstName} {draft.student.lastName}
                      </td>
                      <td>{draft.template.name}</td>
                      <td>{capitalize(draft.status)}</td>
                      <td>{draft.totalScore ?? '—'}</td>
                      <td>{new Date(draft.updatedAt).toLocaleString()}</td>
                      <td>
                        <div style={{ display: 'grid', gap: '0.4rem' }}>
                          <label style={{ display: 'grid', gap: 4, fontSize: 12 }}>
                            Status
                            <select
                              value={snapshot.status}
                              onChange={(e) =>
                                handleDraftFieldChange(draft.id, fallback, {
                                  status: e.target.value as ResultDraftStatus,
                                })
                              }
                            >
                              {DRAFT_STATUS_OPTIONS.map((status) => (
                                <option key={status} value={status}>
                                  {capitalize(status)}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label style={{ display: 'grid', gap: 4, fontSize: 12 }}>
                            Total score
                            <input
                              type="number"
                              value={snapshot.totalScore}
                              onChange={(e) => handleDraftFieldChange(draft.id, fallback, { totalScore: e.target.value })}
                            />
                          </label>
                          <label style={{ display: 'grid', gap: 4, fontSize: 12 }}>
                            Notes
                            <textarea
                              rows={2}
                              value={snapshot.notes}
                              onChange={(e) => handleDraftFieldChange(draft.id, fallback, { notes: e.target.value })}
                            />
                          </label>
                          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              disabled={!hasChanges || saving}
                              onClick={() => void handleDraftUpdate(draft.id, snapshot)}
                            >
                              {saving ? 'Saving…' : 'Save'}
                            </button>
                            {hasChanges ? (
                              <button
                                type="button"
                                className="ghost"
                                onClick={() => resetDraftEdit(draft.id)}
                                disabled={saving}
                              >
                                Reset
                              </button>
                            ) : null}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1rem', display: 'grid', gap: '0.65rem' }}>
          <h3 style={{ margin: 0, fontSize: '1rem' }}>Quick draft capture</h3>
          <form onSubmit={handleCreateDraft} style={{ display: 'grid', gap: '0.65rem' }}>
            <div style={{ display: 'grid', gap: '0.65rem', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))' }}>
              <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
                Template
                <select
                  value={draftForm.templateId}
                  onChange={(e) => setDraftForm((prev) => ({ ...prev, templateId: e.target.value }))}
                  required
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
                  value={draftForm.studentId}
                  onChange={(e) => setDraftForm((prev) => ({ ...prev, studentId: e.target.value }))}
                  required
                />
              </label>

              <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
                Term ID (optional)
                <input
                  placeholder="term_xxxx"
                  value={draftForm.termId}
                  onChange={(e) => setDraftForm((prev) => ({ ...prev, termId: e.target.value }))}
                />
              </label>

              <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
                Total score
                <input
                  type="number"
                  placeholder="e.g. 78.5"
                  value={draftForm.totalScore}
                  onChange={(e) => setDraftForm((prev) => ({ ...prev, totalScore: e.target.value }))}
                />
              </label>
            </div>

            <textarea
              placeholder="Notes (optional)"
              value={draftForm.notes}
              onChange={(e) => setDraftForm((prev) => ({ ...prev, notes: e.target.value }))}
            />

            <button type="submit" disabled={!templates.length}>
              Capture draft
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function getGradingHighlights(config: unknown): string[] {
  if (!config || typeof config !== 'object') {
    return [];
  }
  const highlights: string[] = [];
  const record = config as Record<string, unknown>;

  if (Array.isArray(record.assessments)) {
    highlights.push(`${record.assessments.length} assessment${record.assessments.length === 1 ? '' : 's'}`);
    const totalWeight = record.assessments.reduce((acc, item) => {
      const weight = typeof item?.weight === 'number' ? item.weight : 0;
      return acc + weight;
    }, 0);
    if (totalWeight > 0) {
      highlights.push(`Total weight ${totalWeight}`);
    }
  }

  if (Array.isArray(record.gradingBands)) {
    highlights.push(`${record.gradingBands.length} grading band${record.gradingBands.length === 1 ? '' : 's'}`);
  }

  if (typeof record.passMark === 'number') {
    highlights.push(`Pass mark ${record.passMark}`);
  }

  return highlights.slice(0, 3);
}

function formatGradingConfigPreview(config: unknown): string {
  if (!config) {
    return 'No grading configuration provided yet.';
  }

  if (typeof config === 'string') {
    return config;
  }

  try {
    return JSON.stringify(config, null, 2);
  } catch {
    return String(config);
  }
}

function stringifyConfigForEditor(config: unknown): string {
  if (config === null || config === undefined) {
    return '';
  }
  if (typeof config === 'string') {
    return config;
  }

  try {
    return JSON.stringify(config, null, 2);
  } catch {
    return String(config);
  }
}

function stringifyImportedConfig(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error('Uploaded file is empty.');
  }
  try {
    const parsed = JSON.parse(trimmed);
    return JSON.stringify(parsed, null, 2);
  } catch {
    throw new Error('Uploaded file must be valid JSON.');
  }
}

function parseConfigOrThrow(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }
  try {
    return JSON.parse(trimmed);
  } catch {
    throw new Error('Grading config must be valid JSON.');
  }
}

function buildTemplateSnapshot(template: ResultTemplatePayload): TemplateSnapshot {
  return {
    name: template.name,
    description: template.description,
    gradingConfig: template.gradingConfig,
    isArchived: template.isArchived,
  };
}

function describeSnapshotChange(before: TemplateSnapshot | null, after: TemplateSnapshot): string {
  if (!before) {
    return 'Template created';
  }
  const changes: string[] = [];
  if (before.name !== after.name) {
    changes.push(`name changed to “${after.name}”`);
  }
  if ((before.description ?? '') !== (after.description ?? '')) {
    changes.push('description updated');
  }
  if (before.isArchived !== after.isArchived) {
    changes.push(after.isArchived ? 'archived' : 'restored');
  }
  if (!deepEqual(before.gradingConfig, after.gradingConfig)) {
    changes.push('grading config updated');
  }
  return changes.length ? changes.join(', ') : 'No visible changes';
}

function formatSnapshotForDisplay(snapshot: TemplateSnapshot | null): string {
  if (!snapshot) {
    return '—';
  }
  try {
    return JSON.stringify(
      {
        name: snapshot.name,
        description: snapshot.description,
        isArchived: snapshot.isArchived,
        gradingConfig: snapshot.gradingConfig,
      },
      null,
      2,
    );
  } catch {
    return String(snapshot);
  }
}

function deepEqual(left: unknown, right: unknown): boolean {
  try {
    return JSON.stringify(left) === JSON.stringify(right);
  } catch {
    return left === right;
  }
}
