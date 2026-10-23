import cors from 'cors';
import express from 'express';
import { config } from './config';
import { errorHandler, wrap } from './middleware';
import { pool } from './db';
import authRoutes from './routes/auth';
import loanRoutes from './routes/loans';

const app = express();
app.use(cors());
app.use(express.json());

app.get(
  '/health',
  wrap(async (_req, res) => {
    await pool.query('SELECT 1');
    res.json({ ok: true, database: 'connected' });
  })
);
app.use('/auth', authRoutes);
app.use('/loans', loanRoutes);
app.use(errorHandler);

app.listen(config.port, () => console.log(`MiniLedger API on http://localhost:${config.port}`));
