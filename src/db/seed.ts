// src/db/seed.ts
// Populates the DB with realistic mock data so you can test the dashboard
// without needing real API keys.
// Run: npm run seed

import 'dotenv/config';
import { v4 as uuidv4 }       from 'uuid';
import { pool }                from './connection';
import { runMigrations }       from './migrate';
import { TrendRepository }     from './repositories/TrendRepository';
import { TrendSignal, TrendMarketValidation, TrendSupplierAnalysis, TrendForecast } from '../types/trend.types';
import logger from '../utils/logger';

const products = [
  { keyword: 'mini led projector',      virality: 88, demand: 82, buy: 280000,  sell: 750000  },
  { keyword: 'magnetic phone wallet',   virality: 91, demand: 77, buy: 35000,   sell: 130000  },
  { keyword: 'portable blender',        virality: 79, demand: 84, buy: 120000,  sell: 380000  },
  { keyword: 'smart led strip',         virality: 85, demand: 90, buy: 55000,   sell: 185000  },
  { keyword: 'wireless earbuds case',   virality: 93, demand: 88, buy: 42000,   sell: 165000  },
  { keyword: 'galaxy projector lamp',   virality: 82, demand: 76, buy: 95000,   sell: 320000  },
  { keyword: 'desk cable organizer',    virality: 65, demand: 71, buy: 28000,   sell: 95000   },
  { keyword: 'silicone face mask',      virality: 74, demand: 68, buy: 18000,   sell: 72000   },
  { keyword: 'car phone holder',        virality: 70, demand: 85, buy: 32000,   sell: 110000  },
  { keyword: 'mini thermal printer',    virality: 86, demand: 79, buy: 210000,  sell: 620000  },
  { keyword: 'hydrogel screen protector', virality: 61, demand: 88, buy: 8000,  sell: 35000   },
  { keyword: 'foldable fan bracelet',   virality: 77, demand: 65, buy: 22000,   sell: 80000   },
  { keyword: 'led gaming keyboard',     virality: 80, demand: 82, buy: 185000,  sell: 520000  },
  { keyword: 'bamboo charging stand',   virality: 68, demand: 72, buy: 65000,   sell: 210000  },
  { keyword: 'portable neck fan',       virality: 83, demand: 78, buy: 78000,   sell: 240000  },
  { keyword: 'smart water bottle',      virality: 72, demand: 74, buy: 95000,   sell: 290000  },
  { keyword: 'acne patch set',          virality: 87, demand: 83, buy: 12000,   sell: 55000   },
  { keyword: 'resin coaster kit',       virality: 63, demand: 67, buy: 45000,   sell: 150000  },
  { keyword: 'digital alarm clock',     virality: 58, demand: 76, buy: 75000,   sell: 215000  },
  { keyword: 'floating shelf bracket',  virality: 55, demand: 80, buy: 38000,   sell: 120000  },
];

const platforms  = ['tiktok', 'instagram', 'youtube', 'pinterest'] as const;
const markets    = ['shopee', 'tokopedia', 'lazada'] as const;
const suppliers  = ['1688', 'alibaba', 'aliexpress', 'taobao'] as const;
const stages     = ['early', 'rising', 'peak'] as const;

