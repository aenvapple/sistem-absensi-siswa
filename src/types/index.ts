export type UserRole = 'admin' | 'teacher' | 'operator';

export interface User {
  id: number;
  name: string;
  username: string;
  role: UserRole;
  is_active: number;
  last_login_at?: string | null;
  created_at?: string;
}

export interface ClassItem {
  id: number;
  name: string;
  grade: number;
  academic_year: string;
  is_active: number;
  student_count?: number;
  active_student_count?: number;
  created_at?: string;
}

export interface Student {
  id: number;
  student_code: string;
  nis: string;
  name: string;
  class_id: number;
  class_name?: string;
  grade?: number;
  gender: 'L' | 'P';
  status: 'active' | 'inactive';
  active_qr_token?: string | null;
  qr_token?: string | null;
  qr_id?: number | null;
  qr_status?: 'active' | 'revoked' | null;
  qr_generated_at?: string | null;
  created_at?: string;
}

export interface StudentDetail extends Student {
  active_qr?: {
    id: number;
    token: string;
    status: 'active' | 'revoked';
    generated_at: string;
  } | null;
  qr_history: Array<{
    id: number;
    token: string;
    status: 'active' | 'revoked';
    generated_at: string;
    revoked_at?: string | null;
  }>;
  stats: {
    present: number;
    late: number;
    excused: number;
    sick: number;
    absent: number;
    total: number;
  };
  attendances: AttendanceRecord[];
}

export type AttendanceStatus = 'present' | 'late' | 'excused' | 'sick' | 'absent';

export interface AttendanceRecord {
  id: number;
  student_id: number;
  student_name: string;
  student_code: string;
  nis: string;
  gender?: 'L' | 'P';
  class_id?: number;
  class_name: string;
  attendance_date: string;
  check_in_time: string;
  status: AttendanceStatus;
  notes?: string | null;
  scanner_name?: string | null;
  created_at?: string;
}

export interface AttendanceRule {
  id: number;
  school_name: string;
  check_in_start: string;
  on_time_until: string;
  late_until: string;
  timezone: string;
  is_active: number;
}

export interface AuditLogItem {
  id: number;
  user_id?: number | null;
  user_name?: string | null;
  username?: string | null;
  role?: string | null;
  action: string;
  table_name: string;
  record_id?: number | null;
  description: string;
  ip_address?: string | null;
  created_at: string;
}

export interface DashboardData {
  serverTime: {
    date: string;
    time: string;
    timezone: string;
  };
  rule: {
    schoolName: string;
    checkInStart: string;
    onTimeUntil: string;
    lateUntil: string;
  };
  filterDate: string;
  stats: {
    totalStudents: number;
    present: number;
    late: number;
    sick: number;
    excused: number;
    absent: number;
    notYetPresent: number;
    attendanceRate: number;
  };
  attendances: AttendanceRecord[];
}

export interface ScanResult {
  type: 'success' | 'late' | 'already_attended' | 'invalid_qr' | 'revoked_qr' | 'error';
  title: string;
  message: string;
  data?: {
    student_id?: number;
    student_name?: string;
    student_code?: string;
    nis?: string;
    class_name?: string;
    attendance_date?: string;
    check_in_time?: string;
    status?: string;
    status_label?: string;
  };
}
