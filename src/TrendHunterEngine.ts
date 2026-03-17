// src/TrendHunterEngine.ts
import { SocialTrendScanner }          from './services/SocialTrendScanner';
import { MarketplaceDemandValidator }   from './services/MarketplaceDemandValidator';
import { SupplierFeasibilityAnalyzer }  from './services/SupplierFeasibilityAnalyzer';
import { AIOpportunityScorer }          from './services/AIOpportunityScorer';
import { TrendRepository }              from './db/repositories/TrendRepository';
import { TrendOpportunity }             from './types/trend.types';
import { config }                       from './config';
import logger                           from './utils/logger';

export class TrendHunterEngine {
  private scanner    = new SocialTrendScanner();
  private validator  = new MarketplaceDemandValidator();
  private supplier   = new SupplierFeasibilityAnalyzer();
  private scorer     = new AIOpportunityScorer();
  private repo       = new TrendRepository();

  // ─── Step 1: Social Scan (every 2h) ──────────────────────────────────────────

  async runSocialScan(): Promise<void> {
    logger.info('[TrendHunter] ▶ Social scan starting...');
    const start   = Date.now();
    const signals = await this.scanner.scanAll();
    await this.repo.bulkInsertSignals(signals);
    logger.info(`[TrendHunter] ✅ Social scan done — ${signals.length} signals in ${Date.now() - start}ms`);
  }

  // ─── Step 2: Marketplace Validation (every 6h) ────────────────────────────────

  async runMarketplaceValidation(): Promise<void> {
    logger.info('[TrendHunter] ▶ Marketplace validation starting...');
    const start    = Date.now();
    const keywords = await this.repo.getRecentKeywords(48);

    if (!keywords.length) {
      logger.info('[TrendHunter] No keywords to validate — run social scan first');
      return;
    }

    const validations = await this.validator.validateBatch(keywords);
    await this.repo.bulkInsertValidations(validations);
    logger.info(`[TrendHunter] ✅ Marketplace validation done — ${validations.length} records in ${Date.now() - start}ms`);
  }

  // ─── Step 3: Supplier Analysis (every 12h) ────────────────────────────────────

  async runSupplierAnalysis(): Promise<void> {
    logger.info('[TrendHunter] ▶ Supplier analysis starting...');
    const start    = Date.now();
    const keywords = await this.repo.getRecentKeywords(72);

    if (!keywords.length) {
      logger.info('[TrendHunter] No keywords for supplier analysis');
      return;
    }

    const analyses = await this.supplier.analyzeBatch(keywords);
    await this.repo.bulkInsertSupplierAnalysis(analyses);
    logger.info(`[TrendHunter] ✅ Supplier analysis done — ${analyses.length} records in ${Date.now() - start}ms`);
  }

  // ─── Step 4: Generate Top 20 (daily) ─────────────────────────────────────────

  async generateTop20(): Promise<TrendOpportunity[]> {
    logger.info('[TrendHunter] ▶ Generating Top 20 opportunities...');
    const start = Date.now();

    const [signals, validations, suppliers] = await Promise.all([
      this.repo.getRecentSignals(72),
      this.repo.getRecentValidations(72),
      this.repo.getRecentSupplierAnalysis(72),
    ]);

    if (!signals.length) {
      logger.warn('[TrendHunter] No signals found — returning empty top20');
      return [];
    }

    const all  = await this.scorer.score(signals, validations, suppliers);
    const top  = all.slice(0, config.scoring.topN);

    // Persist opportunities and forecasts
    for (const op of top) {
      await this.repo.upsertOpportunity(op);
    }
    await this.repo.bulkInsertForecasts(top.map((o) => o.forecast));

    const autoPushed = top.filter((o) => o.auto_pushed).length;
    logger.info(`[TrendHunter] ✅ Top ${top.length} generated (${autoPushed} auto-pushed) in ${Date.now() - start}ms`);
    return top;
  }

  // ─── Full Pipeline (run all steps in sequence) ────────────────────────────────

  async runFullPipeline(): Promise<TrendOpportunity[]> {
    logger.info('[TrendHunter] ⚡ Full pipeline starting...');
    await this.runSocialScan();
    await this.runMarketplaceValidation();
    await this.runSupplierAnalysis();
    const top = await this.generateTop20();
    logger.info('[TrendHunter] ⚡ Full pipeline complete');
    return top;
  }
}
