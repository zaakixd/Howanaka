/**
 * Authentication middleware — ensures the user is logged in via session.
 */
import type { Request, Response, NextFunction } from "express";

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const user = (req.session as any)?.user;
  if (!user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  next();
}

// Attach user to request locals for downstream handlers
export function attachUser(req: Request, _res: Response, next: NextFunction): void {
  (req as any).discordUser = (req.session as any)?.user ?? null;
  (req as any).accessToken = (req.session as any)?.accessToken ?? null;
  next();
}
