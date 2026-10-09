import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../api/client.ts';
import { User, UserRole } from '../../types/index.ts';
import { AdminLayout } from '../../components/AdminLayout.tsx';
import { Badge } from '../../components/Badge.tsx';
import { LoadingSpinner, EmptyState, ErrorAlert } from '../../components/LoadingSpinner.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  UserCheck,
  Plus,
  Search,
  Edit2,
  RotateCw,
  CheckCircle,
  XCircle,
  KeyRound,
  X
} from 'lucide-react';

interface UsersPageProps {
  navigate: (path: string) => void;
}

export const UsersPage: React.FC<UsersPageProps> = ({ navigate }) => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formName, setFormName] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState<UserRole>('teacher');
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      let url = '/users?';
      if (roleFilter) url += `role=${roleFilter}&`;
      if (search.trim()) url += `search=${encodeURIComponent(search.trim())}&`;

      const res = await apiRequest<{ success: boolean; data: User[] }>(url);
      if (res.success) setUsers(res.data);
    } catch (err: any) {
      setError(err.message || 'Gagal memuat pengguna.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [roleFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadUsers();
  };

  const openAddModal = () => {
    setEditingUser(null);
    setFormName('');
    setFormUsername('');
    setFormPassword('');
    setFormRole('teacher');
    setModalError(null);
    setShowModal(true);
  };

  const openEditModal = (u: User) => {
    setEditingUser(u);
    setFormName(u.name);
    setFormUsername(u.username);
    setFormPassword(''); // blank unless changing password
    setFormRole(u.role);
    setModalError(null);
    setShowModal(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formUsername.trim()) {
      setModalError('Nama dan username wajib diisi.');
      return;
    }
    if (!editingUser && !formPassword.trim()) {
      setModalError('Kata sandi wajib diisi untuk pengguna baru.');
      return;
    }

    try {
      setModalSubmitting(true);
      setModalError(null);

      const payload: any = {
        name: formName.trim(),
        username: formUsername.trim(),
        role: formRole
      };

      if (formPassword.trim()) {
        payload.password = formPassword.trim();
      }

      if (editingUser) {
        await apiRequest(`/users/${editingUser.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
      } else {
        await apiRequest('/users', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      }

      setShowModal(false);
      loadUsers();
    } catch (err: any) {
      setModalError(err.message || 'Gagal menyimpan pengguna.');
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleToggleStatus = async (targetUser: User) => {
    if (targetUser.id === currentUser?.id) {
      alert('Anda tidak dapat menonaktifkan akun yang sedang digunakan.');
      return;
    }

    const nextStatus = targetUser.is_active === 1 ? false : true;
    try {
      await apiRequest(`/users/${targetUser.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: nextStatus })
      });
      loadUsers();
    } catch (err: any) {
      alert(err.message || 'Gagal mengubah status pengguna.');
    }
  };

  const roleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">Admin</span>;
      case 'teacher':
        return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Guru</span>;
      case 'operator':
        return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">Operator</span>;
      default:
        return <span>{role}</span>;
    }
  };

  return (
    <AdminLayout
      currentPath="/admin/users"
      navigate={navigate}
      title="Manajemen Pengguna Sistem"
      subtitle="Kelola akun pengguna, hak akses role (Admin, Guru, Operator), dan reset kata sandi terenkripsi"
      action={
        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Pengguna</span>
        </button>
      }
    >
      {error && <div className="mb-6"><ErrorAlert message={error} onRetry={loadUsers} /></div>}

      {/* Filter toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs mb-6">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama atau username..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Semua Peran (Role)</option>
              <option value="admin">Administrator</option>
              <option value="teacher">Guru</option>
              <option value="operator">Operator Presensi</option>
            </select>
          </div>
        </form>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-purple-600" />
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">
              Daftar Pengguna ({users.length} akun)
            </h3>
          </div>
          <button
            onClick={loadUsers}
            title="Muat Ulang"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <LoadingSpinner message="Memuat daftar pengguna..." />
        ) : users.length === 0 ? (
          <EmptyState
            title="Tidak Ada Pengguna"
            description="Tidak ada akun pengguna yang cocok dengan filter."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">No</th>
                  <th className="py-3 px-4">Nama Lengkap</th>
                  <th className="py-3 px-4">Username</th>
                  <th className="py-3 px-4">Peran (Role)</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Login Terakhir</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u, idx) => (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 text-center text-xs text-slate-400 font-mono">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      <div>{u.name}</div>
                      {u.id === currentUser?.id && (
                        <span className="text-[10px] text-blue-600 font-bold uppercase">Akun Anda</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-600">
                      @{u.username}
                    </td>
                    <td className="py-3 px-4">
                      {roleBadge(u.role)}
                    </td>
                    <td className="py-3 px-4">
                      <Badge status={u.is_active === 1 ? 'active' : 'inactive'} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-500 font-mono">
                      {u.last_login_at ? new Date(u.last_login_at).toLocaleString('id-ID') : 'Belum pernah'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditModal(u)}
                          title="Edit Pengguna & Reset Password"
                          className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {u.id !== currentUser?.id && (
                          <button
                            onClick={() => handleToggleStatus(u)}
                            title={u.is_active === 1 ? 'Nonaktifkan Pengguna' : 'Aktifkan Pengguna'}
                            className={`p-1.5 rounded-lg transition ${
                              u.is_active === 1
                                ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                                : 'text-emerald-600 hover:bg-emerald-50'
                            }`}
                          >
                            {u.is_active === 1 ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit User Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 mb-4">
              {editingUser ? 'Ubah Data Pengguna' : 'Tambah Pengguna Baru'}
            </h3>

            {modalError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                {modalError}
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Nama Lengkap *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Contoh: Budi Prasetyo, S.Pd."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Username *
                </label>
                <input
                  type="text"
                  required
                  value={formUsername}
                  onChange={(e) => setFormUsername(e.target.value)}
                  placeholder="Contoh: budi_guru"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 font-mono focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Peran (Role Akses) *
                </label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value as UserRole)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-semibold"
                >
                  <option value="operator">Operator (Hanya Scan & Dashboard)</option>
                  <option value="teacher">Guru (Dashboard & Laporan)</option>
                  <option value="admin">Administrator (Akses Penuh Seluruh Sistem)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  {editingUser ? 'Reset Kata Sandi (Kosongkan jika tidak diubah)' : 'Kata Sandi *'}
                </label>
                <input
                  type="password"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  placeholder={editingUser ? 'Ketik untuk ganti kata sandi...' : 'Minimal 6 karakter'}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-md transition disabled:opacity-50"
                >
                  {modalSubmitting ? 'Menyimpan...' : 'Simpan Pengguna'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};
