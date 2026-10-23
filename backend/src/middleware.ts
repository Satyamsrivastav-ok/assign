import { NextFunction, Request, RequestHandler, Response } from 'express';
import jwt from 'jsonwebtoken';
import { ZodError } from 'zod';
import { config } from './config';

export interface AuthedRequest extends Request {
  userId: number;
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Verifies the Bearer token and attaches userId to the request. */
export const requireAuth: RequestHandler = (req, res, next) => {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    if (
      typeof payload === 'string' ||
      typeof payload.sub !== 'string' ||
      !/^[1-9]\d*$/.test(payload.sub)
    ) {
      throw new Error('Invalid token subject');
    }
    const userId = Number(payload.sub);
    if (!Number.isSafeInteger(userId)) throw new Error('Invalid token subject');
    (req as AuthedRequest).userId = userId;
    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
  }
};

/** Lets async route handlers throw errors into the error middleware (Express 4). */
export const wrap =
  (fn: (req: Request, res: Response) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res).catch(next);
  };

export const errorHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: err.issues[0]?.message ?? 'Invalid input' });
  }
  if (err instanceof SyntaxError && 'status' in err && err.status === 400) {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message });
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
};
