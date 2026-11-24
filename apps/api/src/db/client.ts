import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema.js';

export type Sql = postgres.Sql;
/** A connection or an open transaction: anything that can run a query. */
export type Queryable = postgres.Sql | postgres.TransactionSql;

export function createDb(url: string) {
  // postgres.js keeps LISTEN on its own dedicated connection, separate from this pool.
  const sql = postgres(url, { max: 10, onnotice: () => {} });
  const db = drizzle(sql, { schema });
  return { sql, db };
}

export type Db = ReturnType<typeof createDb>['db'];
