"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIOpportunityScorer = void 0;
const GeminiForecaster_1 = require("./GeminiForecaster");
const config_1 = require("../config");
const logger_1 = __importDefault(require("../utils/logger"));
class AIOpportunityScorer {
    forecaster = new GeminiForecaster_1.GeminiForecaster();
    calculateOpportunityScore(virality_score, demand_score, margin_potential, supplier_feasibility_score) {
        return Math.min(100, Math.max(0, virality_score * 0.35 +
            demand_score * 0.30 +
            margin_potential * 0.25 +
            supplier_feasibility_score * 0.10));
    }
    async score(signals, validations, suppliers) {
        const keywords = [...new Set(signals.map((s) => s.keyword))];
        logger_1.default.info(`[AIScorer] Scoring ${keywords.length} keywords...`);
        const results = await Promise.allSettled(keywords.map((kw) => this.scoreKeyword(kw, signals, validations, suppliers)));
        const opportunities = results
            .filter((r) => r.status === 'fulfilled')
            .map((r) => r.value)
            .filter((o) => o !== null)
            .sort((a, b) => b.trend_opportunity_score - a.trend_opportunity_score);
        logger_1.default.info(`[AIScorer] Scored ${opportunities.length} opportunities`);
        return opportunities;
    }
    async scoreKeyword(keyword, signals, validations, suppliers) {
        const kwSignals = signals.filter((s) => s.keyword === keyword);
        const kwValidations = validations.filter((v) => v.keyword === keyword);
        const kwSuppliers = suppliers.filter((s) => s.keyword === keyword);
        if (!kwSignals.length)
            return null;
        // Aggregate scores
        const virality_score = kwSignals.reduce((s, x) => s + x.virality_score, 0) / kwSignals.length;
        const demand_score = kwValidations.length
            ? kwValidations.reduce((s, x) => s + x.demand_score, 0) / kwValidations.length
            : virality_score * 0.6; // fallback estimation
        const competition_score = kwValidations.length
            ? kwValidations.reduce((s, x) => s + x.competition_score, 0) / kwValidations.length
            : 50;
        const supplier_feasibility_score = kwSuppliers.length
            ? kwSuppliers.reduce((s, x) => s + x.supplier_feasibility_score, 0) / kwSuppliers.length
            : 50;
        // Price calculation
        const buy_prices = kwSuppliers.map((s) => s.avg_price).filter(Boolean);
        const sell_prices = kwValidations.flatMap((v) => [(v.price_range_min + v.price_range_max) / 2]).filter(Boolean);
        const avg_buy_price = buy_prices.length ? buy_prices.reduce((a, b) => a + b, 0) / buy_prices.length : 0;
        const avg_sell_price = sell_prices.length ? sell_prices.reduce((a, b) => a + b, 0) / sell_prices.length : 0;
        const margin_potential = avg_sell_price > 0 && avg_buy_price > 0
            ? Math.max(0, ((avg_sell_price - avg_buy_price) / avg_sell_price) * 100)
            : demand_score * 0.4; // fallback
        const trend_opportunity_score = this.calculateOpportunityScore(virality_score, demand_score, margin_potential, supplier_feasibility_score);
        // Detect top platform
        const platformCounts = {};
        kwSignals.forEach((s) => { platformCounts[s.platform] = (platformCounts[s.platform] || 0) + 1; });
        const top_platform = (Object.entries(platformCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'tiktok');
        // Detect trend stage (use highest stage)
        const stageOrder = { early: 0, rising: 1, peak: 2 };
        const trend_stage = kwSignals.reduce((best, s) => stageOrder[s.trend_stage] > stageOrder[best] ? s.trend_stage : best, 'early');
        // Check auto-push thresholds
        const { trendScoreThreshold, marginThresholdPct, competitionThreshold } = config_1.config.scoring;
        const auto_pushed = trend_opportunity_score > trendScoreThreshold &&
            margin_potential > marginThresholdPct &&
            competition_score < competitionThreshold;
        const base = {
            keyword,
            trend_opportunity_score,
            virality_score,
            demand_score,
            margin_potential,
            supplier_feasibility_score,
            competition_score,
            avg_buy_price,
            avg_sell_price,
            trend_stage,
            top_platform,
            auto_pushed,
        };
        const forecast = await this.forecaster.forecast(base);
        if (auto_pushed) {
            logger_1.default.info(`[AIScorer] 🚀 AUTO-PUSHED: "${keyword}" (score: ${trend_opportunity_score.toFixed(1)})`);
        }
        return { ...base, forecast };
    }
}
exports.AIOpportunityScorer = AIOpportunityScorer;
//# sourceMappingURL=AIOpportunityScorer.js.map