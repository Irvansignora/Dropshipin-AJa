"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketplaceDemandValidator = void 0;
// src/services/MarketplaceDemandValidator.ts
const axios_1 = __importDefault(require("axios"));
const crypto_1 = __importDefault(require("crypto"));
const config_1 = require("../config");
const logger_1 = __importDefault(require("../utils/logger"));
class MarketplaceDemandValidator {
    // ─── Demand Score Formula ─────────────────────────────────────────────────────
    calculateDemandScore(search_volume, price_spread, competition_score) {
        const volume_norm = Math.min(100, (search_volume / 50000) * 100);
        const spread_norm = Math.min(100, (price_spread / 500000) * 100);
        const comp_inv = 100 - Math.min(100, competition_score);
        const score = volume_norm * 0.5 +
            spread_norm * 0.3 +
            comp_inv * 0.2;
        return Math.min(100, Math.max(0, score));
    }
    // ─── Shopee ───────────────────────────────────────────────────────────────────
    async validateShopee(keyword) {
        try {
            const { partnerId, apiKey, baseUrl } = config_1.config.marketplace.shopee;
            if (!partnerId || !apiKey)
                throw new Error('Shopee credentials not configured');
            const timestamp = Math.floor(Date.now() / 1000);
            const path = '/api/v2/product/search_item';
            const body = { keyword, limit: 50, offset: 0 };
            const baseStr = `${partnerId}${path}${timestamp}`;
            const sign = crypto_1.default.createHmac('sha256', apiKey).update(baseStr).digest('hex');
            const response = await axios_1.default.post(`${baseUrl}${path}`, body, {
                params: { partner_id: partnerId, timestamp, sign },
                timeout: 15000,
            });
            const items = response.data?.response?.item || [];
            const prices = items.map((i) => i.price_info?.current_price || 0).filter(Boolean);
            const price_min = prices.length ? Math.min(...prices) : 0;
            const price_max = prices.length ? Math.max(...prices) : 0;
            const num = items.length;
            const comp_score = Math.min(100, (num / 200) * 100);
            return {
                keyword,
                marketplace: 'shopee',
                search_volume: response.data?.response?.total_count || num * 20,
                number_of_listings: num,
                competition_score: comp_score,
                price_range_min: price_min,
                price_range_max: price_max,
                demand_score: this.calculateDemandScore(num * 20, price_max - price_min, comp_score),
            };
        }
        catch {
            return this.getMockValidation(keyword, 'shopee');
        }
    }
    // ─── Tokopedia ────────────────────────────────────────────────────────────────
    async validateTokopedia(keyword) {
        try {
            const { clientId, clientSecret, baseUrl } = config_1.config.marketplace.tokopedia;
            if (!clientId || !clientSecret)
                throw new Error('Tokopedia credentials not configured');
            // Get access token
            const tokenRes = await axios_1.default.post(`${baseUrl}/token`, null, {
                params: { grant_type: 'client_credentials' },
                auth: { username: clientId, password: clientSecret },
                timeout: 10000,
            });
            const token = tokenRes.data?.access_token;
            const response = await axios_1.default.get(`${baseUrl}/v2/search/product`, {
                params: { q: keyword, rows: 50, start: 0 },
                headers: { Authorization: `Bearer ${token}` },
                timeout: 15000,
            });
            const products = response.data?.data?.products || [];
            const prices = products.map((p) => p.price?.value || 0).filter(Boolean);
            const price_min = prices.length ? Math.min(...prices) : 0;
            const price_max = prices.length ? Math.max(...prices) : 0;
            const num = response.data?.data?.totalData || products.length;
            const comp_score = Math.min(100, (num / 500) * 100);
            return {
                keyword,
                marketplace: 'tokopedia',
                search_volume: num,
                number_of_listings: products.length,
                competition_score: comp_score,
                price_range_min: price_min,
                price_range_max: price_max,
                demand_score: this.calculateDemandScore(num, price_max - price_min, comp_score),
            };
        }
        catch {
            return this.getMockValidation(keyword, 'tokopedia');
        }
    }
    // ─── Lazada ───────────────────────────────────────────────────────────────────
    async validateLazada(keyword) {
        try {
            const { appKey, appSecret, baseUrl } = config_1.config.marketplace.lazada;
            if (!appKey || !appSecret)
                throw new Error('Lazada credentials not configured');
            const timestamp = Date.now().toString();
            const params = {
                app_key: appKey,
                timestamp,
                sign_method: 'sha256',
                method: '/products/search',
                q: keyword,
                limit: '50',
            };
            const sortedKeys = Object.keys(params).sort();
            const strToSign = sortedKeys.map((k) => `${k}${params[k]}`).join('');
            const sign = crypto_1.default.createHmac('sha256', appSecret).update(strToSign).digest('hex').toUpperCase();
            const response = await axios_1.default.get(`${baseUrl}/products/search`, {
                params: { ...params, sign },
                timeout: 15000,
            });
            const products = response.data?.data?.products || [];
            const prices = products.map((p) => parseFloat(p.price || '0')).filter(Boolean);
            const price_min = prices.length ? Math.min(...prices) : 0;
            const price_max = prices.length ? Math.max(...prices) : 0;
            const num = response.data?.data?.total_results || products.length;
            const comp_score = Math.min(100, (num / 300) * 100);
            return {
                keyword,
                marketplace: 'lazada',
                search_volume: num,
                number_of_listings: products.length,
                competition_score: comp_score,
                price_range_min: price_min,
                price_range_max: price_max,
                demand_score: this.calculateDemandScore(num, price_max - price_min, comp_score),
            };
        }
        catch {
            return this.getMockValidation(keyword, 'lazada');
        }
    }
    // ─── Validate All ─────────────────────────────────────────────────────────────
    async validate(keyword) {
        const results = await Promise.allSettled([
            this.validateShopee(keyword),
            this.validateTokopedia(keyword),
            this.validateLazada(keyword),
        ]);
        return results
            .filter((r) => r.status === 'fulfilled')
            .map((r) => r.value);
    }
    async validateBatch(keywords) {
        logger_1.default.info(`[MarketplaceValidator] Validating ${keywords.length} keywords...`);
        const all = [];
        for (const kw of keywords) {
            try {
                const results = await this.validate(kw);
                all.push(...results);
            }
            catch (err) {
                logger_1.default.error(`[MarketplaceValidator] Failed for keyword "${kw}": ${err.message}`);
            }
        }
        logger_1.default.info(`[MarketplaceValidator] Done — ${all.length} validations`);
        return all;
    }
    // ─── Mock Data ────────────────────────────────────────────────────────────────
    getMockValidation(keyword, marketplace) {
        const base = {
            shopee: { vol: 45000, listings: 280, price_min: 45000, price_max: 385000 },
            tokopedia: { vol: 62000, listings: 410, price_min: 50000, price_max: 420000 },
            lazada: { vol: 31000, listings: 190, price_min: 55000, price_max: 450000 },
        }[marketplace];
        const jitter = () => 0.8 + Math.random() * 0.4;
        const sv = Math.floor(base.vol * jitter());
        const nl = Math.floor(base.listings * jitter());
        const pmin = Math.floor(base.price_min * jitter());
        const pmax = Math.floor(base.price_max * jitter());
        const comp_score = Math.min(100, (nl / 400) * 100);
        return {
            keyword,
            marketplace,
            search_volume: sv,
            number_of_listings: nl,
            competition_score: comp_score,
            price_range_min: pmin,
            price_range_max: pmax,
            demand_score: this.calculateDemandScore(sv, pmax - pmin, comp_score),
        };
    }
}
exports.MarketplaceDemandValidator = MarketplaceDemandValidator;
//# sourceMappingURL=MarketplaceDemandValidator.js.map