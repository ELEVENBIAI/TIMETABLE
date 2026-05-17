import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Send } from 'lucide-react';
import { Button } from '@/components/Button';
import { FormError } from '@/components/FormError';
import { usePublishSchedule } from '@/api/schedule';
import type { Schedule } from '@/types/schedule';

interface Props {
  schedule: Schedule;
}

export function PublishScheduleButton({ schedule }: Props) {
  const { t } = useTranslation('schedule');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const publish = usePublishSchedule();

  if (schedule.status !== 'DRAFT') return null;

  async function handlePublish() {
    setError(null);
    try {
      await publish.mutateAsync(schedule.id);
      setConfirmOpen(false);
    } catch (err) {
      setError(err);
    }
  }

  return (
    <>
      <Button
        variant="primary"
        size="sm"
        onClick={() => setConfirmOpen(true)}
        leadingIcon={<Send size={14} />}
      >
        {t('publish.button')}
      </Button>
      {confirmOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4"
          onClick={() => setConfirmOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-md border border-border bg-surface p-6 shadow-floating"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-headline font-semibold">{t('publish.confirmTitle')}</h2>
            <p className="mt-2 text-body text-text-secondary">{t('publish.confirmBody')}</p>
            {error ? (
              <div className="mt-3">
                <FormError error={error} />
              </div>
            ) : null}
            <div className="mt-5 flex justify-end gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setConfirmOpen(false)}
                disabled={publish.isPending}
              >
                {t('publish.cancel')}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handlePublish}
                loading={publish.isPending}
              >
                {t('publish.confirm')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
