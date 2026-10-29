// Creates the schema and seeds the default users. Safe to run repeatedly.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import pg from 'pg';

const { Client } = pg;

const DEFAULT_USERS = [
  { username: 'admin', password: '1234', role: 'admin', label: 'Administrador' },
  { username: 'admin2', password: '4132', role: 'admin2', label: 'Administrador Garaje 14' },
  { username: 'usertaller', password: '4321', role: 'user', label: 'Taller' },
  { username: 'usergomeria', password: '4321', role: 'user', label: 'Gomería' },
  { username: 'garaje14', password: '4213', role: 'user', label: 'Garaje 14' },
];

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

async function connect() {
  for (let attempt = 1; attempt <= 30; attempt += 1) {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    try {
      await client.connect();
      return client;
    } catch (error) {
      await client.end().catch(() => {});
      if (attempt === 30) throw error;
      console.log(`database not ready (attempt ${attempt}), retrying...`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
  throw new Error('unreachable');
}

const client = await connect();
try {
  const schema = await readFile(path.join(process.cwd(), 'db', 'schema.sql'), 'utf8');
  await client.query(schema);
  console.log('schema ready');

  for (const user of DEFAULT_USERS) {
    await client.query(
      `INSERT INTO users (username, password_hash, role, label)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (username) DO NOTHING`,
      [user.username, hashPassword(user.password), user.role, user.label],
    );
  }
  console.log('users ready');
} finally {
  await client.end();
}
