import { EventEmitter, on } from 'node:events';
import {
  availabilityChangedSchema,
  type AvailabilityChanged,
  type AvailabilityEvent,
} from '@hotline/shared';
import type { Queryable, Sql } from '../db/client.js';

export const AVAILABILITY_CHANNEL = 'availability';

/**
 * Publish an availability change. Call it inside the same transaction as the
 * booking write: Postgres delivers NOTIFY only on COMMIT, so a rolled-back
 * change is never announced.
 */
export async function notifyAvailability(
  sql: Queryable,
  event: AvailabilityChanged,
): Promise<void> {
  const payload = availabilityChangedSchema.parse(event);
  await sql`select pg_notify(${AVAILABILITY_CHANNEL}, ${JSON.stringify(payload)})`;
}

/**
 * One per API process. Holds a single LISTEN connection and fans events out
 * to in-process subscribers (the tRPC SSE streams).
 */
export class RealtimeHub {
  private readonly emitter = new EventEmitter();
  private unlisten: (() => Promise<void>) | undefined;
  private listening = false;

  constructor(private readonly sql: Sql) {
    // Every open SSE stream adds a listener; don't warn at 10.
    this.emitter.setMaxListeners(0);
  }

  async start(): Promise<void> {
    const subscription = await this.sql.listen(
      AVAILABILITY_CHANNEL,
      (raw) => {
        const parsed = availabilityChangedSchema.safeParse(safeJson(raw));
        if (parsed.success) this.publish({ type: 'changed', ...parsed.data });
      },
      () => {
        // Called on the first LISTEN and after every reconnect. After a
        // reconnect we may have missed notifications: tell clients to refetch.
        if (this.listening) this.publish({ type: 'resync' });
        this.listening = true;
      },
    );
    this.unlisten = subscription.unlisten;
  }

  async stop(): Promise<void> {
    await this.unlisten?.();
    this.unlisten = undefined;
    this.listening = false;
  }

  /** Async iterator of events; ends when `signal` aborts (client disconnects). */
  async *events(signal: AbortSignal | undefined): AsyncGenerator<AvailabilityEvent> {
    for await (const [event] of on(this.emitter, 'event', { signal })) {
      yield event as AvailabilityEvent;
    }
  }

  private publish(event: AvailabilityEvent): void {
    this.emitter.emit('event', event);
  }
}

function safeJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}
