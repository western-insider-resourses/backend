import { bad } from "./utils.js";

export const MIN_PASSWORD = 8;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface Credentials {
  email: string;
  password: string;
}

// Shared by login and signup: trims/lowercases the email and checks the shape.
export function readCredentials(
  body: Record<string, unknown> | undefined,
  { strongPassword = false } = {},
): Credentials {
  const email = String(body?.email ?? "")
    .trim()
    .toLowerCase();
  const password = String(body?.password ?? "");
  if (!EMAIL_RE.test(email)) throw bad("Enter a valid email address.");
  if (!password) throw bad("Enter your password.");
  if (strongPassword && password.length < MIN_PASSWORD)
    throw bad(`Use a password of at least ${MIN_PASSWORD} characters.`);
  return { email, password };
}
