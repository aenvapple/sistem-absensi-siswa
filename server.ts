import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initDatabase } from './backend/db/database.ts';
import { authRouter } from './backend/routes/authRoutes.ts';
import { dashboardRouter } from './backend/routes/dashboardRoutes.ts';
import { attendanceRouter } from './backend/routes/attendanceRoutes.ts';
import { studentRouter } from './backend/routes/studentRoutes.ts';
import { classRouter } from './backend/routes/classRoutes.ts';
import { qrRouter } from './backend/routes/qrRoutes.ts';
import { userRouter } from './backend/routes/userRoutes.ts';
import { settingRouter } from './backend/routes/settingRoutes.ts';
import { reportRouter } from './backend/routes/reportRoutes.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  // Initialize SQLite database and migrations
  initDatabase();

  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const isProd = process.env.NODE_ENV === 'production';

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API Routes
  app.use('/api', authRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/attendance', attendanceRouter);
  app.use('/api/students', studentRouter);
  app.use('/api/students', qrRouter);
  app.use('/api/classes', classRouter);
  app.use('/api/qr', qrRouter);
  app.use('/api/users', userRouter);
  app.use('/api/settings', settingRouter);
  app.use('/api/reports', reportRouter);

  if (!isProd) {
    // Vite Dev Server middleware mode
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    // Production static serving
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SERVER] School QR Attendance Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[SERVER_FATAL_ERROR]', err);
  process.exit(1);
});
