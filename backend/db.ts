import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool(
  process.env.DATABASE_URL
    ? {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false }
    }
    : {
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'broexcel',
      password: process.env.DB_PASS || 'password',
      port: parseInt(process.env.DB_PORT || '5432'),
      ssl: process.env.DB_SSL === 'false' ? false : (process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false)
    }
);

export const query = (text: string, params?: any[]) => pool.query(text, params);

export const initDb = async () => {
  let retries = 5;
  while (retries) {
    try {
      await pool.query('SELECT NOW()');
      console.log('Database connected successfully');

      await pool.query(`
                CREATE TABLE IF NOT EXISTS datasets (
                    id SERIAL PRIMARY KEY,
                    name TEXT NOT NULL,
                    data TEXT NOT NULL,
                    columns TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
      console.log('Tables initialized');
      break;
    } catch (err) {
      console.error('Database connection failed, retrying...', err);
      retries -= 1;
      await new Promise(res => setTimeout(res, 5000));
    }
  }
  if (!retries) {
    console.error('Could not connect to database after multiple retries');
    process.exit(1);
  }
};

export default { query };
