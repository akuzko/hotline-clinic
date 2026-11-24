import { createDb } from './db/client.js';
import { loadEnv } from './env.js';
import { RealtimeHub } from './realtime/hub.js';
import { buildServer } from './server.js';

const env = loadEnv();
const { db, sql } = createDb(env.DATABASE_URL);
const hub = new RealtimeHub(sql);
await hub.start();

const app = await buildServer({ db, sql, hub }, { logger: true });

async function shutdown() {
  await app.close();
  await hub.stop();
  await sql.end({ timeout: 5 });
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

await app.listen({ port: env.PORT, host: '0.0.0.0' });
