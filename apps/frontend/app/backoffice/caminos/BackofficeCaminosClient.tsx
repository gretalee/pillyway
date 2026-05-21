'use client';

import { useState } from 'react';
import { useTranslations, useFormatter } from 'next-intl';

import { Button } from '@/app/components/ui/button';
import { Modal } from '@/app/components/ui/modal';
import { ToggleSwitch } from '@/app/components/ui/toggle-switch';
import { useBackofficeCaminos } from '@/app/api/backoffice/use-backoffice-caminos';
import { useCaminoVotesDetail } from '@/app/api/backoffice/use-camino-votes-detail';
import { useSetCaminoVerified } from '@/app/api/caminos/use-set-camino-verified';
import { useModalStore } from '@/store/modal-store';

const MODAL_ID = 'camino-votes-detail';

// ---- CaminoVotesModal sub-component ----------------------------------------

interface CaminoVotesModalProps {
  caminoId: string | null;
}

function CaminoVotesModal({ caminoId }: CaminoVotesModalProps) {
  const t = useTranslations('backoffice_caminos');
  const format = useFormatter();
  const { data: votes, isLoading } = useCaminoVotesDetail(caminoId);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">…</p>;
  }

  if (!votes || votes.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('modal_empty')}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-muted-foreground">
            <th className="py-2 pr-4 font-medium">{t('modal_col_vote')}</th>
            <th className="py-2 font-medium">{t('modal_col_date')}</th>
          </tr>
        </thead>
        <tbody>
          {votes.map((v, idx) => (
            <tr
              key={`${v.updatedAt}-${v.vote}-${idx}`}
              className="border-b border-border last:border-0">
              <td className="py-2 pr-4">
                {v.vote ? t('modal_vote_yes') : t('modal_vote_no')}
              </td>
              <td className="py-2">
                {format.dateTime(new Date(v.updatedAt), { dateStyle: 'short' })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---- Main client component --------------------------------------------------

export function BackofficeCaminosClient() {
  const t = useTranslations('backoffice_caminos');
  const [selectedCaminoId, setSelectedCaminoId] = useState<string | null>(null);
  const [toggleErrors, setToggleErrors] = useState<Record<string, string>>({});

  const openModal = useModalStore((s) => s.open);
  const { data: caminos, isLoading, isError } = useBackofficeCaminos();
  const verifyMutation = useSetCaminoVerified();

  const selectedCamino = caminos?.find((c) => c.id === selectedCaminoId) ?? null;

  function handleToggleVerified(id: string, currentVerified: boolean) {
    setToggleErrors((prev) => ({ ...prev, [id]: '' }));
    verifyMutation.mutate(
      { id, payload: { verified: !currentVerified } },
      {
        onError: () => {
          setToggleErrors((prev) => ({ ...prev, [id]: t('toggle_error') }));
        },
      },
    );
  }

  function handleOpenVotes(caminoId: string) {
    setSelectedCaminoId(caminoId);
    openModal(MODAL_ID);
  }

  return (
    <div className="flex flex-1 flex-col px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight">{t('heading')}</h1>
      <p className="mt-2 text-muted-foreground">{t('subtitle')}</p>

      {isError && (
        <p role="alert" className="mt-8 text-destructive">
          {t('error_loading')}
        </p>
      )}

      {isLoading && <p className="mt-8 text-muted-foreground">…</p>}

      {caminos && caminos.length > 0 && (
        <div className="mt-8 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-3 pr-4 font-medium">{t('col_name')}</th>
                <th className="py-3 pr-4 font-medium">{t('col_yes_votes')}</th>
                <th className="py-3 pr-4 font-medium">{t('col_no_votes')}</th>
                <th className="py-3 pr-4 font-medium">{t('col_verified')}</th>
                <th className="py-3 font-medium">{t('col_details')}</th>
              </tr>
            </thead>
            <tbody>
              {caminos.map((camino) => (
                <tr
                  key={camino.id}
                  className="border-b border-border last:border-0 align-middle">
                  <td className="py-3 pr-4 font-medium text-foreground">{camino.name}</td>
                  <td className="py-3 pr-4 tabular-nums">{camino.yesCount}</td>
                  <td className="py-3 pr-4 tabular-nums">{camino.noCount}</td>
                  <td className="py-3 pr-4">
                    <div className="flex flex-col gap-1">
                      <ToggleSwitch
                        checked={camino.verified}
                        onCheckedChange={() =>
                          handleToggleVerified(camino.id, camino.verified)
                        }
                        disabled={verifyMutation.isPending}
                        aria-label={t('toggle_aria', { name: camino.name })}
                      />
                      {toggleErrors[camino.id] && (
                        <p role="alert" className="text-xs text-destructive">
                          {toggleErrors[camino.id]}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="py-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenVotes(camino.id)}>
                      {t('details_button')}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        id={MODAL_ID}
        title={
          selectedCamino
            ? t('modal_heading', { name: selectedCamino.name })
            : t('heading')
        }
        onDismiss={() => setSelectedCaminoId(null)}>
        <CaminoVotesModal caminoId={selectedCaminoId} />
      </Modal>
    </div>
  );
}
