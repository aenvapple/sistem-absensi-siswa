import { Router, Response } from 'express';
import { db } from '../db/database.ts';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.ts';
import { logAudit } from '../services/auditService.ts';

export const classRouter = Router();

/**
 * GET /api/classes
 */
classRouter.get('/', authenticate, (_req, res): void => {
  const classes = db.prepare(`
    SELECT c.*, 
           COUNT(s.id) as student_count,
           SUM(CASE WHEN s.status = 'active' THEN 1 ELSE 0 END) as active_student_count
    FROM classes c
    LEFT JOIN students s ON c.id = s.class_id
    GROUP BY c.id
    ORDER BY c.grade ASC, c.name ASC
  `).all();

  res.json({ success: true, data: classes });
});

/**
 * POST /api/classes
 */
classRouter.post('/', authenticate, requireRole(['admin']), (req: AuthRequest, res: Response): void => {
  const { name, grade, academic_year, is_active } = req.body;

  if (!name || !grade || !academic_year) {
    res.status(400).json({
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'Nama kelas, tingkat (grade), dan tahun ajaran wajib diisi.'
    });
    return;
  }

  const existing = db.prepare('SELECT id FROM classes WHERE name = ?').get(name.trim());
  if (existing) {
    res.status(409).json({
      success: false,
      code: 'DUPLICATE_CLASS',
      message: `Kelas dengan nama "${name}" sudah ada.`
    });
    return;
  }

  const now = new Date().toISOString();
  const activeStatus = is_active !== undefined ? (is_active ? 1 : 0) : 1;

  db.prepare(`
    INSERT INTO classes (name, grade, academic_year, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(name.trim(), Number(grade), academic_year.trim(), activeStatus, now, now);

  const lastId = (db.prepare('SELECT last_insert_rowid() as id').get() as any).id;

  logAudit(
    req.user?.id || null,
    'CREATE_CLASS',
    'classes',
    lastId,
    `Admin ${req.user?.username} menambahkan kelas baru "${name}" (Tingkat ${grade}, ${academic_year})`,
    req.ip
  );

  res.status(201).json({
    success: true,
    message: 'Kelas berhasil ditambahkan.',
    data: { id: lastId, name, grade, academic_year, is_active: activeStatus }
  });
});

/**
 * GET /api/classes/:id
 */
classRouter.get('/:id', authenticate, (req, res): void => {
  const id = Number(req.params.id);
  const row = db.prepare('SELECT * FROM classes WHERE id = ?').get(id);

  if (!row) {
    res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'Kelas tidak ditemukan.' });
    return;
  }

  res.json({ success: true, data: row });
});

/**
 * PUT /api/classes/:id
 */
classRouter.put('/:id', authenticate, requireRole(['admin']), (req: AuthRequest, res: Response): void => {
  const id = Number(req.params.id);
  const { name, grade, academic_year, is_active } = req.body;

  const existing = db.prepare('SELECT * FROM classes WHERE id = ?').get(id) as any;
  if (!existing) {
    res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'Kelas tidak ditemukan.' });
    return;
  }

  if (name && name.trim() !== existing.name) {
    const dup = db.prepare('SELECT id FROM classes WHERE name = ? AND id != ?').get(name.trim(), id);
    if (dup) {
      res.status(409).json({
        success: false,
        code: 'DUPLICATE_CLASS',
        message: `Kelas dengan nama "${name}" sudah terdaftar.`
      });
      return;
    }
  }

  const now = new Date().toISOString();
  const newName = name ? name.trim() : existing.name;
  const newGrade = grade ? Number(grade) : existing.grade;
  const newAcademicYear = academic_year ? academic_year.trim() : existing.academic_year;
  const newActive = is_active !== undefined ? (is_active ? 1 : 0) : existing.is_active;

  db.prepare(`
    UPDATE classes
    SET name = ?, grade = ?, academic_year = ?, is_active = ?, updated_at = ?
    WHERE id = ?
  `).run(newName, newGrade, newAcademicYear, newActive, now, id);

  logAudit(
    req.user?.id || null,
    'UPDATE_CLASS',
    'classes',
    id,
    `Admin ${req.user?.username} mengubah data kelas ID ${id} (${newName})`,
    req.ip
  );

  res.json({
    success: true,
    message: 'Data kelas berhasil diperbarui.',
    data: { id, name: newName, grade: newGrade, academic_year: newAcademicYear, is_active: newActive }
  });
});

/**
 * GET /api/classes/:id/students
 */
classRouter.get('/:id/students', authenticate, (req, res): void => {
  const id = Number(req.params.id);
  const students = db.prepare(`
    SELECT s.*, q.token as active_qr_token, q.status as qr_status
    FROM students s
    LEFT JOIN qr_codes q ON s.id = q.student_id AND q.status = 'active'
    WHERE s.class_id = ?
    ORDER BY s.name ASC
  `).all(id);

  res.json({ success: true, data: students });
});
