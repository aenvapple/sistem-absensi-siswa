import { Router, Response } from 'express';
import { db } from '../db/database.ts';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.ts';

export const reportRouter = Router();

/**
 * GET /api/reports/summary
 * Teachers and Admins can view and export reports
 */
reportRouter.get('/summary', authenticate, requireRole(['admin', 'teacher']), (req: AuthRequest, res: Response): void => {
  const { from, to, class_id, status } = req.query;

  let query = `
    SELECT a.id, a.attendance_date, a.check_in_time, a.status, a.notes,
           s.name as student_name, s.student_code, s.nis, s.gender,
           c.id as class_id, c.name as class_name,
           u.name as scanner_name
    FROM attendances a
    JOIN students s ON a.student_id = s.id
    JOIN classes c ON s.class_id = c.id
    LEFT JOIN users u ON a.scanner_id = u.id
    WHERE 1=1
  `;
  const params: any[] = [];

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
    params.push(Number(class_id));
  }
  if (status) {
    query += ' AND a.status = ?';
    params.push(status);
  }

  query += ' ORDER BY a.attendance_date DESC, c.name ASC, a.check_in_time ASC';

  const rows = db.prepare(query).all(...params) as any[];

  // Calculate summary counts
  let present = 0;
  let late = 0;
  let sick = 0;
  let excused = 0;
  let absent = 0;

  for (const r of rows) {
    if (r.status === 'present') present++;
    else if (r.status === 'late') late++;
    else if (r.status === 'sick') sick++;
    else if (r.status === 'excused') excused++;
    else if (r.status === 'absent') absent++;
  }

  const total = rows.length;

  res.json({
    success: true,
    summary: {
      total,
      present,
      late,
      sick,
      excused,
      absent
    },
    data: rows
  });
});