async function seed() {
  logger.info('🌱 Seeding database...');
  await runMigrations();

  const repo = new TrendRepository();

  // Clear existing data
  const client = await pool.connect();
  try {
    await client.query('TRUNCATE trend_signals, trend_market_validation, trend_supplier_analysis, trend_forecasts, trend_opportunities CASCADE');
    logger.info('Existing data cleared');
  } finally {
    client.release();
  }

  // Generate signals
  const signals: TrendSignal[] = products.flatMap((p) =>
    platforms.map((platform) => {
      const jitter = () => 1 + (Math.random() * 0.2 - 0.1);
      const v = Math.min(100, p.virality * jitter());
      return {
        id: uuidv4(),
        keyword: p.keyword,
        platform,
        virality_score: v,
        trend_stage: v >= 80 ? 'peak' : v >= 60 ? 'rising' : 'early',
        detected_at: new Date(Date.now() - Math.random() * 12 * 60 * 60 * 1000),
      } as TrendSignal;
    }),
  );

  await repo.bulkInsertSignals(signals);
  logger.info(`✅ Inserted ${signals.length} signals`);

  // Generate market validations
  const validations: TrendMarketValidation[] = products.flatMap((p) =>
    markets.map((marketplace) => {
      const jitter   = () => 0.85 + Math.random() * 0.3;
      const sv       = Math.floor(30000 * jitter() * (p.demand / 100));
      const nl       = Math.floor(200 * jitter());
      const pmin     = Math.floor(p.sell * 0.75 * jitter());
      const pmax     = Math.floor(p.sell * 1.25 * jitter());
      const comp     = Math.min(95, (nl / 300) * 100);
      const demand   = Math.min(100, (sv / 500) * 0.5 * 100 + ((pmax - pmin) / 200000) * 0.3 * 100 + (100 - comp) * 0.2);
      return {
        keyword: p.keyword, marketplace, search_volume: sv,
        number_of_listings: nl, competition_score: comp,
        price_range_min: pmin, price_range_max: pmax, demand_score: demand,
      } as TrendMarketValidation;
    }),
  );

  await repo.bulkInsertValidations(validations);
  logger.info(`✅ Inserted ${validations.length} market validations`);

  // Generate supplier analyses
  const supplierData: TrendSupplierAnalysis[] = products.flatMap((p) =>
    suppliers.map((supplier_platform) => {
      const jitter      = () => 0.9 + Math.random() * 0.2;
      const avg_price   = p.buy * jitter();
      const stock       = Math.floor(3000 + Math.random() * 10000);
      const rating      = 3.8 + Math.random() * 1.2;
      const ship        = supplier_platform === '1688' ? 7 : supplier_platform === 'aliexpress' ? 14 : supplier_platform === 'alibaba' ? 21 : 10;
      const price_score    = Math.max(0, 100 - (avg_price / 500000) * 100);
      const stock_score    = Math.min(100, (stock / 5000) * 100);
      const rating_score   = (rating / 5) * 100;
      const shipping_score = Math.max(0, 100 - (ship / 30) * 100);
      const score = price_score * 0.35 + stock_score * 0.25 + rating_score * 0.25 + shipping_score * 0.15;
      return {
        keyword: p.keyword, supplier_platform, avg_price,
        stock_level: stock, rating, shipping_time: ship, supplier_feasibility_score: score,
      } as TrendSupplierAnalysis;
    }),
  );

  await repo.bulkInsertSupplierAnalysis(supplierData);
  logger.info(`✅ Inserted ${supplierData.length} supplier analyses`);

  // Generate forecasts + opportunities
  const forecasts: TrendForecast[] = [];
  for (const p of products) {
    const marginPct      = ((p.sell - p.buy) / p.sell) * 100;
    const daily          = Math.max(1, Math.round((p.virality / 100) * (p.demand / 100) * 150));
    const monthly_profit = daily * 30 * (p.sell - p.buy) * 0.7;
    const lifespan       = p.virality >= 85 ? 30 : p.virality >= 70 ? 60 : 90;

    const f: TrendForecast = {
      keyword: p.keyword,
      predicted_daily_sales: daily,
      estimated_monthly_profit: monthly_profit,
      trend_lifespan_days: lifespan,
    };
    forecasts.push(f);

    const kSignals  = signals.filter(s => s.keyword === p.keyword);
    const kMarkets  = validations.filter(v => v.keyword === p.keyword);
    const kSupplier = supplierData.filter(s => s.keyword === p.keyword);
    const virality  = kSignals.reduce((a, x)  => a + x.virality_score, 0) / Math.max(kSignals.length, 1);
    const demand    = kMarkets.reduce((a, x)  => a + x.demand_score, 0) / Math.max(kMarkets.length, 1);
    const comp      = kMarkets.reduce((a, x)  => a + x.competition_score, 0) / Math.max(kMarkets.length, 1);
    const suppFeas  = kSupplier.reduce((a, x) => a + x.supplier_feasibility_score, 0) / Math.max(kSupplier.length, 1);
    const score     = virality * 0.35 + demand * 0.30 + marginPct * 0.25 + suppFeas * 0.10;
    const stage     = p.virality >= 80 ? 'peak' : p.virality >= 65 ? 'rising' : 'early';

    await repo.upsertOpportunity({
      keyword: p.keyword,
      trend_opportunity_score: score,
      virality_score: virality,
      demand_score: demand,
      margin_potential: marginPct,
      supplier_feasibility_score: suppFeas,
      competition_score: comp,
      avg_buy_price: p.buy,
      avg_sell_price: p.sell,
      trend_stage: stage,
      top_platform: kSignals.sort((a, b) => b.virality_score - a.virality_score)[0]?.platform || 'tiktok',
      auto_pushed: score > 85 && marginPct > 25 && comp < 60,
      forecast: f,
    });
  }

  await repo.bulkInsertForecasts(forecasts);
  logger.info(`✅ Inserted ${forecasts.length} forecasts`);

  logger.info('🎉 Seed complete! Open http://localhost:3000 to view the dashboard.');
  await pool.end();
}

seed().catch((err) => {
  logger.error('Seed failed:', err);
  process.exit(1);
});
