import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db';
import { AuthedRequest, HttpError, requireAuth, wrap } from '../middleware';

const router = Router();
router.use(requireAuth);

const loanSchema = z.object({
  friendName: z.string().trim().min(1, 'Friend name is required').max(100),
  amount: z
    .number()
    .positive('Amount must be greater than 0')
    .max(1_000_000_000)
    .refine(
      (amount) => /^\d+(?:\.\d{1,2})?$/.test(amount.toString()),
      'Amount can have at most 2 decimal places'
    ),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Due date must be YYYY-MM-DD')
    .refine((d) => !Number.isNaN(Date.parse(d)) && new Date(d).toISOString().startsWith(d), 'Invalid date'),
});

// Dates are returned as plain 'YYYY-MM-DD' strings to avoid timezone shifts.
const LOAN_COLUMNS = `id, friend_name AS "friendName", amount::float8 AS amount,
  to_char(due_date, 'YYYY-MM-DD') AS "dueDate", status,
  (status = 'pending' AND due_date < CURRENT_DATE) AS overdue`;

// List loans + dashboard summary, both computed from the database.
router.get(
  '/',
  wrap(async (req, res) => {
    const userId = (req as AuthedRequest).userId;
    const loans = await pool.query(
      `SELECT ${LOAN_COLUMNS} FROM loans WHERE user_id = $1 ORDER BY due_date ASC, id ASC`,
      [userId]
    );
    const summary = await pool.query(
      `SELECT
         COALESCE(SUM(amount), 0)::float8 AS "totalLent",
         COALESCE(SUM(amount) FILTER (WHERE status = 'repaid'), 0)::float8 AS "totalRepaid",
         COALESCE(SUM(amount) FILTER (WHERE status = 'pending' AND due_date < CURRENT_DATE), 0)::float8 AS "overdueAmount"
       FROM loans WHERE user_id = $1`,
      [userId]
    );
    res.json({ loans: loans.rows, summary: summary.rows[0] });
  })
);

router.post(
  '/',
  wrap(async (req, res) => {
    const userId = (req as AuthedRequest).userId;
    const { friendName, amount, dueDate } = loanSchema.parse(req.body);
    const { rows } = await pool.query(
      `INSERT INTO loans (user_id, friend_name, amount, due_date)
       VALUES ($1, $2, $3, $4) RETURNING ${LOAN_COLUMNS}`,
      [userId, friendName, amount, dueDate]
    );
    res.status(201).json(rows[0]);
  })
);

// The status = 'pending' condition means a loan can only be repaid once.
router.patch(
  '/:id/repay',
  wrap(async (req, res) => {
    const userId = (req as AuthedRequest).userId;
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw new HttpError(400, 'Invalid loan id');

    const { rows } = await pool.query(
      `UPDATE loans SET status = 'repaid', repaid_at = now()
       WHERE id = $1 AND user_id = $2 AND status = 'pending'
       RETURNING ${LOAN_COLUMNS}`,
      [id, userId]
    );
    if (rows.length > 0) return res.json(rows[0]);

    const exists = await pool.query('SELECT 1 FROM loans WHERE id = $1 AND user_id = $2', [id, userId]);
    if (exists.rowCount === 0) throw new HttpError(404, 'Loan not found');
    throw new HttpError(409, 'Loan is already marked as repaid');
  })
);

export default router;
