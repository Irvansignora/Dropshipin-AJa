"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrendHunterEngine = void 0;
// src/TrendHunterEngine.ts
const SocialTrendScanner_1 = require("./services/SocialTrendScanner");
const MarketplaceDemandValidator_1 = require("./services/MarketplaceDemandValidator");
const SupplierFeasibilityAnalyzer_1 = require("./services/SupplierFeasibilityAnalyzer");
const AIOpportunityScorer_1 = require("./services/AIOpportunityScorer");
const TrendRepository_1 = require("./db/repositories/TrendRepository");
const config_1 = require("./config");
const logger_1 = __importDefault(require("./utils/logger"));
class TrendHunterEngine {
    scanner = new SocialTrendScanner_1.SocialTrendScanner();
    validator = new MarketplaceDemandValidator_1.MarketplaceDemandValidator();
    supplier = new SupplierFeasibilityAnalyzer_1.SupplierFeasibilityAnalyzer();
    scorer = new AIOpportunityScorer_1.AIOpportunityScorer();
    repo = new TrendRepository_1.TrendRepository();
    // ─── Step 1: Social Scan (every 2h) ──────────────────────────────────────────
    async runSocialScan() {
        logger_1.default.info('[TrendHunter] ▶ Social scan starting...');
        const start = Date.now();
        const signals = await this.scanner.scanAll();
        await this.repo.bulkInsertSignals(signals);
        logger_1.default.info(`[TrendHunter] ✅ Social scan done — ${signals.length} signals in ${Date.now() - start}ms`);
    }
    // ─── Step 2: Marketplace Validation (every 6h) ────────────────────────────────
    async runMarketplaceValidation() {
        logger_1.default.info('[TrendHunter] ▶ Marketplace validation starting...');
        const start = Date.now();
        const keywords = await this.repo.getRecentKeywords(48);
        if (!keywords.length) {
            logger_1.default.info('[TrendHunter] No keywords to validate — run social scan first');
            return;
        }
        const validations = await this.validator.validateBatch(keywords);
        await this.repo.bulkInsertValidations(validations);
        logger_1.default.info(`[TrendHunter] ✅ Marketplace validation done — ${validations.length} records in ${Date.now() - start}ms`);
    }
    // ─── Step 3: Supplier Analysis (every 12h) ────────────────────────────────────
    async runSupplierAnalysis() {
        logger_1.default.info('[TrendHunter] ▶ Supplier analysis starting...');
        const start = Date.now();
        const keywords = await this.repo.getRecentKeywords(72);
        if (!keywords.length) {
            logger_1.default.info('[TrendHunter] No keywords for supplier analysis');
            return;
        }
        const analyses = await this.supplier.analyzeBatch(keywords);
        await this.repo.bulkInsertSupplierAnalysis(analyses);
        logger_1.default.info(`[TrendHunter] ✅ Supplier analysis done — ${analyses.length} records in ${Date.now() - start}ms`);
    }
    // ─── Step 4: Generate Top 20 (daily) ─────────────────────────────────────────
    async generateTop20() {
        logger_1.default.info('[TrendHunter] ▶ Generating Top 20 opportunities...');
        const start = Date.now();
        const [signals, validations, suppliers] = await Promise.all([
            this.repo.getRecentSignals(72),
            this.repo.getRecentValidations(72),
            this.repo.getRecentSupplierAnalysis(72),
        ]);
        if (!signals.length) {
            logger_1.default.warn('[TrendHunter] No signals found — returning empty top20');
            return [];
        }
        const all = await this.scorer.score(signals, validations, suppliers);
        const top = all.slice(0, config_1.config.scoring.topN);
        // Persist opportunities and forecasts
        for (const op of top) {
            await this.repo.upsertOpportunity(op);
        }
        await this.repo.bulkInsertForecasts(top.map((o) => o.forecast));
        const autoPushed = top.filter((o) => o.auto_pushed).length;
        logger_1.default.info(`[TrendHunter] ✅ Top ${top.length} generated (${autoPushed} auto-pushed) in ${Date.now() - start}ms`);
        return top;
    }
    // ─── Full Pipeline (run all steps in sequence) ────────────────────────────────
    async runFullPipeline() {
        logger_1.default.info('[TrendHunter] ⚡ Full pipeline starting...');
        await this.runSocialScan();
        await this.runMarketplaceValidation();
        await this.runSupplierAnalysis();
        const top = await this.generateTop20();
        logger_1.default.info('[TrendHunter] ⚡ Full pipeline complete');
        return top;
    }
}
exports.TrendHunterEngine = TrendHunterEngine;
//# sourceMappingURL=TrendHunterEngine.js.map