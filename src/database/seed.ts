import "../config/environment.js";
import bcrypt from "bcryptjs";
import { assertDatabaseConfigured, pool } from "./db.js";
import { slugify } from "../shared/utils.js";
import { NICHES } from "../shared/niches.js";

assertDatabaseConfigured();
const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;
if (!email || !password)
  throw new Error(
    "Set ADMIN_EMAIL and ADMIN_PASSWORD in the selected environment file.",
  );

try {
  await pool.query(
    `INSERT INTO admins (email, password_hash) VALUES ($1,$2)
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
    [email.toLowerCase(), await bcrypt.hash(password, 12)],
  );

  for (const [i, name] of NICHES.entries()) {
    await pool.query(
      `INSERT INTO categories (name, slug, position) VALUES ($1,$2,$3) ON CONFLICT (slug) DO NOTHING`,
      [name, slugify(name), i],
    );
  }
  console.log(`Admin ${email} and ${NICHES.length} niches ready.`);
} finally {
  await pool.end();
}
