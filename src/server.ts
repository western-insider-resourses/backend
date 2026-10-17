import './config/environment.js';
import { createApp } from './app.js';
import { assertDatabaseConfigured, pool } from './database/db.js';

if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not set');
assertDatabaseConfigured();

await pool.query('SELECT 1');

const port = process.env.PORT || 4000;
createApp().listen(port, () => console.log(`API running on http://localhost:${port}`));
