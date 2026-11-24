import Fastify, { type FastifyServerOptions } from 'fastify';
import { fastifyTRPCPlugin, type FastifyTRPCPluginOptions } from '@trpc/server/adapters/fastify';
import type { Db, Sql } from './db/client.js';
import type { RealtimeHub } from './realtime/hub.js';
import { appRouter, type AppRouter } from './trpc/router.js';

type Deps = { db: Db; sql: Sql; hub: RealtimeHub };

export async function buildServer(deps: Deps, options: FastifyServerOptions = {}) {
  const app = Fastify({ routerOptions: { maxParamLength: 5000 }, ...options });

  // Plain liveness endpoint for the hosting platform.
  app.get('/healthz', async () => ({ ok: true }));

  await app.register(fastifyTRPCPlugin, {
    prefix: '/trpc',
    trpcOptions: {
      router: appRouter,
      createContext: () => deps,
      onError: ({ path, error }) => app.log.error({ path, err: error }, 'tRPC error'),
    } satisfies FastifyTRPCPluginOptions<AppRouter>['trpcOptions'],
  });

  return app;
}
