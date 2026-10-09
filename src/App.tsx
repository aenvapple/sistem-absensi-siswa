import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { LoginPage } from './pages/LoginPage.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { ScanPage } from './pages/ScanPage.tsx';
import { DashboardPage } from './pages/DashboardPage.tsx';
import { StudentDetailPage } from './pages/StudentDetailPage.tsx';
import { AdminVerifyPage } from './pages/AdminVerifyPage.tsx';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage.tsx';
import { StudentsPage } from './pages/admin/StudentsPage.tsx';
import { StudentFormPage } from './pages/admin/StudentFormPage.tsx';
import { ClassesPage } from './pages/admin/ClassesPage.tsx';
import { QRManagementPage } from './pages/admin/QRManagementPage.tsx';
import { AttendanceManagementPage } from './pages/admin/AttendanceManagementPage.tsx';
import { UsersPage } from './pages/admin/UsersPage.tsx';
import { SettingsPage } from './pages/admin/SettingsPage.tsx';
import { ReportsPage } from './pages/admin/ReportsPage.tsx';
import { LoadingSpinner } from './components/LoadingSpinner.tsx';

function AppContent() {
  const { user, loading, isAdminVerified } = useAuth();
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return window.location.pathname || '/';
  });

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    window.scrollTo(0, 0);
  };

  useEffect(() => {
    const onPopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <LoadingSpinner message="Menghubungkan ke server sekolah..." size="lg" />
      </div>
    );
  }

  // Not logged in -> force login
  if (!user) {
    return <LoginPage navigate={navigate} />;
  }

  // Route: /login while logged in -> redirect to /home
  if (currentPath === '/' || currentPath === '/login') {
    return (
      <div>
        <Navbar currentPath="/home" navigate={navigate} />
        <HomePage navigate={navigate} />
      </div>
    );
  }

  // Route: /home
  if (currentPath === '/home') {
    return (
      <div>
        <Navbar currentPath="/home" navigate={navigate} />
        <HomePage navigate={navigate} />
      </div>
    );
  }

  // Route: /scan (Special full-screen scanner view)
  if (currentPath === '/scan') {
    return <ScanPage navigate={navigate} />;
  }

  // Route: /dashboard
  if (currentPath === '/dashboard') {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col">
        <Navbar currentPath="/dashboard" navigate={navigate} />
        <div className="flex-1">
          <DashboardPage navigate={navigate} />
        </div>
      </div>
    );
  }

  // Route: /dashboard/student/:id
  if (currentPath.startsWith('/dashboard/student/')) {
    const studentId = currentPath.split('/dashboard/student/')[1]?.split('/')[0];
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col">
        <Navbar currentPath="/dashboard" navigate={navigate} />
        <div className="flex-1">
          <StudentDetailPage id={studentId} navigate={navigate} />
        </div>
      </div>
    );
  }

  // ADMIN ROUTES (Requires role === 'admin' and server-verified admin)
  if (currentPath.startsWith('/admin')) {
    // If not admin role
    if (user.role !== 'admin') {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
          <h2 className="text-2xl font-bold text-rose-500">403 • Akses Ditolak</h2>
          <p className="text-sm text-slate-400 mt-2 max-w-md">
            Halaman administrasi hanya dapat diakses oleh Administrator sekolah. Akun Anda memiliki peran: <strong className="text-white">{user.role}</strong>.
          </p>
          <button
            onClick={() => navigate('/home')}
            className="mt-6 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-semibold transition"
          >
            Kembali ke Beranda
          </button>
        </div>
      );
    }

    // If not yet verified with admin password in this session -> Admin Verification Screen (Section 6)
    if (!isAdminVerified && currentPath !== '/admin/verify') {
      return <AdminVerifyPage navigate={navigate} targetPath={currentPath} />;
    }

    if (currentPath === '/admin/verify') {
      return <AdminVerifyPage navigate={navigate} />;
    }

    if (currentPath === '/admin/dashboard') {
      return <AdminDashboardPage navigate={navigate} />;
    }

    if (currentPath === '/admin/students') {
      return <StudentsPage navigate={navigate} />;
    }

    if (currentPath === '/admin/students/create') {
      return <StudentFormPage navigate={navigate} />;
    }

    if (currentPath.startsWith('/admin/students/') && currentPath.endsWith('/edit')) {
      const parts = currentPath.split('/');
      const editId = parts[3];
      return <StudentFormPage id={editId} navigate={navigate} />;
    }

    if (currentPath === '/admin/classes') {
      return <ClassesPage navigate={navigate} />;
    }

    if (currentPath === '/admin/qr') {
      return <QRManagementPage navigate={navigate} />;
    }

    if (currentPath === '/admin/attendance') {
      return <AttendanceManagementPage navigate={navigate} />;
    }

    if (currentPath === '/admin/users') {
      return <UsersPage navigate={navigate} />;
    }

    if (currentPath === '/admin/settings') {
      return <SettingsPage navigate={navigate} />;
    }

    if (currentPath === '/admin/reports') {
      return <ReportsPage navigate={navigate} />;
    }
  }

  // Fallback 404
  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
      <h2 className="text-3xl font-black text-blue-400">404</h2>
      <p className="text-lg font-bold text-white mt-1">Halaman Tidak Ditemukan</p>
      <p className="text-sm text-slate-400 mt-1 max-w-sm">
        Halaman yang Anda tuju tidak tersedia atau tautan salah.
      </p>
      <button
        onClick={() => navigate('/home')}
        className="mt-6 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-semibold transition"
      >
        Kembali ke Beranda
      </button>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
