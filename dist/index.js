"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/index.ts
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const config_1 = require("./config");
const connection_1 = require("./db/connection");
const migrate_1 = require("./db/migrate");
const trends_1 = __importDefault(require("./routes/trends"));
const logger_1 = __importDefault(require("./utils/logger"));
const fs_1 = __importDefault(require("fs"));
// Ensure logs directory exists
if (!fs_1.default.existsSync('logs'))
    fs_1.default.mkdirSync('logs');
const app = (0, express_1.default)();
// ─── Middleware ───────────────────────────────────────────────────────────────
app.use((0, cors_1.default)({ origin: '*' }));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
// Request logging
app.use((req, _res, next) => {
    logger_1.default.debug(`${req.method} ${req.path}`);
    next();
});
// ─── Static Files (Trend Radar Dashboard) ────────────────────────────────────
const dashboardPath = path_1.default.join(__dirname, '../public');
if (fs_1.default.existsSync(dashboardPath)) {
    app.use(express_1.default.static(dashboardPath));
    app.get('/', (_req, res) => res.sendFile(path_1.default.join(dashboardPath, 'index.html')));
}
// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/trends', trends_1.default);
// Health check
app.get('/health', async (_req, res) => {
    const geminiEnabled = !!config_1.config.gemini.apiKey;
    res.json({
        status: 'ok',
        service: 'TrendHunterEngine',
        version: '1.0.0',
        forecast_mode: geminiEnabled ? 'gemini-ai' : 'heuristic',
        gemini_enabled: geminiEnabled,
        timestamp: new Date().toISOString(),
    });
});
// 404 handler
app.use((_req, res) => {
    res.status(404).json({ success: false, error: 'Route not found' });
});
// Error handler
app.use((err, _req, res, _next) => {
    logger_1.default.error('Unhandled error:', err);
    res.status(500).json({ success: false, error: err.message });
});
// ─── Startup ─────────────────────────────────────────────────────────────────
async function start() {
    logger_1.default.info('🚀 TrendHunterEngine starting...');
    // Test DB
    const dbOk = await (0, connection_1.testConnection)();
    if (!dbOk) {
        logger_1.default.error('Cannot connect to database — check DATABASE_URL in .env');
        process.exit(1);
    }
    // Run migrations
    await (0, migrate_1.runMigrations)();
    // Start server
    app.listen(config_1.config.server.port, () => {
        const geminiEnabled = !!config_1.config.gemini.apiKey;
        logger_1.default.info(`✅ Server running on http://localhost:${config_1.config.server.port}`);
        logger_1.default.info(`📊 Trend Radar dashboard: http://localhost:${config_1.config.server.port}`);
        logger_1.default.info(`🤖 Forecast mode: ${geminiEnabled ? '✨ Gemini AI' : '📐 Heuristic (set GEMINI_API_KEY to enable AI)'}`);
        logger_1.default.info(`🔗 API base: http://localhost:${config_1.config.server.port}/api/trends`);
        logger_1.default.info('');
        logger_1.default.info('Available endpoints:');
        logger_1.default.info('  GET  /api/trends/top20');
        logger_1.default.info('  GET  /api/trends/signals');
        logger_1.default.info('  GET  /api/trends/validations');
        logger_1.default.info('  GET  /api/trends/suppliers');
        logger_1.default.info('  GET  /api/trends/stats');
        logger_1.default.info('  GET  /api/trends/keyword/:keyword');
        logger_1.default.info('  GET  /api/trends/queue/status');
        logger_1.default.info('  POST /api/trends/trigger/scan');
        logger_1.default.info('  POST /api/trends/trigger/validate');
        logger_1.default.info('  POST /api/trends/trigger/suppliers');
        logger_1.default.info('  POST /api/trends/trigger/top20');
        logger_1.default.info('  POST /api/trends/trigger/pipeline');
        logger_1.default.info('  POST /api/trends/launch');
        logger_1.default.info('');
        logger_1.default.info('💡 Run worker separately: npm run worker');
    });
}
start().catch((err) => {
    logger_1.default.error('Fatal startup error:', err);
    process.exit(1);
});
exports.default = app;
//# sourceMappingURL=index.js.map