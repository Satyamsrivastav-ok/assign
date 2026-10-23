import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pool } from './db';

async function initializeDatabase() {
  const schema = await readFile(resolve(__dirname, '../sql/schema.sql'), 'utf8');
  await pool.query(schema);
  console.log('MiniLedger database schema is ready.');
}

initializeDatabase()
  .catch((error: unknown) => {
    console.error('Database schema initialization failed.', error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
