import { Router, Response } from 'express';
import { db } from '../db/database.ts';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.ts';
import { generateQRToken } from '../services/crypto.ts';
import { logAudit } from '../services/auditService.ts';

export const studentRouter = Router();

/**
 * GET /api/students
 */
studentRouter.get('/', authenticate, (req, res): void => {
  const { class_id, status, search } = req.query;

  let query = `
    SELECT s.*, c.name as class_name, c.grade,
           q.id as qr_id, q.token as qr_token, q.status as qr_status, q.generated_at as qr_generated_at
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
  if (status) {
    query += ' AND s.status = ?';
    params.push(status);
  }
  if (search) {
    query += ' AND (s.name LIKE ? OR s.student_code LIKE ? OR s.nis LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  query += ' ORDER BY s.name ASC';

  const rows = db.prepare(query).all(...params);
  res.json({ success: true, data: rows });
});

/**
 * POST /api/students
 */
studentRouter.post('/', authenticate, requireRole(['admin']), (req: AuthRequest, res: Response): void => {
  const { student_code, nis, name, class_id, gender } = req.body;

  if (!student_code || !nis || !name || !class_id || !gender) {
    res.status(400).json({
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'Kode Siswa, NIS, Nama Lengkap, Kelas, dan Jenis Kelamin wajib diisi.'
    });
    return;
  }

  if (!['L', 'P'].includes(gender)) {
    res.status(400).json({
      success: false,
      code: 'INVALID_GENDER',
      message: 'Jenis kelamin harus L (Laki-laki) atau P (Perempuan).'
    });
    return;
  }

  // Check unique student_code
  const existingCode = db.prepare('SELECT id FROM students WHERE student_code = ?').get(student_code.trim());
  if (existingCode) {
    res.status(409).json({
      success: false,
      code: 'DUPLICATE_STUDENT_CODE',
      message: `Kode siswa "${student_code}" sudah digunakan.`
    });
    return;
  }

  // Check unique NIS
  const existingNIS = db.prepare('SELECT id FROM students WHERE nis = ?').get(nis.trim());
  if (existingNIS) {
    res.status(409).json({
      success: false,
      code: 'DUPLICATE_NIS',
      message: `Nomor Induk Siswa (NIS) "${nis}" sudah terdaftar.`
    });
    return;
  }

  // Check class exists
  const classExists = db.prepare('SELECT id, name FROM classes WHERE id = ?').get(Number(class_id)) as any;
  if (!classExists) {
    res.status(404).json({
      success: false,
      code: 'INVALID_CLASS',
      message: 'Kelas yang dipilih tidak ditemukan.'
    });
    return;
  }

  const now = new Date().toISOString();

  // Insert student
  db.prepare(`
    INSERT INTO students (student_code, nis, name, class_id, gender, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'active', ?, ?)
  `).run(student_code.trim(), nis.trim(), name.trim(), Number(class_id), gender, now, now);

  const studentId = (db.prepare('SELECT last_insert_rowid() as id').get() as any).id;

  // Automatically generate active QR token
  const qrToken = generateQRToken();
  db.prepare(`
    INSERT INTO qr_codes (student_id, token, status, generated_at, created_at, updated_at)
    VALUES (?, ?, 'active', ?, ?, ?)
  `).run(studentId, qrToken, now, now, now);

  logAudit(
    req.user?.id || null,
    'CREATE_STUDENT',
    'students',
    studentId,
    `Admin ${req.user?.username} mendaftarkan siswa baru "${name}" (NIS: ${nis}, Kelas: ${classExists.name}) dan membuat QR Code`,
    req.ip
  );

  res.status(201).json({
    success: true,
    message: 'Data siswa berhasil ditambahkan dan QR Code berhasil dibuat.',
    data: {
      id: studentId,
      student_code: student_code.trim(),
      nis: nis.trim(),
      name: name.trim(),
      class_id: Number(class_id),
      class_name: classExists.name,
      gender,
      status: 'active',
      qr_token: qrToken
    }
  });
});

/**
 * GET /api/students/:id
 */
studentRouter.get('/:id', authenticate, (req, res): void => {
  const id = Number(req.params.id);

  const student = db.prepare(`
    SELECT s.*, c.name as class_name, c.grade, c.academic_year
    FROM students s
    JOIN classes c ON s.class_id = c.id
    WHERE s.id = ?
  `).get(id) as any;

  if (!student) {
    res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'Data siswa tidak ditemukan.' });
    return;
  }

  // Active QR Code
  const activeQr = db.prepare(`
    SELECT * FROM qr_codes WHERE student_id = ? AND status = 'active' ORDER BY id DESC LIMIT 1
  `).get(id);

  // QR History
  const qrHistory = db.prepare(`
    SELECT * FROM qr_codes WHERE student_id = ? ORDER BY id DESC
  `).all(id);

  // Attendance statistics
  const statsRows = db.prepare(`
    SELECT status, COUNT(*) as count FROM attendances WHERE student_id = ? GROUP BY status
  `).all(id) as { status: string; count: number }[];

  const stats = {
    present: 0,
    late: 0,
    excused: 0,
    sick: 0,
    absent: 0,
    total: 0
  };

  for (const r of statsRows) {
    if (r.status in stats) {
      (stats as any)[r.status] = r.count;
      stats.total += r.count;
    }
  }

  // Recent attendance history
  const recentAttendances = db.prepare(`
    SELECT a.*, u.name as scanner_name
    FROM attendances a
    LEFT JOIN users u ON a.scanner_id = u.id
    WHERE a.student_id = ?
    ORDER BY a.attendance_date DESC, a.check_in_time DESC
    LIMIT 30
  `).all(id);

  res.json({
    success: true,
    data: {
      ...student,
      active_qr: activeQr || null,
      qr_history: qrHistory,
      stats,
      attendances: recentAttendances
    }
  });
});

/**
 * PUT /api/students/:id
 */
studentRouter.put('/:id', authenticate, requireRole(['admin']), (req: AuthRequest, res: Response): void => {
  const id = Number(req.params.id);
  const { student_code, nis, name, class_id, gender } = req.body;

  const existing = db.prepare('SELECT * FROM students WHERE id = ?').get(id) as any;
  if (!existing) {
    res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'Data siswa tidak ditemukan.' });
    return;
  }

  // Validate student_code if changed
  if (student_code && student_code.trim() !== existing.student_code) {
    const dup = db.prepare('SELECT id FROM students WHERE student_code = ? AND id != ?').get(student_code.trim(), id);
    if (dup) {
      res.status(409).json({ success: false, code: 'DUPLICATE_STUDENT_CODE', message: 'Kode siswa sudah digunakan oleh siswa lain.' });
      return;
    }
  }

  // Validate NIS if changed
  if (nis && nis.trim() !== existing.nis) {
    const dup = db.prepare('SELECT id FROM students WHERE nis = ? AND id != ?').get(nis.trim(), id);
    if (dup) {
      res.status(409).json({ success: false, code: 'DUPLICATE_NIS', message: 'NIS sudah digunakan oleh siswa lain.' });
      return;
    }
  }

  const now = new Date().toISOString();
  const newCode = student_code ? student_code.trim() : existing.student_code;
  const newNIS = nis ? nis.trim() : existing.nis;
  const newName = name ? name.trim() : existing.name;
  const newClassId = class_id ? Number(class_id) : existing.class_id;
  const newGender = gender ? gender : existing.gender;

  db.prepare(`
    UPDATE students
    SET student_code = ?, nis = ?, name = ?, class_id = ?, gender = ?, updated_at = ?
    WHERE id = ?
  `).run(newCode, newNIS, newName, newClassId, newGender, now, id);

  logAudit(
    req.user?.id || null,
    'UPDATE_STUDENT',
    'students',
    id,
    `Admin ${req.user?.username} memperbarui data siswa ID ${id} (${newName})`,
    req.ip
  );

  res.json({
    success: true,
    message: 'Data siswa berhasil diperbarui.'
  });
});

/**
 * PATCH /api/students/:id/status
 * Soft toggle active/inactive (Section 41: preserve historical attendance)
 */
studentRouter.patch('/:id/status', authenticate, requireRole(['admin']), (req: AuthRequest, res: Response): void => {
  const id = Number(req.params.id);
  const { status } = req.body;

  if (!['active', 'inactive'].includes(status)) {
    res.status(400).json({ success: false, code: 'INVALID_STATUS', message: 'Status harus active atau inactive.' });
    return;
  }

  const existing = db.prepare('SELECT * FROM students WHERE id = ?').get(id) as any;
  if (!existing) {
    res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'Data siswa tidak ditemukan.' });
    return;
  }

  const now = new Date().toISOString();
  db.prepare('UPDATE students SET status = ?, updated_at = ? WHERE id = ?').run(status, now, id);

  logAudit(
    req.user?.id || null,
    status === 'active' ? 'ACTIVATE_STUDENT' : 'DEACTIVATE_STUDENT',
    'students',
    id,
    `Admin ${req.user?.username} mengubah status siswa "${existing.name}" menjadi ${status}`,
    req.ip
  );

  res.json({
    success: true,
    message: `Status siswa berhasil diubah menjadi ${status === 'active' ? 'Aktif' : 'Nonaktif'}.`
  });
});
