import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  SimulatorConnectionError,
  SimulatorHttpError,
  simulatorRequest,
} from '../src/simulatorClient.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('simulatorRequest', () => {
  it('retries safe read requests on transient HTTP errors', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: 'busy' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 'XR-900' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

    vi.stubGlobal('fetch', fetchMock);

    const payload = await simulatorRequest('http://simulator', '/api/status', undefined, {
      readRetryCount: 2,
      readRetryDelayMs: 0,
      timeoutMs: 100,
    });

    expect(payload).toEqual({ id: 'XR-900' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not retry mutating requests when the simulator returns an error', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: 'busy' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    vi.stubGlobal('fetch', fetchMock);

    await expect(
      simulatorRequest(
        'http://simulator',
        '/api/move',
        {
          method: 'POST',
          body: JSON.stringify({ x: 1, y: 1 }),
        },
        {
          readRetryCount: 3,
          readRetryDelayMs: 0,
          timeoutMs: 100,
        },
      ),
    ).rejects.toBeInstanceOf(SimulatorHttpError);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('surfaces timeout failures with attempt counts', async () => {
    const fetchMock = vi.fn().mockImplementation(
      async (_url: string, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'));
          });
        }),
    );

    vi.stubGlobal('fetch', fetchMock);

    await expect(
      simulatorRequest('http://simulator', '/api/status', undefined, {
        timeoutMs: 10,
        readRetryCount: 2,
        readRetryDelayMs: 0,
      }),
    ).rejects.toMatchObject<Partial<SimulatorConnectionError>>({
      timedOut: true,
      attempts: 3,
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
