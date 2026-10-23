import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { config } from '../config';
import { pool } from '../db';
import { HttpError, wrap } from '../middleware';

const router = Router();

const phone = z.string().trim().regex(/^\+?\d{10,15}$/, 'Enter a valid phone number (10-15 digits)');

// Step 1: generate mock OTP, store only its hash, print the code in the server terminal.
router.post(
  '/request-otp',
  wrap(async (req, res) => {
    const { phone: p } = z.object({ phone }).parse(req.body);
    const code = crypto.randomInt(100000, 1000000).toString();
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + config.otpTtlMs);

    // The WHERE clause enforces a cooldown so attempts can't be reset by spamming requests.
    const { rowCount } = await pool.query(
      `INSERT INTO otps (phone, code_hash, expires_at, attempts, requested_at)
       VALUES ($1, $2, $3, 0, now())
       ON CONFLICT (phone) DO UPDATE
         SET code_hash = EXCLUDED.code_hash, expires_at = EXCLUDED.expires_at,
             attempts = 0, requested_at = now()
         WHERE otps.requested_at < now() - make_interval(secs => $4)`,
      [p, codeHash, expiresAt, config.otpCooldownSeconds]
    );
    if (rowCount === 0) throw new HttpError(429, 'Please wait a bit before requesting another OTP');

    console.log(`[MOCK SMS] OTP for ${p}: ${code} (valid 5 min)`);
    res.json({ message: 'OTP sent. Check the server terminal.' });
  })
);

// Step 2: verify OTP, create user on first login, return a JWT.
router.post(
  '/verify-otp',
  wrap(async (req, res) => {
    const { phone: p, otp } = z
      .object({ phone, otp: z.string().regex(/^\d{6}$/, 'OTP must be 6 digits') })
      .parse(req.body);

    const client = await pool.connect();
    let transactionOpen = false;
    let userId: number;
    try {
      await client.query('BEGIN');
      transactionOpen = true;

      const { rows } = await client.query(
        `SELECT code_hash FROM otps
         WHERE phone = $1 AND attempts < $2 AND expires_at > now()
         FOR UPDATE`,
        [p, config.maxOtpAttempts]
      );
      if (rows.length === 0) {
        throw new HttpError(400, 'OTP expired, not requested, or too many attempts. Request a new OTP.');
      }

      await client.query('UPDATE otps SET attempts = attempts + 1 WHERE phone = $1', [p]);
      if (!(await bcrypt.compare(otp, rows[0].code_hash))) {
        await client.query('COMMIT');
        transactionOpen = false;
        throw new HttpError(401, 'Incorrect OTP');
      }

      const user = await client.query(
        `INSERT INTO users (phone) VALUES ($1)
         ON CONFLICT (phone) DO UPDATE SET phone = EXCLUDED.phone
         RETURNING id`,
        [p]
      );
      userId = user.rows[0].id;
      await client.query('DELETE FROM otps WHERE phone = $1', [p]);
      await client.query('COMMIT');
      transactionOpen = false;
    } catch (error) {
      if (transactionOpen) await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    const token = jwt.sign({ sub: String(userId) }, config.jwtSecret, { expiresIn: '7d' });
    res.json({ token });
  })
);

export default router;
