'use client';

import { useState, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Pencil } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { useCamino, CaminoDetailFull } from '@/app/api/use-camino';
import { useUpdateCamino } from '@/app/api/use-update-camino';
import { useUserStore } from '@/store/user-store';

type EditingField = 'name' | 'description' | null;

function CaminoDetailSkeleton() {
  return (
    <div className="space-y-4 animate-pulse" aria-busy="true">
      <div className="h-8 w-2/3 rounded bg-muted" />
      <div className="h-4 w-full rounded bg-muted" />
      <div className="h-4 w-1/2 rounded bg-muted" />
    </div>
  );
}

interface InlineFieldProps {
  value: string;
  onSave: (value: string) => void;
  onCancel: () => void;
  as: 'input' | 'textarea';
  ariaLabel: string;
}

function InlineField({ value, onSave, onCancel, as: Tag, ariaLabel }: InlineFieldProps) {
  const [draft, setDraft] = useState(value);
  const cancelledRef = useRef(false);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      cancelledRef.current = true;
      onCancel();
    }
    if (e.key === 'Enter' && Tag === 'input') {
      e.preventDefault();
      onSave(draft);
    }
  }, [Tag, draft, onCancel, onSave]);

  function handleBlur() {
    if (cancelledRef.current) return;
    onSave(draft);
  }

  if (Tag === 'textarea') {
    return (
      <Textarea
        autoFocus
        value={draft}
        aria-label={ariaLabel}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        rows={3}
        className="mt-1 w-full"
      />
    );
  }

  return (
    <Input
      autoFocus
      value={draft}
      aria-label={ariaLabel}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className="text-lg font-semibold"
    />
  );
}

interface CaminoDetailContentProps {
  camino: CaminoDetailFull;
  caminoId: string;
}

function CaminoDetailContent({ camino, caminoId }: CaminoDetailContentProps) {
  const t = useTranslations('camino_detail');
  const tCaminos = useTranslations('caminos');
  const queryClient = useQueryClient();
  const mutation = useUpdateCamino();

  const isPilgrim = useUserStore((state) => state.hasRole('pilgrim'));
  const userId = useUserStore((state) => state.user?.id);
  const canEdit = isPilgrim || userId === camino.createdBy;

  const [editingField, setEditingField] = useState<EditingField>(null);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const prevValueRef = useRef<string>('');

  function startEdit(field: EditingField) {
    prevValueRef.current = field === 'name' ? camino.name : (camino.description ?? '');
    setEditingField(field);
    setInlineError(null);
  }

  function cancelEdit() {
    setEditingField(null);
  }

  function saveField(field: 'name' | 'description', draft: string) {
    const trimmed = draft.trim();
    const current = field === 'name' ? camino.name : (camino.description ?? '');

    // Name cannot be cleared — keep editing with an error rather than sending null
    if (field === 'name' && trimmed === '') {
      setInlineError(t('inline_save_error'));
      return;
    }

    if (trimmed === current) {
      setEditingField(null);
      return;
    }

    // description can be explicitly cleared to null; name is always a string
    const value = field === 'description' ? (trimmed || null) : trimmed;

    // Optimistic update
    queryClient.setQueryData(['camino', caminoId], (old: CaminoDetailFull | undefined) =>
      old ? { ...old, [field]: value } : old,
    );
    setEditingField(null);

    mutation.mutate(
      { id: caminoId, payload: { [field]: value } },
      {
        onSuccess: (updated) => {
          // Update cache with authoritative server response (includes correct updatedAt etc.)
          queryClient.setQueryData(['camino', caminoId], updated);
        },
        onError: () => {
          // Revert to pre-edit value
          queryClient.setQueryData(['camino', caminoId], (old: CaminoDetailFull | undefined) =>
            old ? { ...old, [field]: prevValueRef.current || null } : old,
          );
          setInlineError(t('inline_save_error'));
        },
      },
    );
  }

  return (
    <article>
      {/* Name */}
      <div className="flex items-center gap-2">
        {editingField === 'name' ? (
          <div className="flex-1">
            <InlineField
              value={camino.name}
              as="input"
              ariaLabel={tCaminos('edit_name_aria')}
              onSave={(v) => saveField('name', v)}
              onCancel={cancelEdit}
            />
          </div>
        ) : (
          <>
            <h1 className="text-3xl font-bold tracking-tight">{camino.name}</h1>
            {canEdit && (
              <button
                type="button"
                aria-label={tCaminos('edit_name_aria')}
                onClick={() => startEdit('name')}
                className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <Pencil className="size-4" aria-hidden="true" />
              </button>
            )}
          </>
        )}
      </div>

      {/* Verified badge */}
      {camino.verified && (
        <span className="mt-2 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
          {tCaminos('verified')}
        </span>
      )}

      {/* Inline save error */}
      {inlineError && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {inlineError}
        </p>
      )}

      {/* Description */}
      <div className="mt-4 flex items-start gap-2">
        {editingField === 'description' ? (
          <div className="flex-1">
            <InlineField
              value={camino.description ?? ''}
              as="textarea"
              ariaLabel={tCaminos('edit_description_aria')}
              onSave={(v) => saveField('description', v)}
              onCancel={cancelEdit}
            />
          </div>
        ) : (
          <>
            <p className="flex-1 text-muted-foreground">
              {camino.description ?? tCaminos('no_description')}
            </p>
            {canEdit && (
              <button
                type="button"
                aria-label={tCaminos('edit_description_aria')}
                onClick={() => startEdit('description')}
                className="shrink-0 rounded p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <Pencil className="size-4" aria-hidden="true" />
              </button>
            )}
          </>
        )}
      </div>

      {/* Waypoints */}
      <section className="mt-8">
        <h2 className="mb-4 text-xl font-semibold">{t('waypoints_heading')}</h2>
        <ol className="space-y-3">
          {camino.caminoPoints.map((point) => (
            <li key={point.id} className="flex gap-3">
              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {point.position}
              </span>
              <div>
                <p className="font-medium">
                  {point.name}
                  <span className="ml-2 text-sm text-muted-foreground">({point.country})</span>
                </p>
                {point.description && (
                  <p className="mt-0.5 text-sm text-muted-foreground">{point.description}</p>
                )}
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Edit waypoints link */}
      {canEdit && (
        <div className="mt-8">
          <Link
            href={`/caminos/${caminoId}/update`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Pencil className="size-4" aria-hidden="true" />
            {t('edit_waypoints')}
          </Link>
        </div>
      )}
    </article>
  );
}

interface CaminoDetailProps {
  caminoId: string;
}

export function CaminoDetail({ caminoId }: CaminoDetailProps) {
  const t = useTranslations('camino_detail');
  const { data: camino, isLoading, isError } = useCamino(caminoId);

  if (isLoading) return <CaminoDetailSkeleton />;

  if (isError || !camino) {
    return (
      <p role="alert" className="text-destructive">
        {t('error_loading')}
      </p>
    );
  }

  return <CaminoDetailContent camino={camino} caminoId={caminoId} />;
}
