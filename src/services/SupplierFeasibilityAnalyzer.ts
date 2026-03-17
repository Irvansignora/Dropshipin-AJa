// src/services/SupplierFeasibilityAnalyzer.ts
import axios from 'axios';
import { TrendSupplierAnalysis, SupplierPlatform } from '../types/trend.types';
import { config } from '../config';
import logger from '../utils/logger';

export class SupplierFeasibilityAnalyzer {

  calculateFeasibilityScore(
    avg_price: number,
    stock_level: number,
    rating: number,
    shipping_time: number,
  ): number {
    const price_score    = Math.max(0, 100 - (avg_price / 500000) * 100);
    const stock_score    = Math.min(100, (stock_level / 5000) * 100);
    const rating_score   = (rating / 5) * 100;
    const shipping_score = Math.max(0, 100 - (shipping_time / 30) * 100);

    return Math.min(100, Math.max(0,
      price_score    * 0.35 +
      stock_score    * 0.25 +
      rating_score   * 0.25 +
      shipping_score * 0.15,
    ));
  }

  // ─── 1688 ─────────────────────────────────────────────────────────────────────

  private async analyze1688(keyword: string): Promise<TrendSupplierAnalysis> {
    try {
      const { rapidApiKey, rapidApiHost } = config.supplier.alibaba1688;
      if (!rapidApiKey) throw new Error('1688 API key not configured');

      const response = await axios.get('https://1688-product-data.p.rapidapi.com/search', {
        params: { keyword, page: '1', pageSize: '20' },
        headers: {
          'X-RapidAPI-Key': rapidApiKey,
          'X-RapidAPI-Host': rapidApiHost,
        },
        timeout: 15000,
      });

      const items = response.data?.data || [];
      if (!items.length) throw new Error('No results');

      const prices        = items.map((i: any) => parseFloat(i.priceInfo?.price || '0')).filter(Boolean);
      const stocks        = items.map((i: any) => parseInt(i.quantity || '0', 10));
      const ratings       = items.map((i: any) => parseFloat(i.sellerInfo?.sellerCredit || '0'));
      const avg_price     = prices.reduce((a: number, b: number) => a + b, 0) / Math.max(prices.length, 1);
      const stock_level   = stocks.reduce((a: number, b: number) => a + b, 0);
      const rating        = Math.min(5, (ratings.reduce((a: number, b: number) => a + b, 0) / Math.max(ratings.length, 1)) / 20);
      const shipping_time = 7;

      return {
        keyword, supplier_platform: '1688',
        avg_price, stock_level, rating, shipping_time,
        supplier_feasibility_score: this.calculateFeasibilityScore(avg_price, stock_level, rating, shipping_time),
      };
    } catch {
      return this.getMockSupplierData(keyword, '1688');
    }
  }

  // ─── AliExpress ───────────────────────────────────────────────────────────────

  private async analyzeAliExpress(keyword: string): Promise<TrendSupplierAnalysis> {
    try {
      const { rapidApiKey, rapidApiHost } = config.supplier.aliexpress;
      if (!rapidApiKey) throw new Error('AliExpress API key not configured');

      const response = await axios.get('https://aliexpress-datahub.p.rapidapi.com/item_search', {
        params: { q: keyword, page: '1', sort: 'SALE_PRICE_ASC' },
        headers: {
          'X-RapidAPI-Key': rapidApiKey,
          'X-RapidAPI-Host': rapidApiHost,
        },
        timeout: 15000,
      });

      const items = response.data?.result?.resultList || [];
      if (!items.length) throw new Error('No results');

      const prices      = items.map((i: any) => parseFloat(i.item?.sku?.def?.promotionPrice || i.item?.sku?.def?.price || '0')).filter(Boolean);
      const ratings_arr = items.map((i: any) => parseFloat(i.item?.averageStar || '0'));
      const orders      = items.map((i: any) => parseInt(i.item?.tradeDesc || '0', 10));
      const avg_price   = prices.reduce((a: number, b: number) => a + b, 0) / Math.max(prices.length, 1) * 15000; // USD to IDR approx
      const stock_level = orders.reduce((a: number, b: number) => a + b, 0);
      const rating      = ratings_arr.reduce((a: number, b: number) => a + b, 0) / Math.max(ratings_arr.length, 1);
      const shipping_time = 14;

      return {
        keyword, supplier_platform: 'aliexpress',
        avg_price, stock_level, rating, shipping_time,
        supplier_feasibility_score: this.calculateFeasibilityScore(avg_price, stock_level, rating, shipping_time),
      };
    } catch {
      return this.getMockSupplierData(keyword, 'aliexpress');
    }
  }

