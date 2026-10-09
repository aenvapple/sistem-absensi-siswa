import { Router, Response } from 'express';
import { db } from '../db/database.ts';
import { verifyPassword, generateSessionToken } from '../services/crypto.ts';
import { authenticate, AuthRequest } from '../middleware/auth.ts';
import { logAudit } from '../services/auditService.ts';

export const authRouter = Router();

// Rate limiter helper in memory (prevent brute-force on auth)
const loginAttempts: Record<string, { count: number; firstAttempt: number }> = {};
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = loginAttempts[ip];
  if (!record) {
    loginAttempts[ip] = { count: 1, firstAttempt: now };
    return true;
  }
  if (now - record.firstAttempt > 60000) {
    // Reset after 1 minute
    loginAttempts[ip] = { count: 1, firstAttempt: now };
    return true;
  }
  if (record.count >= 15) {
    return false; // Exceeded 15 attempts/minute
  }
  record.count++;
  return true;
}

/**
 * POST /api/login
 */
authRouter.post('/login', (req, res): void => {
  const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
  if (!checkRateLimit(ip)) {
    res.status(429).json({
      success: false,
      code: 'TOO_MANY_ATTEMPTS',
      message: 'Terlalu banyak percobaan login. Silakan tunggu 1 menit.'
    });
    return;
  }

  const { username, password } = req.body;

  if (!username || !password || typeof username !== 'string' || typeof password !== 'string') {
    res.status(400).json({
      success: false,
      code: 'INVALID_CREDENTIALS',
      message: 'Username dan kata sandi wajib diisi.'
    });
    return;
  }

  const user = db.prepare(`
    SELECT * FROM users WHERE username = ?
  `).get(username.trim()) as any;

  // Generic failure message to prevent username enumeration (Section 5)
  if (!user || !verifyPassword(password, user.password_hash, user.password_salt)) {
    res.status(401).json({
      success: false,
      code: 'INVALID_CREDENTIALS',
      message: 'Username atau kata sandi yang Anda masukkan salah.'
    });
    return;
  }

  if (user.is_active !== 1) {
    res.status(403).json({
      success: false,
      code: 'USER_INACTIVE',
      message: 'Akun Anda berstatus nonaktif. Silakan hubungi administrator.'
    });
    return;
  }

  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const token = generateSessionToken();

  // Insert session
  db.prepare(`
    INSERT INTO sessions (token, user_id, is_admin_verified, expires_at, created_at)
    VALUES (?, ?, 0, ?, ?)
  `).run(token, user.id, expiresAt, now);

  // Update last_login_at
  db.prepare(`
    UPDATE users SET last_login_at = ?, updated_at = ? WHERE id = ?
  `).run(now, now, user.id);

  logAudit(user.id, 'LOGIN', 'users', user.id, `User ${user.username} (${user.role}) berhasil masuk ke sistem`, ip);

  // Set cookie if possible
  res.cookie('session_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  res.json({
    success: true,
    message: 'Login berhasil.',
    token,
    user: {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
      last_login_at: now
    },
    isAdminVerified: false
  });
});

/**
 * POST /api/logout
 */
authRouter.post('/logout', authenticate, (req: AuthRequest, res: Response): void => {
  if (req.sessionToken) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(req.sessionToken);
  }

  res.clearCookie('session_token');
  res.json({
    success: true,
    message: 'Berhasil keluar dari sistem.'
  });
});

/**
 * GET /api/me
 */
authRouter.get('/me', authenticate, (req: AuthRequest, res: Response): void => {
  res.json({
    success: true,
    user: req.user,
    isAdminVerified: req.isAdminVerified || false
  });
});

/**
 * POST /api/admin/verify
 * Server-side Admin password verification before entering /admin/*
 */
authRouter.post('/admin/verify', authenticate, (req: AuthRequest, res: Response): void => {
  if (req.user?.role !== 'admin') {
    res.status(403).json({
      success: false,
      code: 'FORBIDDEN',
      message: 'Hanya pengguna dengan peran Admin yang dapat melakukan verifikasi ini.'
    });
    return;
  }

  const { password } = req.body;
  if (!password || typeof password !== 'string') {
    res.status(400).json({
      success: false,
      code: 'MISSING_PASSWORD',
      message: 'Kata sandi verifikasi admin diperlukan.'
    });
    return;
  }

  // Get admin user from database
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id) as any;
  if (!user || !verifyPassword(password, user.password_hash, user.password_salt)) {
    res.status(401).json({
      success: false,
      code: 'INVALID_ADMIN_PASSWORD',
      message: 'Kata sandi verifikasi admin tidak valid.'
    });
    return;
  }

  const now = new Date().toISOString();

  // Mark session as verified
  if (req.sessionToken) {
    db.prepare(`
      UPDATE sessions SET is_admin_verified = 1, admin_verified_at = ? WHERE token = ?
    `).run(now, req.sessionToken);
  }

  logAudit(
    req.user.id,
    'ADMIN_VERIFY',
    'sessions',
    req.user.id,
    `Admin ${req.user.username} berhasil verifikasi password admin untuk akses panel kontrol`,
    req.ip
  );

  res.json({
    success: true,
    message: 'Verifikasi admin berhasil. Akses panel administrator diberikan.'
  });
});
