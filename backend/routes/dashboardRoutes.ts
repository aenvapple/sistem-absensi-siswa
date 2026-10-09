import { Router, Response } from 'express';
import { db } from '../db/database.ts';
import { authenticate, AuthRequest } from '../middleware/auth.ts';
import { getActiveAttendanceRule, getServerDateTime } from '../utils/time.ts';

export const dashboardRouter = Router();

/**
 * GET /api/dashboard/today
 * Real-time stats calculated strictly from DB
 */
dashboardRouter.get('/today', authenticate, (req: AuthRequest, res: Response): void => {
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
