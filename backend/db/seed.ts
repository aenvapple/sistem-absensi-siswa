import { DatabaseSync } from 'node:sqlite';
import { hashPassword, generateQRToken } from '../services/crypto.ts';

export function seedDatabase(db: DatabaseSync) {
  console.log('[SEED] Seeding initial development data...');
  const now = new Date().toISOString();

  // 1. Seed Attendance Rules
  const insertRule = db.prepare(`
    INSERT INTO attendance_rules (school_name, check_in_start, on_time_until, late_until, timezone, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertRule.run(
    'SMP Negeri 1 Harapan Bangsa',
    '06:30',
    '07:00',
    '07:45',
    'Asia/Jakarta',
    1,
    now,
    now
  );

  // 2. Seed Users (Admin, Teacher, Operator)
  const insertUser = db.prepare(`
    INSERT INTO users (name, username, password_hash, password_salt, role, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const adminAuth = hashPassword('admin123');
  insertUser.run('Administrator Utama', 'admin', adminAuth.hash, adminAuth.salt, 'admin', 1, now, now);

  const teacherAuth = hashPassword('teacher123');
  insertUser.run('Drs. Bambang Sudirman, M.Pd.', 'teacher', teacherAuth.hash, teacherAuth.salt, 'teacher', 1, now, now);

  const operatorAuth = hashPassword('operator123');
  insertUser.run('Siti Nurhaliza (Operator)', 'operator', operatorAuth.hash, operatorAuth.salt, 'operator', 1, now, now);

  // 3. Seed Classes
  const insertClass = db.prepare(`
    INSERT INTO classes (name, grade, academic_year, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  insertClass.run('VII-A', 7, '2025/2026', 1, now, now);
  insertClass.run('VII-B', 7, '2025/2026', 1, now, now);
  insertClass.run('VIII-A', 8, '2025/2026', 1, now, now);
  insertClass.run('VIII-B', 8, '2025/2026', 1, now, now);
  insertClass.run('IX-A', 9, '2025/2026', 1, now, now);

  // 4. Seed Students
  const insertStudent = db.prepare(`
    INSERT INTO students (student_code, nis, name, class_id, gender, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const sampleStudents = [
    { code: 'STD-2501', nis: '8401', name: 'Ahmad Fauzi', classId: 1, gender: 'L', status: 'active' },
    { code: 'STD-2502', nis: '8402', name: 'Budi Santoso', classId: 1, gender: 'L', status: 'active' },
    { code: 'STD-2503', nis: '8403', name: 'Citra Dewi', classId: 1, gender: 'P', status: 'active' },
    { code: 'STD-2504', nis: '8404', name: 'Dimas Pratama', classId: 1, gender: 'L', status: 'active' },
    { code: 'STD-2505', nis: '8405', name: 'Eka Putri Lestari', classId: 2, gender: 'P', status: 'active' },
    { code: 'STD-2506', nis: '8406', name: 'Farhan Ramadhan', classId: 2, gender: 'L', status: 'active' },
    { code: 'STD-2507', nis: '8407', name: 'Gita Safitri', classId: 3, gender: 'P', status: 'active' },
    { code: 'STD-2508', nis: '8408', name: 'Hadi Wijaya', classId: 3, gender: 'L', status: 'active' },
    { code: 'STD-2509', nis: '8409', name: 'Indah Permatasari', classId: 4, gender: 'P', status: 'active' },
    { code: 'STD-2510', nis: '8410', name: 'Joko Susilo', classId: 5, gender: 'L', status: 'active' },
  ];

  const studentIds: number[] = [];
  for (const s of sampleStudents) {
    insertStudent.run(s.code, s.nis, s.name, s.classId, s.gender, s.status, now, now);
    const last = db.prepare('SELECT last_insert_rowid() as id').get() as { id: number };
    studentIds.push(last.id);
  }

  // 5. Seed QR Codes for students
  const insertQR = db.prepare(`
    INSERT INTO qr_codes (student_id, token, status, generated_at, revoked_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const studentQRs: { [id: number]: { token: string; qrId: number } } = {};

  for (let i = 0; i < studentIds.length; i++) {
    const studentId = studentIds[i];
    const isStudentG = (i === 6); // Gita Safitri - revoked QR test

    if (isStudentG) {
      // Create a revoked QR code for Gita Safitri
      const revokedToken = 'QR-REVOKED-TEST-TOKEN-0007';
      insertQR.run(studentId, revokedToken, 'revoked', now, now, now, now);
      const row = db.prepare('SELECT last_insert_rowid() as id').get() as { id: number };
      studentQRs[studentId] = { token: revokedToken, qrId: row.id };
    } else {
      const token = i === 0 ? 'QR-AHMAD-FAUZI-2501' : (i === 1 ? 'QR-BUDI-SANTOSO-2502' : generateQRToken());
      insertQR.run(studentId, token, 'active', now, null, now, now);
      const row = db.prepare('SELECT last_insert_rowid() as id').get() as { id: number };
      studentQRs[studentId] = { token, qrId: row.id };
    }
  }

  // 6. Seed today's sample attendance according to Section 37:
  // Today's date in local server format 'YYYY-MM-DD'
  const todayStr = new Date().toLocaleDateString('en-CA'); // 'YYYY-MM-DD'

  const insertAttendance = db.prepare(`
    INSERT INTO attendances (student_id, qr_code_id, attendance_date, check_in_time, status, scanner_id, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Student A (Ahmad Fauzi): 06:45 -> present
  insertAttendance.run(studentIds[0], studentQRs[studentIds[0]].qrId, todayStr, '06:45:12', 'present', 3, 'Tepat waktu via scan QR', now, now);

  // Student B (Budi Santoso): 06:59 -> present
  insertAttendance.run(studentIds[1], studentQRs[studentIds[1]].qrId, todayStr, '06:59:40', 'present', 3, 'Tepat waktu via scan QR', now, now);

  // Student C (Citra Dewi): 07:10 -> late
  insertAttendance.run(studentIds[2], studentQRs[studentIds[2]].qrId, todayStr, '07:10:05', 'late', 3, 'Terlambat via scan QR', now, now);

  // Student E (Eka Putri Lestari): 06:40 -> present (to test duplicate scan)
  insertAttendance.run(studentIds[4], studentQRs[studentIds[4]].qrId, todayStr, '06:40:22', 'present', 3, 'Tepat waktu via scan QR', now, now);

  // 7. Seed Audit Log for initial seeding
  const insertAudit = db.prepare(`
    INSERT INTO audit_logs (user_id, action, table_name, record_id, description, ip_address, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  insertAudit.run(1, 'SEED_DATABASE', 'system', 1, 'Inisialisasi data awal sistem absensi SMP', '127.0.0.1', now);

  console.log('[SEED] Seeding completed successfully!');
}
