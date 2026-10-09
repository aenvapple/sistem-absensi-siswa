/**
 * API Client for Sistem Absensi QR SMP
 */

const API_BASE = '/api';

export class ApiError extends Error {
  code: string;
  status: number;
  data?: any;

  constructor(message: string, code: string = 'UNKNOWN_ERROR', status: number = 500, data?: any) {
    super(message);
    this.code = code;
    this.status = status;
    this.data = data;
    this.name = 'ApiError';
  }
}

export function getAuthToken(): string | null {
  return localStorage.getItem('smp_auth_token');
}

export function setAuthToken(token: string) {
  localStorage.setItem('smp_auth_token', token);
}

export function clearAuthToken() {
  localStorage.removeItem('smp_auth_token');
  localStorage.removeItem('smp_admin_verified');
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(
      data.message || `Permintaan gagal dengan status ${response.status}`,
      data.code || 'HTTP_ERROR',
      response.status,
      data.data
    );
  }

  return data as T;
}
