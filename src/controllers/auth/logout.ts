import type { RequestHandler } from "express";
import { adminCookieOptions } from "../../middleware/auth.js";

export const logout: RequestHandler = (_req, res) => {
  const { maxAge: _maxAge, ...clearOptions } = adminCookieOptions();
  res.clearCookie("admin_token", clearOptions);
  res.status(204).end();
};
