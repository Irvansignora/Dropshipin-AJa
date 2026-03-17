"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiForecaster = void 0;
// src/services/GeminiForecaster.ts
const generative_ai_1 = require("@google/generative-ai");
const config_1 = require("../config");
const logger_1 = __importDefault(require("../utils/logger"));
class GeminiForecaster {
    genAI = null;
    getModel() {
        if (!config_1.config.gemini.apiKey)
            return null;
        if (!this.genAI)
            this.genAI = new generative_ai_1.GoogleGenerativeAI(config_1.config.gemini.apiKey);
        return this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    }
    async forecast(opportunity) {
        const model = this.getModel();
        if (!model) {
            logger_1.default.warn('[GeminiForecaster] No API key — using heuristic forecast');
            return this.heuristicForecast(opportunity);
        }
        try {
            const prompt = `You are an expert e-commerce market analyst for the Indonesian market (Shopee, Tokopedia, Lazada).

Analyze this trending product opportunity and provide a forecast:

Product keyword: "${opportunity.keyword}"
Virality score: ${opportunity.virality_score.toFixed(1)}/100
Demand score: ${opportunity.demand_score.toFixed(1)}/100
Margin potential: ${opportunity.margin_potential.toFixed(1)}%
Competition score: ${opportunity.competition_score.toFixed(1)}/100 (lower = less competition)
Supplier feasibility: ${opportunity.supplier_feasibility_score.toFixed(1)}/100
Avg buy price: Rp ${opportunity.avg_buy_price.toLocaleString('id-ID')}
Avg sell price: Rp ${opportunity.avg_sell_price.toLocaleString('id-ID')}
Trend stage: ${opportunity.trend_stage}
Top platform: ${opportunity.top_platform}

Return ONLY a valid JSON object, no markdown, no explanation:
{
  "predicted_daily_sales": <integer between 1-500>,
  "estimated_monthly_profit": <number in IDR>,
  "trend_lifespan_days": <integer between 7-180>
}`;
            const result = await model.generateContent(prompt);
            const text = result.response.text().trim();
            const jsonStr = text.match(/\{[\s\S]*\}/)?.[0];
            if (!jsonStr)
                throw new Error('No JSON found in Gemini response');
            const parsed = JSON.parse(jsonStr);
            return {
                keyword: opportunity.keyword,
                predicted_daily_sales: Math.max(1, Math.round(parsed.predicted_daily_sales)),
                estimated_monthly_profit: Math.max(0, parseFloat(parsed.estimated_monthly_profit)),
                trend_lifespan_days: Math.max(7, Math.round(parsed.trend_lifespan_days)),
            };
        }
        catch (err) {
            logger_1.default.warn(`[GeminiForecaster] API error: ${err.message} — using heuristic`);
            return this.heuristicForecast(opportunity);
        }
    }
    heuristicForecast(op) {
        const score_factor = op.trend_opportunity_score / 100;
        const demand_factor = op.demand_score / 100;
        const margin_factor = op.margin_potential / 100;
        const daily_sales = Math.round(5 + score_factor * demand_factor * 200);
        const profit_per_sale = (op.avg_sell_price - op.avg_buy_price) * margin_factor;
        const monthly_profit = daily_sales * 30 * profit_per_sale * 0.7; // 70% sell-through
        const lifespan = op.trend_stage === 'early' ? 90
            : op.trend_stage === 'rising' ? 45
                : 20;
        return {
            keyword: op.keyword,
            predicted_daily_sales: daily_sales,
            estimated_monthly_profit: Math.max(0, monthly_profit),
            trend_lifespan_days: lifespan,
        };
    }
}
exports.GeminiForecaster = GeminiForecaster;
//# sourceMappingURL=GeminiForecaster.js.map