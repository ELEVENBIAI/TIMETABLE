// Banner: zeigt offene REASSIGNMENT_NEEDED-Wochen außer der gerade angezeigten.

import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { OpenReassignmentsBanner } from '@/components/OpenReassignmentsBanner';
import { initI18n } from '@/lib/i18n';
import { api } from '@/lib/api';

beforeAll(async () => {
  await initI18n('en');
});

function renderBanner(props: { currentWeekStart: string; onJumpToWeek?: (ws: string) => void }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <OpenReassignmentsBanner
        currentWeekStart={props.currentWeekStart}
        onJumpToWeek={props.onJumpToWeek ?? (() => {})}
      />
    </QueryClientProvider>
  );
}

describe('OpenReassignmentsBanner', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('rendert nichts wenn keine offenen Wochen', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ weeks: [] } as never);
    const { container } = renderBanner({ currentWeekStart: '2026-05-18' });
    await new Promise((r) => setTimeout(r, 30));
    expect(container.firstChild).toBeNull();
  });

  it('filtert die aktuell angezeigte Woche heraus', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({
      weeks: [
        { scheduleId: 's1', weekStart: '2026-05-11', openCount: 2 },
        { scheduleId: 's2', weekStart: '2026-05-18', openCount: 1 },
        { scheduleId: 's3', weekStart: '2026-05-25', openCount: 3 },
      ],
    } as never);
    renderBanner({ currentWeekStart: '2026-05-18' });
    await screen.findByTestId('open-reassignments-banner');
    expect(screen.queryByTestId('open-reassignments-week-2026-05-18')).toBeNull();
    expect(screen.getByTestId('open-reassignments-week-2026-05-11')).toBeInTheDocument();
    expect(screen.getByTestId('open-reassignments-week-2026-05-25')).toBeInTheDocument();
  });

  it('Click auf eine Woche ruft onJumpToWeek', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({
      weeks: [{ scheduleId: 's1', weekStart: '2026-05-11', openCount: 2 }],
    } as never);
    const onJump = vi.fn();
    renderBanner({ currentWeekStart: '2026-05-18', onJumpToWeek: onJump });
    const btn = await screen.findByTestId('open-reassignments-week-2026-05-11');
    fireEvent.click(btn);
    expect(onJump).toHaveBeenCalledWith('2026-05-11');
  });
});
