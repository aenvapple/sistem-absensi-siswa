import { db } from '../db/database.ts';

export function logAudit(
  userId: number | null,
  action: string,
  tableName: string,
  recordId: number | null,
  description: string,
  ipAddress?: string
) {
  try {
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO audit_logs (user_id, action, table_name, record_id, description, ip_address, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(userId, action, tableName, recordId, description, ipAddress || '127.0.0.1', now);
  } catch (err) {
    console.error('[AUDIT_ERROR] Failed to write audit log:', err);
  }
}
