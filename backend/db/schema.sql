-- Schema for Sistem Absensi Siswa Berbasis QR Code SMP
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'teacher', 'operator')),
    is_active INTEGER NOT NULL DEFAULT 1,
    last_login_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS classes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    grade INTEGER NOT NULL,
    academic_year TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_code TEXT NOT NULL UNIQUE,
    nis TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
    gender TEXT NOT NULL CHECK(gender IN ('L', 'P')),
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS qr_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'revoked')),
    generated_at TEXT NOT NULL,
    revoked_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS attendances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
    qr_code_id INTEGER REFERENCES qr_codes(id) ON DELETE SET NULL,
    attendance_date TEXT NOT NULL, -- Format 'YYYY-MM-DD'
    check_in_time TEXT NOT NULL,   -- Format 'HH:MM:SS'
    status TEXT NOT NULL CHECK(status IN ('present', 'late', 'excused', 'sick', 'absent')),
    scanner_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    CONSTRAINT uq_student_attendance_date UNIQUE (student_id, attendance_date)
);

CREATE TABLE IF NOT EXISTS attendance_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    school_name TEXT NOT NULL,
    check_in_start TEXT NOT NULL DEFAULT '06:30',
    on_time_until TEXT NOT NULL DEFAULT '07:00',
    late_until TEXT NOT NULL DEFAULT '07:45',
    timezone TEXT NOT NULL DEFAULT 'Asia/Jakarta',
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id INTEGER,
    description TEXT NOT NULL,
    ip_address TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_admin_verified INTEGER NOT NULL DEFAULT 0,
    admin_verified_at TEXT,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_students_code ON students(student_code);
CREATE INDEX IF NOT EXISTS idx_students_nis ON students(nis);
CREATE INDEX IF NOT EXISTS idx_students_class ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_qr_token ON qr_codes(token);
CREATE INDEX IF NOT EXISTS idx_qr_student ON qr_codes(student_id);
CREATE INDEX IF NOT EXISTS idx_attendances_student ON attendances(student_id);
CREATE INDEX IF NOT EXISTS idx_attendances_date ON attendances(attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendances_status ON attendances(status);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
