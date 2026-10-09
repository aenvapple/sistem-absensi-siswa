import { Request, Response, NextFunction } from 'express';
import { db } from '../db/database.ts';

export interface AuthenticatedUser {
  id: number;
  name: string;
  username: string;
  role: 'admin' | 'teacher' | 'operator';
  is_active: number;
  last_login_at: string | null;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
  sessionToken?: string;
  isAdminVerified?: boolean;
}

/**
 * Authentication middleware to verify session token
 */
export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  let token: string | undefined;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.headers.cookie) {
    const cookies = req.headers.cookie.split(';');
    for (const c of cookies) {
      const [key, val] = c.trim().split('=');
      if (key === 'session_token') {
        token = val;
        break;
      }
    }
  }

  if (!token) {
    res.status(401).json({
      success: false,
      code: 'UNAUTHORIZED',
      message: 'Sesi tidak ditemukan atau telah berakhir. Silakan login kembali.'
    });
    return;
  }

  const now = new Date().toISOString();

  // Find active session
  const sessionRow = db.prepare(`
    SELECT s.token, s.user_id, s.is_admin_verified, s.expires_at,
           u.id, u.name, u.username, u.role, u.is_active, u.last_login_at
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.token = ? AND s.expires_at > ?
  `).get(token, now) as (AuthenticatedUser & { token: string; is_admin_verified: number }) | undefined;

  if (!sessionRow) {
    res.status(401).json({
      success: false,
      code: 'UNAUTHORIZED',
      message: 'Sesi tidak valid atau telah kedaluwarsa. Silakan login kembali.'
    });
    return;
  }

  if (sessionRow.is_active !== 1) {
    res.status(403).json({
      success: false,
      code: 'USER_INACTIVE',
      message: 'Akun Anda dinonaktifkan. Hubungi administrator.'
    });
    return;
  }

  req.user = {
    id: sessionRow.id,
    name: sessionRow.name,
    username: sessionRow.username,
    role: sessionRow.role,
    is_active: sessionRow.is_active,
    last_login_at: sessionRow.last_login_at
  };
  req.sessionToken = token;
  req.isAdminVerified = sessionRow.is_admin_verified === 1;

  next();
}

/**
 * Middleware to restrict access based on user role
 */
export function requireRole(allowedRoles: ('admin' | 'teacher' | 'operator')[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        code: 'UNAUTHORIZED',
        message: 'Akses ditolak. Silakan login terlebih dahulu.'
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: 'Anda tidak memiliki hak akses untuk tindakan ini.'
      });
      return;
    }

    next();
  };
}

/**
 * Middleware to require both ADMIN role and server-verified Admin status
 */
export function requireAdminVerified(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({
      success: false,
      code: 'FORBIDDEN',
      message: 'Hanya Administrator yang dapat mengakses area ini.'
    });
    return;
  }

  if (!req.isAdminVerified) {
    res.status(403).json({
      success: false,
      code: 'ADMIN_VERIFICATION_REQUIRED',
      message: 'Diperlukan verifikasi kata sandi administrator sebelum mengakses modul ini.'
    });
    return;
  }

  next();
}
