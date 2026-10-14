import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db.js';
import { signToken } from '../middleware/auth.js';
import { HttpError, wrap } from '../utils.js';
import { readCredentials } from '../validation.js';

const router = Router();

router.post('/login', wrap(async (req, res) => {
  const { email, password } = readCredentials(req.body);
  const admin = (await query('SELECT * FROM admins WHERE email = $1', [email])).rows[0];
  if (!admin || !(await bcrypt.compare(password, admin.password_hash))) {
    return res.status(401).json({ error: 'Email or password is incorrect.' });
  }
  res.json({ token: signToken({ id: admin.id, email: admin.email }), email: admin.email });
}));

// Create an admin account. If ADMIN_SIGNUP_CODE is set in .env, the person must enter it
// (stops strangers from making themselves admin on a public server).
router.post('/signup', wrap(async (req, res) => {
  const { email, password } = readCredentials(req.body, { strongPassword: true });
  const required = process.env.ADMIN_SIGNUP_CODE;
  if (required && String(req.body?.inviteCode ?? '') !== required) {
    throw new HttpError(403, 'That invite code is not correct.');
  }
  const hash = await bcrypt.hash(password, 12);
  const { rows } = await query<{ id: number; email: string }>(
    'INSERT INTO admins (email, password_hash) VALUES ($1,$2) ON CONFLICT (email) DO NOTHING RETURNING id, email',
    [email, hash]);
  if (!rows[0]) throw new HttpError(409, 'An account with that email already exists.');
  res.status(201).json({ token: signToken(rows[0]), email: rows[0].email });
}));

// Tells the admin site whether to show the invite-code field
router.get('/signup-config', (_req, res) => res.json({ inviteCodeRequired: !!process.env.ADMIN_SIGNUP_CODE }));

export default router;
