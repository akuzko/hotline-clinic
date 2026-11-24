// Dev helper: fire an availability NOTIFY to watch it arrive in the browser.
// Usage: npm run notify --workspace @hotline/api -- gp
import { specialtySchema } from '@hotline/shared';
import { createDb } from '../src/db/client.js';
import { notifyAvailability } from '../src/realtime/hub.js';

const specialty = specialtySchema.parse(process.argv[2] ?? 'gp');
const { sql } = createDb(process.env.DATABASE_URL ?? '');
const date = new Date().toISOString().slice(0, 10);
await notifyAvailability(sql, { specialty, date });
await sql.end();
console.log(`notified ${specialty} ${date}`);
