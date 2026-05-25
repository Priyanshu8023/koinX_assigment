import { Request, Response, NextFunction } from 'express';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // MongoDB connection / network errors → 503
  if (
    err.name === 'MongoNetworkError' ||
    err.name === 'MongoServerSelectionError' ||
    err.name === 'MongooseServerSelectionError' ||
    (err.message && err.message.includes('ECONNREFUSED')) ||
    (err.message && err.message.includes('Database connection failed'))
  ) {
    console.error(`[DB Error] ${err.message}`);
    res.status(503).json({
      title: 'Database Unavailable',
      status: 503,
      detail: 'Could not connect to the database. Please ensure MONGODB_URI is set in Vercel environment variables and the IP whitelist allows all IPs (0.0.0.0/0).',
      instance: req.originalUrl
    });
    return;
  }

  // CSV parse errors → 400
  if (
    err.message && (
      err.message.includes('Invalid CSV') ||
      err.message.includes('csv') ||
      err.message.includes('CSV')
    )
  ) {
    console.error(`[CSV Error] ${err.message}`);
    res.status(400).json({
      title: 'Invalid CSV Format',
      status: 400,
      detail: 'One or more uploaded CSV files could not be parsed. Please ensure they are valid CSV files with the correct columns.',
      instance: req.originalUrl
    });
    return;
  }

  // Payload too large → 413
  if (err.type === 'entity.too.large' || err.status === 413) {
    res.status(413).json({
      title: 'Payload Too Large',
      status: 413,
      detail: 'The uploaded CSV files are too large. Please ensure each file is under 20MB.',
      instance: req.originalUrl
    });
    return;
  }

  // Generic fallback
  const status = err.status || 500;
  const title = err.title || (status === 404 ? 'Resource Not Found' : 'Internal Server Error');

  console.error(`[Error] ${status} - ${err.message || err}`);

  res.status(status).json({
    title,
    status,
    detail: err.message || 'An unexpected error occurred.',
    instance: req.originalUrl
  });
}
