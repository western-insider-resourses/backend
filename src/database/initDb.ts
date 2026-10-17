import '../config/environment.js';
import fs from 'node:fs';
import { assertDatabaseConfigured, pool } from './db.js';

assertDatabaseConfigured();
const sql = fs.readFileSync(new URL('../../schema.sql', import.meta.url), 'utf8');
try {
  await pool.query(sql);
  console.log('Database schema ready.');
} finally {
  await pool.end();
}
