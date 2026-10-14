import pg from 'pg';

export function assertDatabaseConfigured(): void {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error('DATABASE_URL is not set. Configure the PostgreSQL connection in the selected environment.');
  }
}

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false,
});

// Rows come back loosely typed; routes shape them before sending.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Row = Record<string, any>;

export const query = <T extends pg.QueryResultRow = Row>(text: string, params?: unknown[]) =>
  pool.query<T>(text, params);
