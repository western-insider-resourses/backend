import crypto from "node:crypto";
import type { NextFunction, Request, RequestHandler, Response } from "express";

export const slugify = (s: string): string =>
  String(s)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "story";

export const uniqueSlug = (title: string): string =>
  `${slugify(title)}-${crypto.randomBytes(3).toString("hex")}`;

// Wrap async route handlers so thrown errors reach the error middleware
export const wrap =
  (
    fn: (
      req: Request,
      res: Response,
      next: NextFunction,
    ) => Promise<unknown> | unknown,
  ): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

// Errors that carry an HTTP status code
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export const bad = (message: string) => new HttpError(400, message);

// Read a numeric query-string value (?page=2) with a fallback
export const intParam = (v: unknown, fallback: number): number => {
  const n = parseInt(String(v ?? ""), 10);
  return Number.isNaN(n) ? fallback : n;
};
