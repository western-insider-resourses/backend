import type { RequestHandler } from "express";

export const getSession: RequestHandler = (req, res) => {
  if (!req.admin)
    return res.status(401).json({ error: "Please sign in again." });
  res.json({ email: req.admin.email });
};
