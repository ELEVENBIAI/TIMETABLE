import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { api } from '@/lib/api';
import { ApiRequestError } from '@/types/api';

describe('API client', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('attaches Authorization header when JWT is stored', async () => {
    localStorage.setItem('timetable.jwt', 'test-token');
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: 'ok' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await api.get('/health');

    expect(fetchMock).toHaveBeenCalledOnce();
    const headers = (fetchMock.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer test-token');
    expect(headers.Accept).toBe('application/json');
  });

  it('skips Authorization header when no JWT', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await api.get('/health');
    const headers = (fetchMock.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
  });

  it('normalizes error responses into ApiRequestError with messageKey', async () => {
    const errorBody = {
      error: {
        code: 'NOT_FOUND',
        messageKey: 'errors.notFound',
        message: 'Not found',
      },
    };
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(errorBody), {
        status: 404,
        headers: { 'content-type': 'application/json' },
      })
    ) as unknown as typeof fetch;

    await expect(api.get('/missing')).rejects.toMatchObject({
      name: 'ApiRequestError',
      status: 404,
      code: 'NOT_FOUND',
      messageKey: 'errors.notFound',
    });
  });

  it('clears JWT on 401', async () => {
    localStorage.setItem('timetable.jwt', 'expired-token');
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ error: { code: 'UNAUTHORIZED', message: 'Token expired' } }),
          { status: 401, headers: { 'content-type': 'application/json' } }
        )
      ) as unknown as typeof fetch;

    await expect(api.get('/secure')).rejects.toBeInstanceOf(ApiRequestError);
    expect(localStorage.getItem('timetable.jwt')).toBeNull();
  });

  it('sends body as JSON for POST', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await api.post('/create', { name: 'X' });

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers['Content-Type']).toBe('application/json');
    expect(init.body).toBe(JSON.stringify({ name: 'X' }));
  });
});
