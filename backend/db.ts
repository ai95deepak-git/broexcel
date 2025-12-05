import sqlite3 from 'sqlite3';


const dbPath = './broexcel.db';

export const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Could not connect to database', err);
  } else {
    console.log('Connected to SQLite database');
  }
});

export const query = (text: string, params: any[] = []) => {
  return new Promise<any>((resolve, reject) => {
    // Convert $1, $2 to ? for SQLite
    // Note: This is a simple regex and might need refinement for complex cases
    // But for this app, it should be enough if we just pass params in order
    // However, sqlite3 uses ? or $name.
    // We will assume the caller updates the query to use ? or we handle it here.
    // Actually, it's safer to update routes.ts to use ?

    if (text.trim().toUpperCase().startsWith('SELECT')) {
      db.all(text, params, (err, rows) => {
        if (err) reject(err);
        else resolve({ rows });
      });
    } else {
      db.run(text, params, function (err) {
        if (err) reject(err);
        else resolve({ rows: [], rowCount: this.changes, lastID: this.lastID });
      });
    }
  });
};

export const initDb = async () => {
  const run = (sql: string) => new Promise<void>((resolve, reject) => {
    db.run(sql, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  try {
    await run(`CREATE TABLE IF NOT EXISTS datasets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            data TEXT NOT NULL,
            columns TEXT NOT NULL,
            user_id INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

    await run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            mobile_number TEXT UNIQUE,
            name TEXT,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

    await run(`CREATE TABLE IF NOT EXISTS otp_codes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL,
            code TEXT NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

    console.log('Tables initialized (SQLite)');
  } catch (err) {
    console.error('Error initializing tables', err);
  }
};

export default { query };
