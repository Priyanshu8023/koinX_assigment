import { Request, Response, NextFunction } from 'express';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const status = err.status || 500;
  const title = err.title || (status === 404 ? 'Resource Not Found' : 'Internal Server Error');
  const type = err.type || 'about:blank';

  console.error(`[Error] ${status} - ${err.message || err}`);

  res.status(status).json({
    type,
    title,
    status,
    detail: err.message || 'An unexpected error occurred.',
    instance: req.originalUrl
  });
}
