import { Router, Response } from 'express';
import { db } from '../db/database.ts';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.ts';
import { getActiveAttendanceRule } from '../utils/time.ts';
import { logAudit } from '../services/auditService.ts';

export const settingRouter = Router();

/**
 * GET /api/settings/attendance
 */
settingRouter.get('/attendance', authenticate, (_req, res): void => {
  const rule = getActiveAttendanceRule();
  res.json({ success: true, data: rule });
});

/**
 * PUT /api/settings/attendance
 */
settingRouter.put('/attendance', authenticate, requireRole(['admin']), (req: AuthRequest, res: Response): void => {
  const { school_name, check_in_start, on_time_until, late_until, timezone } = req.body;

  if (!school_name || !check_in_start || !on_time_until || !late_until) {
    res.status(400).json({
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'Nama sekolah, jam mulai, batas tepat waktu, dan batas terlambat wajib diisi.'
    });
    return;
  }

  const rule = getActiveAttendanceRule();
  const now = new Date().toISOString();
  const tz = timezone || 'Asia/Jakarta';

  db.prepare(`
    UPDATE attendance_rules
    SET school_name = ?, check_in_start = ?, on_time_until = ?, late_until = ?, timezone = ?, updated_at = ?
    WHERE id = ?
  `).run(school_name.trim(), check_in_start.trim(), on_time_until.trim(), late_until.trim(), tz, now, rule.id);

  logAudit(
    req.user?.id || null,
    'UPDATE_SETTINGS',
    'attendance_rules',
    rule.id,
    `Admin ${req.user?.username} memperbarui aturan absensi: Mulai ${check_in_start}, Tepat Waktu s.d ${on_time_until}, Terlambat s.d ${late_until} (${tz})`,
    req.ip
  );

  res.json({
    success: true,
    message: 'Pengaturan absensi sekolah berhasil disimpan.',
    data: {
      id: rule.id,
      school_name,
      check_in_start,
      on_time_until,
      late_until,
      timezone: tz
    }
  });
});

/**
 * GET /api/settings/audit-logs
 */
settingRouter.get('/audit-logs', authenticate, requireRole(['admin']), (req, res): void => {
  const logs = db.prepare(`
    SELECT a.*, u.name as user_name, u.username, u.role
    FROM audit_logs a
    LEFT JOIN users u ON a.user_id = u.id
    ORDER BY a.created_at DESC
    LIMIT 200
  `).all();

  res.json({ success: true, data: logs });
});
