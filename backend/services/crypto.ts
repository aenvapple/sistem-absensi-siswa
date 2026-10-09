import crypto from 'node:crypto';

/**
 * Hash a password using PBKDF2 with SHA-512 and unique salt
 */
export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

/**
 * Verify password against stored hash and salt
 */
export function verifyPassword(password: string, hash: string, salt: string): boolean {
  try {
    const computed = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(computed, 'hex'), Buffer.from(hash, 'hex'));
  } catch {
    return false;
  }
}

/**
 * Generate a cryptographically strong random token for QR code
 * Format: 24 alphanumeric uppercase chars e.g. QR-X7A9K82HD92KLM48QZ19PA38
 */
export function generateQRToken(): string {
  const bytes = crypto.randomBytes(16);
  // generate base32/alphanumeric uppercase token
  const token = 'QR-' + bytes.toString('hex').toUpperCase();
  return token;
}

/**
 * Generate a random session token
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}
