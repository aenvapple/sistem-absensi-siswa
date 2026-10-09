import { Router, Response } from 'express';
import { db } from '../db/database.ts';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.ts';
import { getActiveAttendanceRule, getServerDateTime, calculateAttendanceStatus } from '../utils/time.ts';
import { logAudit } from '../services/auditService.ts';

export const attendanceRouter = Router();

/**
 * POST /api/attendance/scan
 * Operator / Teacher / Admin scans student QR
 */
attendanceRouter.post('/scan', authenticate, (req: AuthRequest, res: Response): void => {
  const { token } = req.body;

  if (!token || typeof token !== 'string') {
    res.status(400).json({
      success: false,
      code: 'INVALID_TOKEN_FORMAT',
      message: 'Token QR Code tidak valid atau kosong.'
    });
    return;
  }

  const cleanToken = token.trim();

  // 1. Find QR Code by token
  const qr = db.prepare(`
    SELECT * FROM qr_codes WHERE token = ?
  `).get(cleanToken) as any;

  if (!qr) {
    res.status(404).json({
      success: false,
      code: 'INVALID_QR',
      message: 'QR Code tidak terdaftar dalam sistem sekolah.'
    });
    return;
  }

  // 2. Check if QR Code is revoked
  if (qr.status === 'revoked') {
    res.status(400).json({
      success: false,
      code: 'REVOKED_QR',
      message: 'Kartu QR Code ini telah dicabut (revoked). Siswa harus mencetak kartu baru.'
    });
    return;
  }

  // 3. Find associated student
  const student = db.prepare(`
    SELECT s.*, c.name as class_name, c.is_active as class_active
    FROM students s
    JOIN classes c ON s.class_id = c.id
    WHERE s.id = ?
  `).get(qr.student_id) as any;

  if (!student) {
    res.status(404).json({
      success: false,
      code: 'STUDENT_NOT_FOUND',
      message: 'Data siswa terkait QR Code tidak ditemukan.'
    });
    return;
  }

  // 4. Check if student is active
  if (student.status !== 'active') {
    res.status(400).json({
      success: false,
      code: 'STUDENT_INACTIVE',
      message: `Siswa "${student.name}" berstatus nonaktif di sistem.`
    });
    return;
  }

  // 5. Determine server date & time according to school timezone
  const rule = getActiveAttendanceRule();
  const serverTime = getServerDateTime(rule.timezone);
  const attendanceDate = serverTime.dateStr;
  const checkInTime = serverTime.timeStr;
  const timeShort = serverTime.timeShort;

  // 6. Check for duplicate attendance today
  const existingAttendance = db.prepare(`
    SELECT a.*, s.name as student_name, s.student_code, c.name as class_name
    FROM attendances a
    JOIN students s ON a.student_id = s.id
    JOIN classes c ON s.class_id = c.id
    WHERE a.student_id = ? AND a.attendance_date = ?
  `).get(student.id, attendanceDate) as any;

  if (existingAttendance) {
    res.status(409).json({
      success: false,
      code: 'ALREADY_ATTENDED',
      message: `Siswa ${student.name} sudah melakukan absensi hari ini.`,
      data: {
        student_id: student.id,
        student_name: student.name,
        student_code: student.student_code,
        nis: student.nis,
        class_name: student.class_name,
        attendance_date: existingAttendance.attendance_date,
        check_in_time: existingAttendance.check_in_time,
        status: existingAttendance.status,
        status_label: existingAttendance.status === 'present' ? 'Tepat Waktu' : 'Terlambat'
      }
    });
    return;
  }

  // 7. Calculate status based on attendance rules
  const { status } = calculateAttendanceStatus(timeShort, rule);
  const now = new Date().toISOString();

  // 8. Insert attendance record into DB
  try {
    const insertStmt = db.prepare(`
      INSERT INTO attendances (student_id, qr_code_id, attendance_date, check_in_time, status, scanner_id, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertStmt.run(
      student.id,
      qr.id,
      attendanceDate,
      checkInTime,
      status,
      req.user?.id || null,
      status === 'late' ? 'Tercatat terlambat via scan QR' : 'Tepat waktu via scan QR',
      now,
      now
    );

    const lastId = (db.prepare('SELECT last_insert_rowid() as id').get() as any).id;

    logAudit(
      req.user?.id || null,
      'SCAN_ATTENDANCE',
      'attendances',
      lastId,
      `Absensi berhasil dicatat untuk ${student.name} (${student.class_name}) - status: ${status}`,
      req.ip
    );

    res.json({
      success: true,
      code: 'ATTENDANCE_SUCCESS',
      message: status === 'present' ? 'Absensi Berhasil: Hadir Tepat Waktu!' : 'Absensi Berhasil: Tercatat Terlambat.',
      data: {
        attendance_id: lastId,
        student_id: student.id,
        student_name: student.name,
        student_code: student.student_code,
        nis: student.nis,
        class_name: student.class_name,
        attendance_date: attendanceDate,
        check_in_time: checkInTime,
        status,
        status_label: status === 'present' ? 'Tepat Waktu' : 'Terlambat'
      }
    });
  } catch (error: any) {
    if (error.message && error.message.includes('UNIQUE constraint failed')) {
      res.status(409).json({
        success: false,
        code: 'ALREADY_ATTENDED',
        message: 'Siswa sudah tercatat hadir hari ini.'
      });
      return;
    }
    console.error('[SCAN_ERROR]', error);
    res.status(500).json({
      success: false,
      code: 'SERVER_ERROR',
      message: 'Gagal mencatat absensi. Terjadi kesalahan pada server.'
    });
  }
});

/**
 * GET /api/dashboard/today
 * Real-time stats calculated strictly from DB
 */
attendanceRouter.get('/dashboard/today', authenticate, (req: AuthRequest, res: Response): void => {
  const rule = getActiveAttendanceRule();
  const serverTime = getServerDateTime(rule.timezone);
  const targetDate = (req.query.date as string) || serverTime.dateStr;
  const classId = req.query.class_id ? Number(req.query.class_id) : null;

  // Total active students
  let totalStudentsQuery = "SELECT COUNT(*) as total FROM students s JOIN classes c ON s.class_id = c.id WHERE s.status = 'active' AND c.is_active = 1";
  const totalParams: any[] = [];
  if (classId) {
    totalStudentsQuery += ' AND s.class_id = ?';
    totalParams.push(classId);
  }
  const totalStudents = (db.prepare(totalStudentsQuery).get(...totalParams) as any).total;

  // Counts by status for target date
  let statusCountsQuery = `
    SELECT a.status, COUNT(*) as count
    FROM attendances a
    JOIN students s ON a.student_id = s.id
    WHERE a.attendance_date = ?
  `;
  const countParams: any[] = [targetDate];
  if (classId) {
    statusCountsQuery += ' AND s.class_id = ?';
    countParams.push(classId);
  }
  statusCountsQuery += ' GROUP BY a.status';

  const rows = db.prepare(statusCountsQuery).all(...countParams) as { status: string; count: number }[];

  let present = 0;
  let late = 0;
  let sick = 0;
  let excused = 0;
  let absent = 0;

  for (const r of rows) {
    if (r.status === 'present') present = r.count;
    else if (r.status === 'late') late = r.count;
    else if (r.status === 'sick') sick = r.count;
    else if (r.status === 'excused') excused = r.count;
    else if (r.status === 'absent') absent = r.count;
  }

  const totalAttended = present + late + sick + excused + absent;
  const notYetPresent = Math.max(0, totalStudents - totalAttended);
  const attendanceRate = totalStudents > 0 ? Math.round(((present + late) / totalStudents) * 100) : 0;

  // Today's attendance list
  let listQuery = `
    SELECT a.id, a.attendance_date, a.check_in_time, a.status, a.notes,
           s.id as student_id, s.name as student_name, s.student_code, s.nis, s.gender,
           c.id as class_id, c.name as class_name,
           u.name as scanner_name
    FROM attendances a
    JOIN students s ON a.student_id = s.id
    JOIN classes c ON s.class_id = c.id
    LEFT JOIN users u ON a.scanner_id = u.id
    WHERE a.attendance_date = ?
  `;
  const listParams: any[] = [targetDate];
  if (classId) {
    listQuery += ' AND s.class_id = ?';
    listParams.push(classId);
  }
  listQuery += ' ORDER BY a.check_in_time DESC';

  const attendances = db.prepare(listQuery).all(...listParams);

  res.json({
    success: true,
    serverTime: {
      date: serverTime.dateStr,
      time: serverTime.timeStr,
      timezone: rule.timezone
    },
    rule: {
      schoolName: rule.school_name,
      checkInStart: rule.check_in_start,
      onTimeUntil: rule.on_time_until,
      lateUntil: rule.late_until
    },
    filterDate: targetDate,
    stats: {
      totalStudents,
      present,
      late,
      sick,
      excused,
      absent,
      notYetPresent,
      attendanceRate
    },
    attendances
  });
});

/**
 * GET /api/attendance
 * Search and filter attendances
 */
attendanceRouter.get('/', authenticate, (req: AuthRequest, res: Response): void => {
  const { date, class_id, status, search, from, to } = req.query;

  let query = `
    SELECT a.id, a.attendance_date, a.check_in_time, a.status, a.notes,
           s.id as student_id, s.name as student_name, s.student_code, s.nis, s.gender,
           c.id as class_id, c.name as class_name,
           u.name as scanner_name
    FROM attendances a
    JOIN students s ON a.student_id = s.id
    JOIN classes c ON s.class_id = c.id
    LEFT JOIN users u ON a.scanner_id = u.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (date) {
    query += ' AND a.attendance_date = ?';
    params.push(date);
  }
  if (from) {
    query += ' AND a.attendance_date >= ?';
    params.push(from);
  }
  if (to) {
    query += ' AND a.attendance_date <= ?';
    params.push(to);
  }
  if (class_id) {
    query += ' AND s.class_id = ?';
    params.push(class_id);
  }
  if (status) {
    query += ' AND a.status = ?';
    params.push(status);
  }
  if (search) {
    query += ' AND (s.name LIKE ? OR s.student_code LIKE ? OR s.nis LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  query += ' ORDER BY a.attendance_date DESC, a.check_in_time DESC';

  const rows = db.prepare(query).all(...params);
  res.json({
    success: true,
    data: rows
  });
});

/**
 * GET /api/attendance/:id
 */
attendanceRouter.get('/:id(\\d+)', authenticate, (req: AuthRequest, res: Response): void => {
  const id = Number(req.params.id);
  const row = db.prepare(`
    SELECT a.*, s.name as student_name, s.student_code, s.nis, c.name as class_name, u.name as scanner_name
    FROM attendances a
    JOIN students s ON a.student_id = s.id
    JOIN classes c ON s.class_id = c.id
    LEFT JOIN users u ON a.scanner_id = u.id
    WHERE a.id = ?
  `).get(id);

  if (!row) {
    res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'Data absensi tidak ditemukan.' });
    return;
  }

  res.json({ success: true, data: row });
});

/**
 * PUT /api/attendance/:id
 * Admin manual correction of attendance (present, late, excused, sick, absent)
 */
attendanceRouter.put('/:id(\\d+)', authenticate, requireRole(['admin']), (req: AuthRequest, res: Response): void => {
  const id = Number(req.params.id);
  const { status, notes, check_in_time } = req.body;

  const validStatuses = ['present', 'late', 'excused', 'sick', 'absent'];
  if (!validStatuses.includes(status)) {
    res.status(400).json({
      success: false,
      code: 'INVALID_STATUS',
      message: 'Status absensi tidak valid. Pilih: hadir, terlambat, izin, sakit, atau alpa.'
    });
    return;
  }

  const existing = db.prepare(`
    SELECT a.*, s.name as student_name FROM attendances a JOIN students s ON a.student_id = s.id WHERE a.id = ?
  `).get(id) as any;

  if (!existing) {
    res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'Data absensi tidak ditemukan.' });
    return;
  }

  const now = new Date().toISOString();
  const timeToSet = check_in_time || existing.check_in_time;
  const reasonText = notes ? `Alasan koreksi: ${notes}` : `Diperbarui dari ${existing.status} ke ${status}`;

  db.prepare(`
    UPDATE attendances
    SET status = ?, check_in_time = ?, notes = ?, updated_at = ?
    WHERE id = ?
  `).run(status, timeToSet, notes || existing.notes, now, id);

  logAudit(
    req.user?.id || null,
    'UPDATE_ATTENDANCE',
    'attendances',
    id,
    `Admin ${req.user?.username} mengubah absensi ${existing.student_name} (${existing.attendance_date}) dari "${existing.status}" menjadi "${status}". ${reasonText}`,
    req.ip
  );

  res.json({
    success: true,
    message: 'Data absensi berhasil diperbarui.',
    data: {
      id,
      status,
      check_in_time: timeToSet,
      notes: notes || existing.notes
    }
  });
});
