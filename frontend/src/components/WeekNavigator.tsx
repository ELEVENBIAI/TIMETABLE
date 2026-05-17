import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { Button } from '@/components/Button';
import { addWeeksToDate, formatWeekRange, getCurrentWeekStart } from '@/lib/date';
import { isLocale } from '@/lib/i18n';

interface WeekNavigatorProps {
  weekStart: Date;
  onChange: (next: Date) => void;
}

export function WeekNavigator({ weekStart, onChange }: WeekNavigatorProps) {
  const { t, i18n } = useTranslation('schedule');
  const locale = isLocale(i18n.resolvedLanguage) ? i18n.resolvedLanguage : 'en';

  return (
    <nav className="flex items-center gap-3" aria-label={t('navigator.label')}>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => onChange(addWeeksToDate(weekStart, -1))}
        leadingIcon={<ChevronLeft size={14} />}
      >
        {t('navigator.previous')}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onChange(getCurrentWeekStart())}
        leadingIcon={<Calendar size={14} />}
      >
        {t('navigator.today')}
      </Button>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => onChange(addWeeksToDate(weekStart, 1))}
        leadingIcon={<ChevronRight size={14} />}
      >
        {t('navigator.next')}
      </Button>
      <div className="text-headline font-semibold tabular-nums">
        {formatWeekRange(weekStart, locale)}
      </div>
    </nav>
  );
}
