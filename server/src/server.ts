import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import { connectDB } from './config/db.js';
import { rateLimiter } from './middlewares/rateLimiter.js';
import { errorHandler } from './middlewares/errorHandler.js';
import reconciliationRoutes from './routes/reconciliationRoutes.js';

const app = express();

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,Content-Type,Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.json({ limit: '20mb' }));
app.use(rateLimiter);

// Per-request DB connection — critical for Vercel serverless cold starts
app.use(async (req: Request, res: Response, next: NextFunction) => {
  try {
    await connectDB();
    next();
  } catch (err: any) {
    const dbError: any = new Error(
      'Database connection failed. Please check MONGODB_URI is set correctly in Vercel environment variables.'
    );
    dbError.status = 503;
    next(dbError);
  }
});

app.use('/api', reconciliationRoutes);

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export default app;
