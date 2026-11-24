import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { notifyAvailability } from '../src/realtime/hub.js';
import { openSse, startTestServer, waitFor } from './helpers.js';

// Walking skeleton for the realtime path:
// Postgres NOTIFY -> LISTEN connection -> RealtimeHub -> tRPC SSE -> client.
describe('availability.onChange (SSE)', () => {
  let server: Awaited<ReturnType<typeof startTestServer>>;
  const subscribe = (specialty: string) =>
    openSse(
      `${server.url}/trpc/availability.onChange?input=${encodeURIComponent(JSON.stringify({ specialty }))}`,
    );

  beforeAll(async () => {
    server = await startTestServer();
  });
  afterAll(async () => {
    await server?.close();
  });

  it('delivers a committed change to subscribers of that specialty only, within 2s', async () => {
    const gp = subscribe('gp');
    const trauma = subscribe('trauma');
    await Promise.all([gp.ready, trauma.ready]);

    await notifyAvailability(server.sql, { specialty: 'gp', date: '2026-11-23' });

    await waitFor(() => gp.events.length === 1, 2000);
    expect(gp.events[0]).toEqual({ type: 'changed', specialty: 'gp', date: '2026-11-23' });

    // Give a wrongly-routed event a chance to arrive before asserting absence.
    await new Promise((r) => setTimeout(r, 200));
    expect(trauma.events).toEqual([]);

    await Promise.all([gp.close(), trauma.close()]);
  });

  it('does not announce a change whose transaction rolled back', async () => {
    const gp = subscribe('gp');
    await gp.ready;

    await server.sql
      .begin(async (tx) => {
        await notifyAvailability(tx, { specialty: 'gp', date: '2026-11-23' });
        throw new Error('rollback');
      })
      .catch(() => {});
    await notifyAvailability(server.sql, { specialty: 'gp', date: '2026-11-24' });

    await waitFor(() => gp.events.length >= 1);
    await new Promise((r) => setTimeout(r, 200));
    expect(gp.events).toEqual([{ type: 'changed', specialty: 'gp', date: '2026-11-24' }]);

    await gp.close();
  });

  it('rejects an unknown specialty', async () => {
    // tRPC SSE always answers 200 and reports errors as a `serialized-error` event.
    const res = await fetch(
      `${server.url}/trpc/availability.onChange?input=${encodeURIComponent(JSON.stringify({ specialty: 'dentist' }))}`,
      { headers: { accept: 'text/event-stream' } },
    );
    const reader = res.body!.getReader();
    let text = '';
    while (!text.includes('event: serialized-error')) {
      const { value, done } = await reader.read();
      if (done) break;
      text += new TextDecoder().decode(value);
    }
    await reader.cancel();
    expect(text).toContain('event: serialized-error');
    expect(text).toContain('"code":"BAD_REQUEST"');
  });
});
