// ELE-203 Modal-Tests.

import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReassignmentPickerModal } from '@/components/ReassignmentPickerModal';
import { reassignmentKeys, type ReassignmentResponse } from '@/api/reassignment';
import { initI18n } from '@/lib/i18n';
import { api } from '@/lib/api';

beforeAll(async () => {
  await initI18n('en');
});

const ENTRY_ID = '11111111-1111-1111-1111-111111111111';
const SCHEDULE_ID = '22222222-2222-2222-2222-222222222222';

const RESPONSE: ReassignmentResponse = {
  entryId: ENTRY_ID,
  suggestions: [
    {
      employeeId: 'emp-anna',
      employeeName: 'Anna S.',
      score: 78,
      factorScores: {
        capacity: 80,
        proximity: 95,
        qualification: 67,
        experience: 50,
        fairness: 100,
        contingencyBonus: 10,
      },
      reasonKeys: [
        { key: 'reassignment.reasons.capacityHigh', vars: { hoursFree: 18 } },
        { key: 'reassignment.reasons.proximityNear', vars: { km: 2 } },
      ],
      blockerKeys: [],
    },
    {
      employeeId: 'emp-gabi',
      employeeName: 'Gabi M.',
      score: 62,
      factorScores: {
        capacity: 60,
        proximity: 70,
        qualification: 33,
        experience: 0,
        fairness: 100,
        contingencyBonus: 0,
      },
      reasonKeys: [{ key: 'reassignment.reasons.fairnessLow', vars: { count: 0 } }],
      blockerKeys: [],
    },
  ],
  blocked: [
    {
      employeeId: 'emp-daniel',
      employeeName: 'Daniel K.',
      score: 0,
      factorScores: {
        capacity: 0,
        proximity: 0,
        qualification: 0,
        experience: 0,
        fairness: 0,
        contingencyBonus: 0,
      },
      reasonKeys: [],
      blockerKeys: [{ key: 'reassignment.blockers.hasAbsence', vars: { absenceType: 'SICK' } }],
    },
  ],
};

function renderModal(client: QueryClient, onClose = () => {}) {
  return render(
    <QueryClientProvider client={client}>
      <ReassignmentPickerModal
        entryId={ENTRY_ID}
        scheduleId={SCHEDULE_ID}
        propertyName="Porzer Str. 12"
        entryDate="2026-05-20"
        startTime="08:00:00"
        onClose={onClose}
      />
    </QueryClientProvider>
  );
}

describe('ReassignmentPickerModal (ELE-203)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('rendert Suggestions mit Score + Reasons', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    client.setQueryData(reassignmentKeys.forEntry(ENTRY_ID), RESPONSE);

    renderModal(client);

    expect(await screen.findByText('Anna S.')).toBeInTheDocument();
    expect(screen.getByText('Gabi M.')).toBeInTheDocument();
    // Score badges
    const badges = screen.getAllByTestId('score-badge');
    expect(badges.length).toBe(2);
    // Reasons gerendert
    expect(screen.getByText(/18h free/i)).toBeInTheDocument();
    expect(screen.getByText(/2 km away/i)).toBeInTheDocument();
  });

  it('Blocked-Liste ist eingeklappt by default und expandierbar', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    client.setQueryData(reassignmentKeys.forEntry(ENTRY_ID), RESPONSE);

    renderModal(client);

    // Daniel ist initial nicht sichtbar (collapsed)
    expect(screen.queryByText('Daniel K.')).toBeNull();

    // Klick auf Toggle
    const toggle = await screen.findByTestId('reassignment-blocked-toggle');
    fireEvent.click(toggle);

    expect(screen.getByText('Daniel K.')).toBeInTheDocument();
    expect(screen.getByText(/SICK absence/i)).toBeInTheDocument();
  });

  it('Klick auf Suggestion ruft move-mutation und onClose', async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    client.setQueryData(reassignmentKeys.forEntry(ENTRY_ID), RESPONSE);

    const patchSpy = vi.spyOn(api, 'patch').mockResolvedValue({
      // Fastify response shape — wir mocken irgendwas, der hook ist tolerant
      id: ENTRY_ID,
      employee_id: 'emp-anna',
    } as never);

    const onClose = vi.fn();
    renderModal(client, onClose);

    const annaCard = await screen.findByTestId('suggestion-emp-anna');
    fireEvent.click(annaCard);

    await waitFor(() => {
      expect(patchSpy).toHaveBeenCalledWith(
        `/schedule-entries/${ENTRY_ID}/move`,
        expect.objectContaining({ employeeId: 'emp-anna' })
      );
    });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('ESC schließt das Modal', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    client.setQueryData(reassignmentKeys.forEntry(ENTRY_ID), RESPONSE);

    const onClose = vi.fn();
    renderModal(client, onClose);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('Klick auf Backdrop schließt Modal', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    client.setQueryData(reassignmentKeys.forEntry(ENTRY_ID), RESPONSE);

    const onClose = vi.fn();
    renderModal(client, onClose);

    fireEvent.click(screen.getByTestId('reassignment-modal-backdrop'));
    expect(onClose).toHaveBeenCalled();
  });
});
