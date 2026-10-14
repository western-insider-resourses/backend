import jwt from 'jsonwebtoken';
import type { NextFunction, Request, Response } from 'express';
import type { AdminToken } from '../types/express.js';

export const signToken = (admin: { id: number; email: string }): string =>
  jwt.sign({ id: admin.id, email: admin.email }, process.env.JWT_SECRET as string, { expiresIn: '7d' });

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const token = (req.headers.authorization || '').replace(/^Bearer /, '');
  try {
    req.admin = jwt.verify(token, process.env.JWT_SECRET as string) as AdminToken;
    next();
  } catch {
    res.status(401).json({ error: 'Please sign in again.' });
  }
}
