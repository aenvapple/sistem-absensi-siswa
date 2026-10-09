import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { seedDatabase } from './seed.ts';

const DB_PATH = path.resolve(process.cwd(), 'school_attendance.db');

export const db = new DatabaseSync(DB_PATH);

// Enable foreign key constraints and WAL mode
db.exec('PRAGMA foreign_keys = ON;');

export function initDatabase() {
  const schemaPath = path.resolve(process.cwd(), 'backend/db/schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schemaSql);
  }

  // Seed default data if users table is empty
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (userCount.count === 0) {
    seedDatabase(db);
  }
}
