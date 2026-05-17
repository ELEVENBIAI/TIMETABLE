import { useTranslation } from 'react-i18next';
import { CheckCircle2, FileEdit, Archive } from 'lucide-react';
import type { ScheduleStatus } from '@/types/schedule';

interface Props {
  status: ScheduleStatus;
}

const ICON_MAP: Record<ScheduleStatus, typeof CheckCircle2> = {
  DRAFT: FileEdit,
  PUBLISHED: CheckCircle2,
  ARCHIVED: Archive,
};

const CLASS_MAP: Record<ScheduleStatus, string> = {
  DRAFT: 'bg-surface-sunken text-text-secondary border-border',
  PUBLISHED: 'bg-status-completed/10 text-status-completed border-status-completed/30',
  ARCHIVED: 'bg-surface-sunken text-text-muted border-border',
};

export function ScheduleStatusBadge({ status }: Props) {
  const { t } = useTranslation('schedule');
  const Icon = ICON_MAP[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-label font-medium ${CLASS_MAP[status]}`}
    >
      <Icon size={12} aria-hidden="true" />
      {t(`status.${status}`)}
    </span>
  );
}
