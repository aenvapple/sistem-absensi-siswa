import { Router, Response } from 'express';
import { db } from '../db/database.ts';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.ts';
import { generateQRToken } from '../services/crypto.ts';
import { logAudit } from '../services/auditService.ts';

export const qrRouter = Router();

/**
 * GET /api/qr/list
 * List students with their active QR details for QR Management
 */
qrRouter.get('/list', authenticate, (req, res): void => {
  const { class_id, search, qr_status } = req.query;

  let query = `
    SELECT s.id as student_id, s.student_code, s.nis, s.name as student_name, s.status as student_status,
           c.id as class_id, c.name as class_name,
           q.id as qr_id, q.token as qr_token, q.status as qr_status, q.generated_at, q.revoked_at
    FROM students s
    JOIN classes c ON s.class_id = c.id
    LEFT JOIN qr_codes q ON s.id = q.student_id AND q.status = 'active'
    WHERE 1=1
  `;
  const params: any[] = [];

  if (class_id) {
    query += ' AND s.class_id = ?';
    params.push(Number(class_id));
  }
  if (search) {
    query += ' AND (s.name LIKE ? OR s.student_code LIKE ? OR s.nis LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term);
  }
  if (qr_status === 'active') {
    query += ' AND q.id IS NOT NULL';
  } else if (qr_status === 'none') {
    query += ' AND q.id IS NULL';
  }

  query += ' ORDER BY c.grade ASC, c.name ASC, s.name ASC';

  const rows = db.prepare(query).all(...params);
  res.json({ success: true, data: rows });
});

/**
 * POST /api/students/:id/qr
 * Generate a new QR code (revokes previous active QR if present)
 */
qrRouter.post('/students/:id/qr', authenticate, requireRole(['admin']), (req: AuthRequest, res: Response): void => {
  const studentId = Number(req.params.id);

  const student = db.prepare(`
    SELECT s.*, c.name as class_name FROM students s JOIN classes c ON s.class_id = c.id WHERE s.id = ?
  `).get(studentId) as any;

  if (!student) {
    res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'Siswa tidak ditemukan.' });
    return;
  }

  const now = new Date().toISOString();

  // 1. Revoke any existing active QR
  const activeQr = db.prepare("SELECT id, token FROM qr_codes WHERE student_id = ? AND status = 'active'").get(studentId) as any;
  if (activeQr) {
    db.prepare('UPDATE qr_codes SET status = "revoked", revoked_at = ?, updated_at = ? WHERE id = ?')
      .run(now, now, activeQr.id);
  }

  // 2. Generate unique token
  let token = generateQRToken();
  // Ensure token is unique
  while (db.prepare('SELECT id FROM qr_codes WHERE token = ?').get(token)) {
    token = generateQRToken();
  }

  // 3. Insert new active QR
  db.prepare(`
    INSERT INTO qr_codes (student_id, token, status, generated_at, created_at, updated_at)
    VALUES (?, ?, 'active', ?, ?, ?)
  `).run(studentId, token, now, now, now);

  const lastId = (db.prepare('SELECT last_insert_rowid() as id').get() as any).id;

  logAudit(
    req.user?.id || null,
    'GENERATE_QR',
    'qr_codes',
    lastId,
    `Admin ${req.user?.username} membuat QR Code baru untuk siswa ${student.name} (${student.class_name})${activeQr ? ' dan mencabut QR lama' : ''}`,
    req.ip
  );

  res.json({
    success: true,
    message: 'QR Code baru berhasil digenerate.',
    data: {
      qr_id: lastId,
      student_id: studentId,
      token,
      status: 'active',
      generated_at: now
    }
  });
});

/**
 * POST /api/qr/:id/revoke
 * Explicitly revoke a QR code
 */
qrRouter.post('/:id(\\d+)/revoke', authenticate, requireRole(['admin']), (req: AuthRequest, res: Response): void => {
  const qrId = Number(req.params.id);

  const qr = db.prepare(`
    SELECT q.*, s.name as student_name, c.name as class_name
    FROM qr_codes q
    JOIN students s ON q.student_id = s.id
    JOIN classes c ON s.class_id = c.id
    WHERE q.id = ?
  `).get(qrId) as any;

  if (!qr) {
    res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'QR Code tidak ditemukan.' });
    return;
  }

  if (qr.status === 'revoked') {
    res.status(400).json({ success: false, code: 'ALREADY_REVOKED', message: 'QR Code ini sudah dicabut sebelumnya.' });
    return;
  }

  const now = new Date().toISOString();
  db.prepare('UPDATE qr_codes SET status = "revoked", revoked_at = ?, updated_at = ? WHERE id = ?').run(now, now, qrId);

  logAudit(
    req.user?.id || null,
    'REVOKE_QR',
    'qr_codes',
    qrId,
    `Admin ${req.user?.username} mencabut (revoke) QR Code untuk siswa ${qr.student_name} (${qr.class_name})`,
    req.ip
  );

  res.json({
    success: true,
    message: 'QR Code berhasil dicabut (revoked).'
  });
});
