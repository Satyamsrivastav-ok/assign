import 'dotenv/config';

const need = (key: string): string => {
  const v = process.env[key];
  if (!v) throw new Error(`Missing env var ${key} (see .env.example)`);
  return v;
};

const port = Number(process.env.PORT ?? 4000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535');
}

const jwtSecret = need('JWT_SECRET');
if (jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters long');
}

export const config = {
  port,
  databaseUrl: need('DATABASE_URL'),
  jwtSecret,
  otpTtlMs: 5 * 60 * 1000, // OTP valid for 5 minutes
  maxOtpAttempts: 5,
  otpCooldownSeconds: 30, // minimum gap between OTP requests per phone
};
