import { Router, Response } from 'express';
import { db } from '../db/database.ts';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.ts';
import { hashPassword } from '../services/crypto.ts';
import { logAudit } from '../services/auditService.ts';

export const userRouter = Router();

/**
 * GET /api/users
 */
userRouter.get('/', authenticate, requireRole(['admin']), (req, res): void => {
  const { role, search } = req.query;

  let query = 'SELECT id, name, username, role, is_active, last_login_at, created_at FROM users WHERE 1=1';
  const params: any[] = [];

  if (role) {
    query += ' AND role = ?';
    params.push(role);
  }
  if (search) {
    query += ' AND (name LIKE ? OR username LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term);
  }

  query += ' ORDER BY id ASC';

  const rows = db.prepare(query).all(...params);
  res.json({ success: true, data: rows });
});

/**
 * POST /api/users
 */
userRouter.post('/', authenticate, requireRole(['admin']), (req: AuthRequest, res: Response): void => {
  const { name, username, password, role } = req.body;

  if (!name || !username || !password || !role) {
    res.status(400).json({
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'Nama, username, kata sandi, dan peran wajib diisi.'
    });
    return;
  }

  if (!['admin', 'teacher', 'operator'].includes(role)) {
    res.status(400).json({
      success: false,
      code: 'INVALID_ROLE',
      message: 'Peran harus salah satu dari: admin, teacher, operator.'
    });
    return;
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username.trim());
  if (existing) {
    res.status(409).json({
      success: false,
      code: 'DUPLICATE_USERNAME',
      message: `Username "${username}" sudah digunakan.`
    });
    return;
  }

  const { hash, salt } = hashPassword(password);
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO users (name, username, password_hash, password_salt, role, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 1, ?, ?)
  `).run(name.trim(), username.trim(), hash, salt, role, now, now);

  const lastId = (db.prepare('SELECT last_insert_rowid() as id').get() as any).id;

  logAudit(
    req.user?.id || null,
    'CREATE_USER',
    'users',
    lastId,
    `Admin ${req.user?.username} membuat akun pengguna baru "${username}" (${role})`,
    req.ip
  );

  res.status(201).json({
    success: true,
    message: 'Pengguna baru berhasil ditambahkan.',
    data: { id: lastId, name: name.trim(), username: username.trim(), role, is_active: 1 }
  });
});

/**
 * GET /api/users/:id
 */
userRouter.get('/:id', authenticate, requireRole(['admin']), (req, res): void => {
  const id = Number(req.params.id);
  const user = db.prepare('SELECT id, name, username, role, is_active, last_login_at, created_at FROM users WHERE id = ?').get(id);

  if (!user) {
    res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'Pengguna tidak ditemukan.' });
    return;
  }

  res.json({ success: true, data: user });
});

/**
 * PUT /api/users/:id
 */
userRouter.put('/:id', authenticate, requireRole(['admin']), (req: AuthRequest, res: Response): void => {
  const id = Number(req.params.id);
  const { name, username, password, role } = req.body;

  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
  if (!existing) {
    res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'Pengguna tidak ditemukan.' });
    return;
  }

  if (username && username.trim() !== existing.username) {
    const dup = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username.trim(), id);
    if (dup) {
      res.status(409).json({ success: false, code: 'DUPLICATE_USERNAME', message: 'Username sudah digunakan oleh akun lain.' });
      return;
    }
  }

  const now = new Date().toISOString();
  const newName = name ? name.trim() : existing.name;
  const newUsername = username ? username.trim() : existing.username;
  const newRole = role ? role : existing.role;

  if (password && password.trim().length > 0) {
    const { hash, salt } = hashPassword(password);
    db.prepare(`
      UPDATE users SET name = ?, username = ?, password_hash = ?, password_salt = ?, role = ?, updated_at = ?
      WHERE id = ?
    `).run(newName, newUsername, hash, salt, newRole, now, id);
  } else {
    db.prepare(`
      UPDATE users SET name = ?, username = ?, role = ?, updated_at = ?
      WHERE id = ?
    `).run(newName, newUsername, newRole, now, id);
  }

  logAudit(
    req.user?.id || null,
    'UPDATE_USER',
    'users',
    id,
    `Admin ${req.user?.username} memperbarui data akun "${newUsername}" (${newRole})${password ? ' termasuk reset kata sandi' : ''}`,
    req.ip
  );

  res.json({
    success: true,
    message: 'Data pengguna berhasil diperbarui.'
  });
});

/**
 * PATCH /api/users/:id/status
 */
userRouter.patch('/:id/status', authenticate, requireRole(['admin']), (req: AuthRequest, res: Response): void => {
  const id = Number(req.params.id);
  const { is_active } = req.body;

  if (req.user?.id === id) {
    res.status(400).json({
      success: false,
      code: 'CANNOT_DEACTIVATE_SELF',
      message: 'Anda tidak dapat menonaktifkan akun Anda sendiri.'
    });
    return;
  }

  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
  if (!existing) {
    res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'Pengguna tidak ditemukan.' });
    return;
  }

  const newStatus = is_active ? 1 : 0;
  const now = new Date().toISOString();

  db.prepare('UPDATE users SET is_active = ?, updated_at = ? WHERE id = ?').run(newStatus, now, id);

  // If deactivating, also invalidate their active sessions
  if (newStatus === 0) {
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(id);
  }

  logAudit(
    req.user?.id || null,
    newStatus === 1 ? 'ACTIVATE_USER' : 'DEACTIVATE_USER',
    'users',
    id,
    `Admin ${req.user?.username} mengubah status akun "${existing.username}" menjadi ${newStatus === 1 ? 'Aktif' : 'Nonaktif'}`,
    req.ip
  );

  res.json({
    success: true,
    message: `Pengguna berhasil ${newStatus === 1 ? 'diaktifkan' : 'dinonaktifkan'}.`
  });
});
