import { createClient } from '@libsql/client';
import bcrypt from 'bcryptjs';

const db = createClient({
  url: 'libsql://finance-tracker-ploutoss-dev.aws-eu-west-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3ODEwMzg1MjcsImlkIjoiMDE5ZWFlMmEtMTMwMS03ODcyLWI5NGMtZWYwMmJjNTc5NWUwIiwicmlkIjoiNGViMDYwZWItMjg1Mi00OTgxLWIwODEtNGYxYjMzZjY2M2RiIn0.8MDY3wLuDBtSEX3EP-3fH4FsgBH7AhmhE-w8wyfTWKuXYEwBgzxbb8DRrHQgpshtrrO7Ar15AFxpzIUCt-GaCA',
});

const email = 'Groenendaalsylven@gmail.com'; // change this
const password = 'Freeruneend1!'; // change this

const hash = await bcrypt.hash(password, 12);

await db.execute({
  sql: 'CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE, password TEXT NOT NULL, created_at TEXT DEFAULT (datetime(\'now\')))',
  args: [],
});

await db.execute({
  sql: 'INSERT INTO users (email, password) VALUES (?, ?)',
  args: [email, hash],
});

console.log('User created successfully!');
process.exit(0);
