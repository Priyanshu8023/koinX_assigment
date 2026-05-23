import 'dotenv/config';
import express, { Request, Response } from 'express';
import { connectDB } from './config/db.js';
import { rateLimiter } from './middlewares/rateLimiter.js';
import { errorHandler } from './middlewares/errorHandler.js';
import reconciliationRoutes from './routes/reconciliationRoutes.js';

const app = express();

app.use(express.json());
app.use(rateLimiter);

app.use('/api', reconciliationRoutes);

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(errorHandler);

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error: any) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

start();
