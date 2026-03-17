"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/trends.ts
const express_1 = require("express");
const TrendRepository_1 = require("../db/repositories/TrendRepository");
const TrendHunterEngine_1 = require("../TrendHunterEngine");
const trendQueues_1 = require("../queues/trendQueues");
const logger_1 = __importDefault(require("../utils/logger"));
const router = (0, express_1.Router)();
const repo = new TrendRepository_1.TrendRepository();
const engine = new TrendHunterEngine_1.TrendHunterEngine();
// GET /api/trends/top20
router.get('/top20', async (_req, res) => {
    try {
        const opportunities = await repo.getTop20Opportunities();
        res.json({ success: true, data: opportunities, timestamp: new Date().toISOString() });
    }
    catch (err) {
        logger_1.default.error('/top20 error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});
// GET /api/trends/signals
router.get('/signals', async (req, res) => {
    try {
        const hours = parseInt(String(req.query.hours || '24'), 10);
        const signals = await repo.getRecentSignals(hours);
        res.json({ success: true, data: signals, timestamp: new Date().toISOString() });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// GET /api/trends/validations
router.get('/validations', async (req, res) => {
    try {
        const hours = parseInt(String(req.query.hours || '24'), 10);
        const validations = await repo.getRecentValidations(hours);
        res.json({ success: true, data: validations, timestamp: new Date().toISOString() });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// GET /api/trends/suppliers
router.get('/suppliers', async (req, res) => {
    try {
        const hours = parseInt(String(req.query.hours || '24'), 10);
        const analyses = await repo.getRecentSupplierAnalysis(hours);
        res.json({ success: true, data: analyses, timestamp: new Date().toISOString() });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// GET /api/trends/stats — dashboard summary
router.get('/stats', async (_req, res) => {
    try {
        const stats = await repo.getDashboardStats();
        res.json({ success: true, data: stats, timestamp: new Date().toISOString() });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// GET /api/trends/keyword/:keyword
router.get('/keyword/:keyword', async (req, res) => {
    try {
        const keyword = String(req.params.keyword);
        const [signals, validations, suppliers, forecast] = await Promise.all([
            repo.getTopSignalsByKeyword(keyword),
            repo.getValidationsByKeyword(keyword),
            repo.getRecentSupplierAnalysis(72).then((a) => a.filter((s) => s.keyword === keyword)),
            repo.getLatestForecast(keyword),
        ]);
        res.json({
            success: true,
            data: { keyword, signals, validations, suppliers, forecast },
            timestamp: new Date().toISOString(),
        });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// POST /api/trends/trigger/scan — manually trigger social scan
router.post('/trigger/scan', async (_req, res) => {
    try {
        const job = await trendQueues_1.socialScanQueue.add('manual-scan', {}, { jobId: `manual-scan-${Date.now()}` });
        res.json({ success: true, data: { jobId: job.id }, message: 'Social scan queued' });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// POST /api/trends/trigger/validate — manually trigger marketplace validation
router.post('/trigger/validate', async (_req, res) => {
    try {
        const job = await trendQueues_1.marketplaceValidationQueue.add('manual-validate', {}, { jobId: `manual-validate-${Date.now()}` });
        res.json({ success: true, data: { jobId: job.id }, message: 'Marketplace validation queued' });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// POST /api/trends/trigger/suppliers — manually trigger supplier analysis
router.post('/trigger/suppliers', async (_req, res) => {
    try {
        const job = await trendQueues_1.supplierAnalysisQueue.add('manual-suppliers', {}, { jobId: `manual-suppliers-${Date.now()}` });
        res.json({ success: true, data: { jobId: job.id }, message: 'Supplier analysis queued' });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// POST /api/trends/trigger/top20 — manually trigger top20 generation
router.post('/trigger/top20', async (_req, res) => {
    try {
        const job = await trendQueues_1.dailyTop20Queue.add('manual-top20', {}, { jobId: `manual-top20-${Date.now()}` });
        res.json({ success: true, data: { jobId: job.id }, message: 'Top20 scoring queued' });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// POST /api/trends/trigger/pipeline — run full pipeline immediately (sync, for testing)
router.post('/trigger/pipeline', async (_req, res) => {
    try {
        logger_1.default.info('[API] Full pipeline triggered via API');
        const top = await engine.runFullPipeline();
        res.json({ success: true, data: top, message: `Pipeline complete — ${top.length} opportunities` });
    }
    catch (err) {
        logger_1.default.error('[API] Pipeline error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});
// POST /api/trends/launch — launch product into listing pipeline
router.post('/launch', async (req, res) => {
    try {
        const { keyword } = req.body;
        if (!keyword)
            return res.status(400).json({ success: false, error: 'keyword is required' });
        logger_1.default.info(`[API] Launching product: ${keyword}`);
        // TODO: integrate with your ListingQueue / ArbitrageMatrixEngine here
        // await ListingQueue.push({ keyword, source: 'TrendRadar', triggered_by: 'manual' });
        res.json({
            success: true,
            message: `Product "${keyword}" pushed to listing pipeline`,
            timestamp: new Date().toISOString(),
        });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// GET /api/trends/queue/status — check BullMQ queue sizes
router.get('/queue/status', async (_req, res) => {
    try {
        const [scanCounts, validateCounts, supplierCounts, top20Counts] = await Promise.all([
            trendQueues_1.socialScanQueue.getJobCounts(),
            trendQueues_1.marketplaceValidationQueue.getJobCounts(),
            trendQueues_1.supplierAnalysisQueue.getJobCounts(),
            trendQueues_1.dailyTop20Queue.getJobCounts(),
        ]);
        res.json({
            success: true,
            data: {
                'trend:social-scan': scanCounts,
                'trend:marketplace-validation': validateCounts,
                'trend:supplier-analysis': supplierCounts,
                'trend:daily-top20': top20Counts,
            },
        });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
exports.default = router;
//# sourceMappingURL=trends.js.map