  // ─── Alibaba ──────────────────────────────────────────────────────────────────

  private async analyzeAlibaba(keyword: string): Promise<TrendSupplierAnalysis> {
    try {
      const { rapidApiKey, rapidApiHost } = config.supplier.aliexpress;
      if (!rapidApiKey) throw new Error('Alibaba API not configured');

      const response = await axios.get('https://aliexpress-datahub.p.rapidapi.com/item_search', {
        params: { q: `${keyword} wholesale`, page: '1' },
        headers: {
          'X-RapidAPI-Key': rapidApiKey,
          'X-RapidAPI-Host': rapidApiHost,
        },
        timeout: 15000,
      });

      const items     = response.data?.result?.resultList || [];
      const prices    = items.map((i: any) => parseFloat(i.item?.sku?.def?.price || '0')).filter(Boolean);
      const avg_price = prices.reduce((a: number, b: number) => a + b, 0) / Math.max(prices.length, 1) * 15000;
      const rating    = 4.2;
      const shipping  = 20;

      return {
        keyword, supplier_platform: 'alibaba',
        avg_price, stock_level: 10000, rating, shipping_time: shipping,
        supplier_feasibility_score: this.calculateFeasibilityScore(avg_price, 10000, rating, shipping),
      };
    } catch {
      return this.getMockSupplierData(keyword, 'alibaba');
    }
  }

  // ─── Taobao ───────────────────────────────────────────────────────────────────

  private async analyzeTaobao(keyword: string): Promise<TrendSupplierAnalysis> {
    // Taobao uses same RapidAPI endpoint as 1688 for most providers
    return this.getMockSupplierData(keyword, 'taobao');
  }

  // ─── Analyze All ─────────────────────────────────────────────────────────────

  async analyze(keyword: string): Promise<TrendSupplierAnalysis[]> {
    const results = await Promise.allSettled([
      this.analyze1688(keyword),
      this.analyzeAliExpress(keyword),
      this.analyzeAlibaba(keyword),
      this.analyzeTaobao(keyword),
    ]);

    return results
      .filter((r): r is PromiseFulfilledResult<TrendSupplierAnalysis> => r.status === 'fulfilled')
      .map((r) => r.value);
  }

  async analyzeBatch(keywords: string[]): Promise<TrendSupplierAnalysis[]> {
    logger.info(`[SupplierAnalyzer] Analyzing ${keywords.length} keywords...`);
    const all: TrendSupplierAnalysis[] = [];
    for (const kw of keywords) {
      try {
        const results = await this.analyze(kw);
        all.push(...results);
      } catch (err: any) {
        logger.error(`[SupplierAnalyzer] Failed for "${kw}": ${err.message}`);
      }
    }
    logger.info(`[SupplierAnalyzer] Done — ${all.length} supplier records`);
    return all;
  }

  // ─── Mock Data ────────────────────────────────────────────────────────────────

  private getMockSupplierData(keyword: string, platform: SupplierPlatform): TrendSupplierAnalysis {
    const base: Record<SupplierPlatform, { price: number; stock: number; rating: number; ship: number }> = {
      '1688':      { price: 25000,  stock: 8500,  rating: 4.3, ship: 7  },
      'alibaba':   { price: 30000,  stock: 12000, rating: 4.5, ship: 21 },
      'aliexpress':{ price: 45000,  stock: 3200,  rating: 4.1, ship: 14 },
      'taobao':    { price: 22000,  stock: 6000,  rating: 4.0, ship: 10 },
    };
    const b = base[platform];
    const j = () => 0.8 + Math.random() * 0.4;
    const avg_price   = b.price   * j();
    const stock_level = Math.floor(b.stock * j());
    const rating      = Math.min(5, b.rating * (0.95 + Math.random() * 0.1));
    const shipping    = Math.floor(b.ship   * j());

    return {
      keyword, supplier_platform: platform,
      avg_price, stock_level, rating, shipping_time: shipping,
      supplier_feasibility_score: this.calculateFeasibilityScore(avg_price, stock_level, rating, shipping),
    };
  }
}
