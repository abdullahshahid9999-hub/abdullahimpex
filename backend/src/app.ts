import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import { requireAuth } from './middleware/auth';
import { errorHandler, notFound } from './middleware/error';

import stockRoutes from './routes/stock';
import suppliersRoutes from './routes/suppliers';
import customersRoutes from './routes/customers';
import purchasesRoutes from './routes/purchases';
import salesRoutes from './routes/sales';
import invoicesRoutes from './routes/invoices';
import companiesRoutes from './routes/companies';
import dashboardRoutes from './routes/dashboard';
import exportRoutes from './routes/export';

const app = express();

app.disable('x-powered-by');
app.use(helmet());

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow same-origin / server-to-server calls with no Origin header,
      // and any explicitly allowlisted frontend origin.
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error('Not allowed by CORS'));
    },
    credentials: false,
  })
);

app.use(express.json({ limit: '2mb' }));

// Generic rate limit on the whole API to blunt brute-force / abuse attempts.
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 600,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// Tighter limit specifically on write operations.
const writeLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 200 });
app.use((req, res, next) => {
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) return writeLimiter(req, res, next);
  next();
});

app.get('/health', (_req, res) => res.json({ ok: true }));

// Every route below this line requires a valid Supabase login session.
app.use(requireAuth);

app.use('/stock', stockRoutes);
app.use('/suppliers', suppliersRoutes);
app.use('/customers', customersRoutes);
app.use('/purchases', purchasesRoutes);
app.use('/sales', salesRoutes);
app.use('/invoices', invoicesRoutes);
app.use('/companies', companiesRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/export', exportRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
