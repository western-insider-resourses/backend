import jwt from "jsonwebtoken";
import type { NextFunction, Request, Response } from "express";
import type { AdminToken } from "../shared/types/express.js";

export const signToken = (admin: { id: number; email: string }): string =>
  jwt.sign(
    { id: admin.id, email: admin.email },
    process.env.JWT_SECRET as string,
    { expiresIn: "7d" },
  );

export const adminCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite:
    process.env.NODE_ENV === "production"
      ? ("none" as const)
      : ("lax" as const),
  path: "/api",
  maxAge: 7 * 24 * 60 * 60 * 1000,
});

function cookieValue(header: string | undefined, name: string): string | null {
  const item = header
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  if (!item) return null;
  try {
    return decodeURIComponent(item.slice(name.length + 1));
  } catch {
    return null;
  }
}

export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const cookieToken = cookieValue(req.headers.cookie, "admin_token");
  if (!cookieToken) {
    res.status(401).json({ error: "Please sign in again." });
    return;
  }
  if (req.headers["x-admin-request"] !== "1") {
    res.status(403).json({ error: "Invalid admin request." });
    return;
  }
  try {
    req.admin = jwt.verify(
      cookieToken,
      process.env.JWT_SECRET as string,
    ) as AdminToken;
    next();
  } catch {
    const { maxAge: _maxAge, ...clearOptions } = adminCookieOptions();
    res.clearCookie("admin_token", clearOptions);
    res.status(401).json({ error: "Please sign in again." });
  }
}
