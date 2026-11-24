import { z } from 'zod';
import { specialtySchema, type AvailabilityEvent } from '@hotline/shared';
import { publicProcedure, router } from './trpc.js';

export const appRouter = router({
  health: publicProcedure.query(async ({ ctx }) => {
    await ctx.sql`select 1`;
    return { ok: true as const };
  }),

  availability: router({
    /** Live invalidation stream for one specialty (SSE). No polling anywhere. */
    onChange: publicProcedure
      .input(z.object({ specialty: specialtySchema }))
      .subscription(async function* ({ ctx, input, signal }) {
        for await (const event of ctx.hub.events(signal)) {
          if (event.type === 'resync' || event.specialty === input.specialty) {
            yield event satisfies AvailabilityEvent;
          }
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
