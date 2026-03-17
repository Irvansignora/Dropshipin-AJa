"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrendRepository = void 0;
// src/db/repositories/TrendRepository.ts
const connection_1 = require("../connection");
const logger_1 = __importDefault(require("../../utils/logger"));
class TrendRepository {
    // ─── Trend Signals ───────────────────────────────────────────────────────────
    async bulkInsertSignals(signals) {
        if (!signals.length)
            return;
        for (const s of signals) {
            await (0, connection_1.query)(`INSERT INTO trend_signals (id, keyword, platform, virality_score, trend_stage, detected_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT DO NOTHING`, [s.id, s.keyword, s.platform, s.virality_score, s.trend_stage, s.detected_at]);
        }
        logger_1.default.debug(`Inserted ${signals.length} trend signals`);
    }
    async getRecentSignals(hoursBack = 72) {
        return (0, connection_1.query)(`SELECT * FROM trend_signals
       WHERE detected_at > NOW() - INTERVAL '${hoursBack} hours'
       ORDER BY virality_score DESC`);
    }
    async getRecentKeywords(hoursBack = 48) {
        const rows = await (0, connection_1.query)(`SELECT DISTINCT keyword FROM trend_signals
       WHERE detected_at > NOW() - INTERVAL '${hoursBack} hours'`);
        return rows.map((r) => r.keyword);
    }
    async getTopSignalsByKeyword(keyword) {
        return (0, connection_1.query)(`SELECT * FROM trend_signals WHERE keyword = $1 ORDER BY detected_at DESC LIMIT 20`, [keyword]);
    }
    // ─── Market Validation ────────────────────────────────────────────────────────
    async bulkInsertValidations(validations) {
        if (!validations.length)
            return;
        for (const v of validations) {
            await (0, connection_1.query)(`INSERT INTO trend_market_validation
         (keyword, marketplace, search_volume, number_of_listings, competition_score,
          price_range_min, price_range_max, demand_score)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [
                v.keyword, v.marketplace, v.search_volume, v.number_of_listings,
                v.competition_score, v.price_range_min, v.price_range_max, v.demand_score,
            ]);
        }
        logger_1.default.debug(`Inserted ${validations.length} market validations`);
    }
    async getRecentValidations(hoursBack = 72) {
        return (0, connection_1.query)(`SELECT * FROM trend_market_validation
       WHERE validated_at > NOW() - INTERVAL '${hoursBack} hours'
       ORDER BY demand_score DESC`);
    }
    async getValidationsByKeyword(keyword) {
        return (0, connection_1.query)(`SELECT * FROM trend_market_validation
       WHERE keyword = $1 ORDER BY validated_at DESC`, [keyword]);
    }
    // ─── Supplier Analysis ────────────────────────────────────────────────────────
    async bulkInsertSupplierAnalysis(analyses) {
        if (!analyses.length)
            return;
        for (const a of analyses) {
            await (0, connection_1.query)(`INSERT INTO trend_supplier_analysis
         (keyword, supplier_platform, avg_price, stock_level, rating, shipping_time, supplier_feasibility_score)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`, [
                a.keyword, a.supplier_platform, a.avg_price, a.stock_level,
                a.rating, a.shipping_time, a.supplier_feasibility_score,
            ]);
        }
        logger_1.default.debug(`Inserted ${analyses.length} supplier analyses`);
    }
    async getRecentSupplierAnalysis(hoursBack = 72) {
        return (0, connection_1.query)(`SELECT * FROM trend_supplier_analysis
       WHERE analyzed_at > NOW() - INTERVAL '${hoursBack} hours'
       ORDER BY supplier_feasibility_score DESC`);
    }
    // ─── Forecasts ────────────────────────────────────────────────────────────────
    async bulkInsertForecasts(forecasts) {
        if (!forecasts.length)
            return;
        for (const f of forecasts) {
            await (0, connection_1.query)(`INSERT INTO trend_forecasts
         (keyword, predicted_daily_sales, estimated_monthly_profit, trend_lifespan_days)
         VALUES ($1, $2, $3, $4)`, [f.keyword, f.predicted_daily_sales, f.estimated_monthly_profit, f.trend_lifespan_days]);
        }
        logger_1.default.debug(`Inserted ${forecasts.length} forecasts`);
    }
    async getLatestForecast(keyword) {
        return (0, connection_1.queryOne)(`SELECT * FROM trend_forecasts WHERE keyword = $1 ORDER BY forecasted_at DESC LIMIT 1`, [keyword]);
    }
    // ─── Opportunities ────────────────────────────────────────────────────────────
    async upsertOpportunity(op) {
        await (0, connection_1.query)(`INSERT INTO trend_opportunities
       (keyword, trend_opportunity_score, virality_score, demand_score, margin_potential,
        supplier_feasibility_score, competition_score, avg_buy_price, avg_sell_price,
        trend_stage, top_platform, auto_pushed)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT DO NOTHING`, [
            op.keyword, op.trend_opportunity_score, op.virality_score, op.demand_score,
            op.margin_potential, op.supplier_feasibility_score, op.competition_score,
            op.avg_buy_price, op.avg_sell_price, op.trend_stage, op.top_platform, op.auto_pushed,
        ]);
    }
    async getTop20Opportunities() {
        const rows = await (0, connection_1.query)(`SELECT o.*, 
              f.predicted_daily_sales, f.estimated_monthly_profit, f.trend_lifespan_days
       FROM trend_opportunities o
       LEFT JOIN LATERAL (
         SELECT * FROM trend_forecasts WHERE keyword = o.keyword ORDER BY forecasted_at DESC LIMIT 1
       ) f ON true
       ORDER BY o.trend_opportunity_score DESC
       LIMIT 20`);
        return rows.map((r) => ({
            keyword: r.keyword,
            trend_opportunity_score: parseFloat(r.trend_opportunity_score),
            virality_score: parseFloat(r.virality_score),
            demand_score: parseFloat(r.demand_score),
            margin_potential: parseFloat(r.margin_potential),
            supplier_feasibility_score: parseFloat(r.supplier_feasibility_score),
            competition_score: parseFloat(r.competition_score),
            avg_buy_price: parseFloat(r.avg_buy_price),
            avg_sell_price: parseFloat(r.avg_sell_price),
            trend_stage: r.trend_stage,
            top_platform: r.top_platform,
            auto_pushed: r.auto_pushed,
            forecast: {
                keyword: r.keyword,
                predicted_daily_sales: r.predicted_daily_sales ?? 0,
                estimated_monthly_profit: parseFloat(r.estimated_monthly_profit ?? '0'),
                trend_lifespan_days: r.trend_lifespan_days ?? 0,
            },
        }));
    }
    async getDashboardStats() {
        const [stats] = await (0, connection_1.query)(`
      SELECT
        (SELECT COUNT(*) FROM trend_signals WHERE detected_at > NOW() - INTERVAL '24 hours') AS total_signals,
        (SELECT COUNT(DISTINCT keyword) FROM trend_signals WHERE detected_at > NOW() - INTERVAL '24 hours') AS total_keywords,
        (SELECT COUNT(*) FROM trend_opportunities WHERE auto_pushed = true AND created_at > NOW() - INTERVAL '24 hours') AS auto_pushed,
        (SELECT ROUND(AVG(trend_opportunity_score), 2) FROM trend_opportunities WHERE created_at > NOW() - INTERVAL '24 hours') AS avg_score,
        (SELECT MAX(detected_at) FROM trend_signals) AS last_scan
    `);
        return {
            total_signals: parseInt(stats.total_signals || '0', 10),
            total_keywords: parseInt(stats.total_keywords || '0', 10),
            auto_pushed: parseInt(stats.auto_pushed || '0', 10),
            avg_score: parseFloat(stats.avg_score || '0'),
            last_scan: stats.last_scan,
        };
    }
}
exports.TrendRepository = TrendRepository;
//# sourceMappingURL=TrendRepository.js.map