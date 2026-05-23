import { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const requestTracker = new Map<string, RateLimitRecord>();

export function rateLimiter(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  
  const WINDOW_MS = 60 * 1000; 
  const MAX_REQUESTS = 60;     

  const record = requestTracker.get(ip);

  if (!record || now > record.resetTime) {
    requestTracker.set(ip, {
      count: 1,
      resetTime: now + WINDOW_MS
    });
    return next();
  }

  record.count++;
  
  if (record.count > MAX_REQUESTS) {
    res.status(429).json({
      type: 'about:blank',
      title: 'Too Many Requests',
      status: 429,
      detail: `Rate limit exceeded. Please wait ${Math.ceil((record.resetTime - now) / 1000)} seconds before trying again.`,
      instance: req.originalUrl
    });
    return;
  }

  next();
}
