import bcrypt from "bcryptjs";
import { query } from "../../database/db.js";
import { adminCookieOptions, signToken } from "../../middleware/auth.js";
import { wrap } from "../../shared/utils.js";
import { readCredentials } from "../../shared/validation.js";

export const login = wrap(async (req, res) => {
  const { email, password } = readCredentials(req.body);
  const admin = (await query("SELECT * FROM admins WHERE email = $1", [email]))
    .rows[0];
  if (!admin || !(await bcrypt.compare(password, admin.password_hash))) {
    return res.status(401).json({ error: "Email or password is incorrect." });
  }
  res.cookie(
    "admin_token",
    signToken({ id: admin.id, email: admin.email }),
    adminCookieOptions(),
  );
  res.json({ email: admin.email });
});
