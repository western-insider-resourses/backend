import './config.js';
import { assertDatabaseConfigured, pool } from './db.js';

assertDatabaseConfigured();

try {
  await pool.query('SELECT 1');
  console.log('PostgreSQL connection successful.');
} finally {
  await pool.end();
}
