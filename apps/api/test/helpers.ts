import { createDb } from '../src/db/client.js';
import { RealtimeHub } from '../src/realtime/hub.js';
import { buildServer } from '../src/server.js';

export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgres://hotline:hotline@localhost:5434/hotline_test';

/** Real server on a random port, backed by the test database. */
export async function startTestServer() {
  const { db, sql } = createDb(TEST_DATABASE_URL);
  const hub = new RealtimeHub(sql);
  await hub.start();
  const app = await buildServer({ db, sql, hub });
  const address = await app.listen({ port: 0, host: '127.0.0.1' });
  return {
    url: address,
    sql,
    async close() {
      await app.close();
      await hub.stop();
      await sql.end({ timeout: 5 });
    },
  };
}

/**
 * Open a tRPC SSE subscription with plain fetch and collect `data:` events.
 * Deliberately not using the tRPC client: this is what a browser's EventSource sees.
 */
export function openSse(url: string) {
  const controller = new AbortController();
  const events: unknown[] = [];
  let connected!: () => void;
  const ready = new Promise<void>((resolve) => (connected = resolve));

  const done = (async () => {
    const res = await fetch(url, {
      headers: { accept: 'text/event-stream' },
      signal: controller.signal,
    });
    if (!res.ok || !res.body) throw new Error(`SSE failed: ${res.status}`);
    let buffer = '';
    const decoder = new TextDecoder();
    for await (const chunk of res.body) {
      buffer += decoder.decode(chunk as Uint8Array, { stream: true });
      let sep: number;
      while ((sep = buffer.indexOf('\n\n')) !== -1) {
        const block = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);
        if (/^event: connected/m.test(block)) connected();
        const data = block.match(/^data: (.*)$/m)?.[1];
        if (data && !/^event: /m.test(block)) events.push(JSON.parse(data));
      }
    }
  })().catch((err: unknown) => {
    if ((err as Error).name !== 'AbortError') throw err;
  });

  return {
    events,
    ready,
    async close() {
      controller.abort();
      await done;
    },
  };
}

export async function waitFor(check: () => boolean, timeoutMs = 2000): Promise<void> {
  const start = Date.now();
  while (!check()) {
    if (Date.now() - start > timeoutMs) throw new Error(`timed out after ${timeoutMs}ms`);
    await new Promise((r) => setTimeout(r, 20));
  }
}
