'use client';

import { useState, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Button } from '@/app/components/ui/button';
import { cn } from '@/lib/utils';
import { EditConfirmDialog } from './EditConfirmDialog';
import { useUpdateWaypoint } from '@/app/api/waypoints/use-update-waypoint';

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

interface WaypointInfoProps {
  slug: string;
  initialName: string;
  initialDescription: string | null;
  countryLabel: string;
  canContribute: boolean;
}

export function WaypointInfo({
  slug,
  initialName,
  initialDescription,
  countryLabel,
  canContribute,
}: WaypointInfoProps) {
  const t = useTranslations('waypoint_detail');
  const mutation = useUpdateWaypoint(slug);

  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [pendingField, setPendingField] = useState<EditingField>(null);
  const [editingField, setEditingField] = useState<EditingField>(null);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const prevValueRef = useRef<string>('');

  function requestEdit(field: EditingField) {
    setPendingField(field);
  }

  function confirmEdit() {
    if (!pendingField) return;
    prevValueRef.current = pendingField === 'name' ? name : (description ?? '');
    setEditingField(pendingField);
    setInlineError(null);
    setPendingField(null);
  }

  function cancelConfirm() {
    setPendingField(null);
  }

  function cancelEdit() {
    setEditingField(null);
  }

  function saveField(field: 'name' | 'description', draft: string) {
    const trimmed = draft.trim();
    const current = field === 'name' ? name : (description ?? '');

    if (field === 'name' && trimmed === '') {
      setInlineError(t('inline_save_error'));
      return;
    }

    if (trimmed === current) {
      setEditingField(null);
      return;
    }

    const value = field === 'description' ? trimmed || null : trimmed;

    // Optimistic update
    if (field === 'name') setName(value as string);
    else setDescription(value);
    setEditingField(null);

    mutation.mutate(
      { [field]: value },
      {
        onSuccess: (updated) => {
          if (field === 'name') setName(updated.name);
          else setDescription(updated.description);
        },
        onError: () => {
          if (field === 'name') setName(prevValueRef.current);
          else setDescription(prevValueRef.current || null);
          setInlineError(t('inline_save_error'));
        },
      },
    );
  }

  return (
    <>
      <EditConfirmDialog
        open={pendingField !== null}
        onConfirm={confirmEdit}
        onCancel={cancelConfirm}
      />

      {/* Name */}
      {editingField === 'name' ? (
        <div className="flex-1">
          <InlineField
            value={name}
            as="input"
            ariaLabel={t('edit_name_aria')}
            onSave={(v) => saveField('name', v)}
            onCancel={cancelEdit}
          />
        </div>
      ) : (
        <div
          className={cn(
            'flex items-center justify-between gap-4',
            canContribute && 'hover:bg-accent/50 rounded-md',
          )}>
          <h1 className="text-3xl font-bold tracking-tight">{name}</h1>
          {canContribute && (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t('edit_name_aria')}
              onClick={() => requestEdit('name')}>
              <i
                className="icon-pencil text-muted-foreground hover:text-accent-foreground"
                aria-hidden="true"
              />
            </Button>
          )}
        </div>
      )}

      <p className="mt-1 text-sm text-muted-foreground">{countryLabel}</p>

      {inlineError && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {inlineError}
        </p>
      )}

      {/* Description */}
      <div className="mt-4">
        {editingField === 'description' ? (
          <InlineField
            value={description ?? ''}
            as="textarea"
            ariaLabel={t('edit_description_aria')}
            onSave={(v) => saveField('description', v)}
            onCancel={cancelEdit}
          />
        ) : (
          <div
            className={cn(
              'flex items-center justify-between',
              canContribute && 'hover:bg-accent/50 rounded-md ',
            )}>
            <p className="whitespace-pre-wrap">{description ?? t('no_description')}</p>
            {canContribute && (
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t('edit_description_aria')}
                onClick={() => requestEdit('description')}>
                <i
                  className="icon-pencil text-muted-foreground hover:text-accent-foreground"
                  aria-hidden="true"
                />
              </Button>
            )}
          </div>
        )}
      </div>
    </>
  );
}
