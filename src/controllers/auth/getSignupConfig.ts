import type { RequestHandler } from "express";

export const getSignupConfig: RequestHandler = (_req, res) =>
  res.json({ inviteCodeRequired: !!process.env.ADMIN_SIGNUP_CODE });
