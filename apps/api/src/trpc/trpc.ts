import { initTRPC } from '@trpc/server';
import type { Db, Sql } from '../db/client.js';
import type { RealtimeHub } from '../realtime/hub.js';

export type Context = { db: Db; sql: Sql; hub: RealtimeHub };

const t = initTRPC.context<Context>().create({
  sse: {
    // Keeps proxies from closing idle streams and lets the client detect dead ones.
    ping: { enabled: true, intervalMs: 15_000 },
    client: { reconnectAfterInactivityMs: 20_000 },
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;
