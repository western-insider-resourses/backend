export interface AdminToken { id: number; email: string }

declare global {
  namespace Express {
    interface Request {
      admin?: AdminToken;
    }
  }
}
