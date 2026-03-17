// src/index.ts
import 'dotenv/config';
import express        from 'express';
import cors           from 'cors';
import path           from 'path';
import { config }     from './config';
import { testConnection } from './db/connection';
import { runMigrations }  from './db/migrate';
import trendsRouter       from './routes/trends';
import logger             from './utils/logger';
import fs                 from 'fs';

// Ensure logs directory exists
if (!fs.existsSync('logs')) fs.mkdirSync('logs');

const app = express();

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, _res, next) => {
  logger.debug(`${req.method} ${req.path}`);
  next();
});

// ─── Static Files (Trend Radar Dashboard) ────────────────────────────────────

const dashboardPath = path.join(__dirname, '../public');
if (fs.existsSync(dashboardPath)) {
  app.use(express.static(dashboardPath));
  app.get('/', (_req, res) => res.sendFile(path.join(dashboardPath, 'index.html')));
}

// ─── API Routes ───────────────────────────────────────────────────────────────

app.use('/api/trends', trendsRouter);

// Health check
app.get('/health', async (_req, res) => {
  const geminiEnabled = !!config.gemini.apiKey;
  res.json({
    status:          'ok',
    service:         'TrendHunterEngine',
    version:         '1.0.0',
    forecast_mode:   geminiEnabled ? 'gemini-ai' : 'heuristic',
    gemini_enabled:  geminiEnabled,
    timestamp:       new Date().toISOString(),
  });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// Error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ success: false, error: err.message });
});

// ─── Startup ─────────────────────────────────────────────────────────────────

async function start() {
  logger.info('🚀 TrendHunterEngine starting...');

  // Test DB
  const dbOk = await testConnection();
  if (!dbOk) {
    logger.error('Cannot connect to database — check DATABASE_URL in .env');
    process.exit(1);
  }

  // Run migrations
  await runMigrations();

  // Start server
  app.listen(config.server.port, () => {
    const geminiEnabled = !!config.gemini.apiKey;
    logger.info(`✅ Server running on http://localhost:${config.server.port}`);
    logger.info(`📊 Trend Radar dashboard: http://localhost:${config.server.port}`);
    logger.info(`🤖 Forecast mode: ${geminiEnabled ? '✨ Gemini AI' : '📐 Heuristic (set GEMINI_API_KEY to enable AI)'}`);
    logger.info(`🔗 API base: http://localhost:${config.server.port}/api/trends`);
    logger.info('');
    logger.info('Available endpoints:');
    logger.info('  GET  /api/trends/top20');
    logger.info('  GET  /api/trends/signals');
    logger.info('  GET  /api/trends/validations');
    logger.info('  GET  /api/trends/suppliers');
    logger.info('  GET  /api/trends/stats');
    logger.info('  GET  /api/trends/keyword/:keyword');
    logger.info('  GET  /api/trends/queue/status');
    logger.info('  POST /api/trends/trigger/scan');
    logger.info('  POST /api/trends/trigger/validate');
    logger.info('  POST /api/trends/trigger/suppliers');
    logger.info('  POST /api/trends/trigger/top20');
    logger.info('  POST /api/trends/trigger/pipeline');
    logger.info('  POST /api/trends/launch');
    logger.info('');
    logger.info('💡 Run worker separately: npm run worker');
  });
}

start().catch((err) => {
  logger.error('Fatal startup error:', err);
  process.exit(1);
});

export default app;
