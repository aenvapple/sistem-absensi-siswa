import { db } from '../db/database.ts';

export interface ActiveRule {
  id: number;
  school_name: string;
  check_in_start: string; // e.g. "06:30"
  on_time_until: string;  // e.g. "07:00"
  late_until: string;     // e.g. "07:45"
  timezone: string;       // e.g. "Asia/Jakarta"
  is_active: number;
}

/**
 * Get current active attendance rule
 */
export function getActiveAttendanceRule(): ActiveRule {
  const rule = db.prepare(`
    SELECT * FROM attendance_rules WHERE is_active = 1 ORDER BY id DESC LIMIT 1
  `).get() as ActiveRule | undefined;

  if (!rule) {
    return {
      id: 1,
      school_name: 'SMP Negeri 1 Harapan Bangsa',
      check_in_start: '06:30',
      on_time_until: '07:00',
      late_until: '07:45',
      timezone: 'Asia/Jakarta',
      is_active: 1
    };
  }

  return rule;
}

/**
 * Get current server time and date formatted according to the configured timezone
 */
export function getServerDateTime(timezone = 'Asia/Jakarta'): {
  dateStr: string;   // 'YYYY-MM-DD'
  timeStr: string;   // 'HH:MM:SS'
  timeShort: string; // 'HH:MM'
  iso: string;
} {
  const now = new Date();
  
  // Format to timezone
  const formatterDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const dateStr = formatterDate.format(now); // 'YYYY-MM-DD'

  const formatterTime = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  const timeStr = formatterTime.format(now); // 'HH:MM:SS'
  const timeShort = timeStr.slice(0, 5);     // 'HH:MM'

  return {
    dateStr,
    timeStr,
    timeShort,
    iso: now.toISOString()
  };
}

/**
 * Determine attendance status based on server time and configured rules
 */
export function calculateAttendanceStatus(timeShort: string, rule: ActiveRule): {
  status: 'present' | 'late';
  isBeforeStart: boolean;
  isAfterLatePeriod: boolean;
} {
  // Compare strings in HH:MM format
  // e.g. '06:45' <= '07:00' -> present
  // e.g. '07:15' > '07:00' and <= '07:45' -> late
  const isBeforeStart = timeShort < rule.check_in_start;
  const isAfterLatePeriod = timeShort > rule.late_until;

  if (timeShort <= rule.on_time_until) {
    return { status: 'present', isBeforeStart, isAfterLatePeriod: false };
  } else {
    // If between on_time_until and late_until (or even after late_until, marked as late)
    return { status: 'late', isBeforeStart: false, isAfterLatePeriod };
  }
}
