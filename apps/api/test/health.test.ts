import { afterAll, beforeAll, expect, it } from 'vitest';
import { startTestServer } from './helpers.js';

let server: Awaited<ReturnType<typeof startTestServer>>;
beforeAll(async () => {
  server = await startTestServer();
});
afterAll(async () => {
  await server?.close();
});

it('reports healthy with a live database', async () => {
  const res = await fetch(`${server.url}/trpc/health`);
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ result: { data: { ok: true } } });
});
