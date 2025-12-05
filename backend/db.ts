import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'broexcel',
  password: process.env.DB_PASS || 'password',
  port: parseInt(process.env.DB_PORT || '5432'),
  ssl: process.env.DB_HOST !== 'localhost' ? { rejectUnauthorized: false } : undefined
});

export const query = (text: string, params: any[] = []) => {
  return pool.query(text, params);
};

export const initDb = async () => {
  try {
    await query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                mobile_number TEXT UNIQUE,
                name TEXT,
                password_hash TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

    await query(`
            CREATE TABLE IF NOT EXISTS datasets (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                data TEXT NOT NULL,
                columns TEXT NOT NULL,
                user_id INTEGER REFERENCES users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

    await query(`
            CREATE TABLE IF NOT EXISTS otp_codes (
                id SERIAL PRIMARY KEY,
                email TEXT NOT NULL,
                code TEXT NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

    console.log('Tables initialized (PostgreSQL)');
  } catch (err) {
    console.error('Error initializing tables', err);
  }
};

export default { query };
