import bcrypt from "bcryptjs";
import { query } from "../../database/db.js";
import { adminCookieOptions, signToken } from "../../middleware/auth.js";
import { HttpError, wrap } from "../../shared/utils.js";
import { readCredentials } from "../../shared/validation.js";

export const signup = wrap(async (req, res) => {
  const { email, password } = readCredentials(req.body, {
    strongPassword: true,
  });
  const required = process.env.ADMIN_SIGNUP_CODE;
  if (required && String(req.body?.inviteCode ?? "") !== required) {
    throw new HttpError(403, "That invite code is not correct.");
  }
  const hash = await bcrypt.hash(password, 12);
  const { rows } = await query<{ id: number; email: string }>(
    "INSERT INTO admins (email, password_hash) VALUES ($1,$2) ON CONFLICT (email) DO NOTHING RETURNING id, email",
    [email, hash],
  );
  if (!rows[0])
    throw new HttpError(409, "An account with that email already exists.");
  res.cookie("admin_token", signToken(rows[0]), adminCookieOptions());
  res.status(201).json({ email: rows[0].email });
});
