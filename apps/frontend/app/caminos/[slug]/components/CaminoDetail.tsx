'use client';

import { useState, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

import { VerifiedBadge } from '@/app/caminos/components/VerifiedBadge';
import { VerificationSection } from './VerificationSection';
import { CaminoGpxFiles } from './CaminoGpxFiles';
import { CaminoPictures } from './CaminoPictures';
import { CaminoRouteMap } from './CaminoRouteMap';

import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import type { CaminoDetailFull } from '@/app/api/caminos/caminos';
import { useUpdateCamino } from '@/app/api/caminos/use-update-camino';
import type { AuthUser } from '@/lib/getAuthUser';
import { Button, buttonVariants } from '@/app/components/ui/button';
import { cn } from '@/lib/utils';

type EditingField = 'name' | 'description' | null;

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

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        cancelledRef.current = true;
        onCancel();
      }
      if (e.key === 'Enter' && Tag === 'input') {
        e.preventDefault();
        onSave(draft);
      }
    },
    [Tag, draft, onCancel, onSave],
  );

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

interface CaminoDetailProps {
  camino: CaminoDetailFull;
  user: AuthUser | null;
  children?: React.ReactNode;
}

export function CaminoDetail({
  camino: initialCamino,
  user,
  children,
}: CaminoDetailProps) {
  const t = useTranslations('camino_detail');
  const tCaminos = useTranslations('caminos');
  const tCodes = useTranslations('country_codes');
  const mutation = useUpdateCamino();

  const canEdit = user?.roles.some((r) => r.key === 'pilgrim') ?? false;

  const [camino, setCamino] = useState(initialCamino);
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
    const value = field === 'description' ? trimmed || null : trimmed;

    // Optimistic update
    setCamino((prev) => ({ ...prev, [field]: value }));
    setEditingField(null);

    mutation.mutate(
      { id: camino.id, payload: { [field]: value } },
      {
        onSuccess: (updated) => {
          setCamino(updated);
        },
        onError: () => {
          setCamino((prev) => ({ ...prev, [field]: prevValueRef.current || null }));
          setInlineError(t('inline_save_error'));
        },
      },
    );
  }

  return (
    <article className="mb-8">
      {/* Back to list */}
      <div className="mb-6">
        <Link
          href="/caminos"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <i className="icon-chevron-left text-xl" aria-hidden="true" />
          {t('back_to_list')}
        </Link>
      </div>

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
          <div
            className={cn(
              'flex items-center justify-between gap-4 w-full',
              canEdit && 'hover:bg-accent/50 rounded-md pr-1 ',
            )}>
            <div className="">
              <h1 className="text-3xl font-bold tracking-tight inline">{camino.name}</h1>
              {camino.countries.length > 0 && (
                <span className="ml-2 text-base font-normal text-muted-foreground">
                  {camino.countries.map((c) => tCodes(c)).join(' · ')}
                </span>
              )}
              {camino.verified && <VerifiedBadge className="inline-block pl-2 lg:pl-3" />}
            </div>
            {canEdit && (
              <Button
                variant={'ghost'}
                aria-label={tCaminos('edit_name_aria')}
                onClick={() => startEdit('name')}>
                <i
                  className="icon-pencil text-xl text-muted-foreground hover:text-accent-foreground"
                  aria-hidden="true"
                />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Inline save error */}
      {inlineError && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {inlineError}
        </p>
      )}

      {/* Hero picture — above description */}
      <CaminoPictures caminoId={camino.id} caminoName={camino.name} section="hero" />

      {/* Description */}
      <div className="mt-4">
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
          <div className={cn('mt-4', canEdit && 'hover:bg-accent/50 rounded-md pr-1')}>
            {canEdit && (
              <Button
                variant={'ghost'}
                aria-label={tCaminos('edit_description_aria')}
                onClick={() => startEdit('description')}
                className="float-right ml-2">
                <i
                  className="icon-pencil text-xl text-muted-foreground hover:text-accent-foreground"
                  aria-hidden="true"
                />
              </Button>
            )}
            <p className="whitespace-pre-wrap text-muted-foreground">
              {camino.description ?? tCaminos('no_description')}
            </p>
          </div>
        )}
      </div>

      {/* Stages */}
      <section className="mt-8">
        <h2 className="mb-4 text-xl font-semibold">{t('stages_heading')}</h2>
        <CaminoRouteMap points={camino.caminoPoints} className="mb-6" />
        {children}
      </section>

      <section className="flex justify-between items-start mt-4">
        {/* Edit waypoints link */}
        {canEdit && (
          <Link
            href={`/caminos/${camino.slug}/update`}
            className={cn(buttonVariants({ variant: 'outline' }))}>
            <i className="icon-pencil text-base -translate-y-0.5" aria-hidden="true" />
            {t('edit_waypoints')}
          </Link>
        )}

        {/* GPX file download and upload */}
        <CaminoGpxFiles caminoId={camino.id} className="mt-2" />
      </section>

      {/* Verification voting */}
      {camino.caminoPoints.length >= 3 && (
        <VerificationSection caminoId={camino.id} className="mt-2" />
      )}

      {/* Gallery and upload controls — below verification */}
      <CaminoPictures caminoId={camino.id} section="gallery" />
    </article>
  );
}
