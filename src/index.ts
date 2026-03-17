// src/index.ts
import 'dotenv/config';
import express        from 'express';
import cors           from 'cors';
import path           from 'path';
import { config }     from './config';
import { testConnection } from './db/connection';
import { runMigrations }  from './db/migrate';
import trendsRouter       from './routes/trends';
import logger             from './utils/logger';
import fs                 from 'fs';

// Ensure logs directory exists
if (!fs.existsSync('logs')) fs.mkdirSync('logs');

const app = express();

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, _res, next) => {
  logger.debug(`${req.method} ${req.path}`);
  next();
});

// ─── Static Files (Trend Radar Dashboard) ────────────────────────────────────

const dashboardPath = path.join(__dirname, '../public');
if (fs.existsSync(dashboardPath)) {
  app.use(express.static(dashboardPath));
  app.get('/', (_req, res) => res.sendFile(path.join(dashboardPath, 'index.html')));
}

// ─── API Routes ───────────────────────────────────────────────────────────────

app.use('/api/trends', trendsRouter);

// Setup endpoint — migrate + seed tanpa perlu shell
// Akses sekali: https://your-app.up.railway.app/setup?token=arbitrade2025
app.get('/setup', async (req, res) => {
  const token = req.query.token;
  if (token !== 'arbitrade2025') {
    return res.status(401).json({ error: 'Invalid token. Add ?token=arbitrade2025' });
  }
  try {
    logger.info('[Setup] Running migrations...');
    await runMigrations();

    logger.info('[Setup] Running seed...');
    // inline seed — import dynamically to avoid top-level execution
    const { pool } = await import('./db/connection');
    const { TrendRepository } = await import('./db/repositories/TrendRepository');
    const { v4: uuidv4 } = await import('uuid');

    const client = await pool.connect();
    try {
      await client.query('TRUNCATE trend_signals, trend_market_validation, trend_supplier_analysis, trend_forecasts, trend_opportunities CASCADE');
    } catch { /* tables might be empty */ }
    finally { client.release(); }

    const repo = new TrendRepository();
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
      { keyword: 'hydrogel screen protector', virality: 61, demand: 88, buy: 8000, sell: 35000   },
      { keyword: 'portable neck fan',       virality: 83, demand: 78, buy: 78000,   sell: 240000  },
      { keyword: 'led gaming keyboard',     virality: 80, demand: 82, buy: 185000,  sell: 520000  },
      { keyword: 'smart water bottle',      virality: 72, demand: 74, buy: 95000,   sell: 290000  },
      { keyword: 'acne patch set',          virality: 87, demand: 83, buy: 12000,   sell: 55000   },
      { keyword: 'bamboo charging stand',   virality: 68, demand: 72, buy: 65000,   sell: 210000  },
      { keyword: 'foldable fan bracelet',   virality: 77, demand: 65, buy: 22000,   sell: 80000   },
      { keyword: 'resin coaster kit',       virality: 63, demand: 67, buy: 45000,   sell: 150000  },
      { keyword: 'digital alarm clock',     virality: 58, demand: 76, buy: 75000,   sell: 215000  },
      { keyword: 'floating shelf bracket',  virality: 55, demand: 80, buy: 38000,   sell: 120000  },
    ];
    const platforms  = ['tiktok','instagram','youtube','pinterest'] as const;
    const markets    = ['shopee','tokopedia','lazada'] as const;
    const suppliers  = ['1688','alibaba','aliexpress','taobao'] as const;

    const signals: any[] = products.flatMap(p => platforms.map(platform => {
      const j = () => 1 + (Math.random() * 0.2 - 0.1);
      const v = Math.min(100, p.virality * j());
      return { id: uuidv4(), keyword: p.keyword, platform, virality_score: v,
        trend_stage: v >= 80 ? 'peak' : v >= 60 ? 'rising' : 'early', detected_at: new Date() };
    }));
    await repo.bulkInsertSignals(signals);

    const validations: any[] = products.flatMap(p => markets.map(marketplace => {
      const j = () => 0.85 + Math.random() * 0.3;
      const sv = Math.floor(30000 * j() * (p.demand / 100));
      const nl = Math.floor(200 * j());
      const pmin = Math.floor(p.sell * 0.75 * j());
      const pmax = Math.floor(p.sell * 1.25 * j());
      const comp = Math.min(95, (nl / 300) * 100);
      const demand = Math.min(100, (sv/500)*0.5*100 + ((pmax-pmin)/200000)*0.3*100 + (100-comp)*0.2);
      return { keyword: p.keyword, marketplace, search_volume: sv, number_of_listings: nl,
        competition_score: comp, price_range_min: pmin, price_range_max: pmax, demand_score: demand };
    }));
    await repo.bulkInsertValidations(validations);

    const supplierData: any[] = products.flatMap(p => suppliers.map(supplier_platform => {
      const j = () => 0.9 + Math.random() * 0.2;
      const avg_price = p.buy * j();
      const stock = Math.floor(3000 + Math.random() * 10000);
      const rating = 3.8 + Math.random() * 1.2;
      const ship = supplier_platform === '1688' ? 7 : supplier_platform === 'aliexpress' ? 14 : supplier_platform === 'alibaba' ? 21 : 10;
      const score = Math.max(0,100-(avg_price/500000)*100)*0.35 + Math.min(100,(stock/5000)*100)*0.25 + (rating/5)*100*0.25 + Math.max(0,100-(ship/30)*100)*0.15;
      return { keyword: p.keyword, supplier_platform, avg_price, stock_level: stock, rating, shipping_time: ship, supplier_feasibility_score: score };
    }));
    await repo.bulkInsertSupplierAnalysis(supplierData);

    const forecasts: any[] = [];
    for (const p of products) {
      const marginPct = ((p.sell - p.buy) / p.sell) * 100;
      const daily = Math.max(1, Math.round((p.virality/100) * (p.demand/100) * 150));
      const kSignals = signals.filter(s => s.keyword === p.keyword);
      const kMarkets = validations.filter(v => v.keyword === p.keyword);
      const kSupp    = supplierData.filter(s => s.keyword === p.keyword);
      const virality = kSignals.reduce((a,x) => a + x.virality_score, 0) / Math.max(kSignals.length,1);
      const demand   = kMarkets.reduce((a,x) => a + x.demand_score, 0) / Math.max(kMarkets.length,1);
      const comp     = kMarkets.reduce((a,x) => a + x.competition_score, 0) / Math.max(kMarkets.length,1);
      const suppFeas = kSupp.reduce((a,x) => a + x.supplier_feasibility_score, 0) / Math.max(kSupp.length,1);
      const score    = virality*0.35 + demand*0.30 + marginPct*0.25 + suppFeas*0.10;
      const stage    = p.virality >= 80 ? 'peak' : p.virality >= 65 ? 'rising' : 'early';
      const forecast = { keyword: p.keyword, predicted_daily_sales: daily,
        estimated_monthly_profit: daily*30*(p.sell-p.buy)*0.7, trend_lifespan_days: stage==='peak'?30:stage==='rising'?60:90 };
      forecasts.push(forecast);
      await repo.upsertOpportunity({ keyword: p.keyword, trend_opportunity_score: score,
        virality_score: virality, demand_score: demand, margin_potential: marginPct,
        supplier_feasibility_score: suppFeas, competition_score: comp,
        avg_buy_price: p.buy, avg_sell_price: p.sell, trend_stage: stage,
        top_platform: 'tiktok', auto_pushed: score>85 && marginPct>25 && comp<60, forecast });
    }
    await repo.bulkInsertForecasts(forecasts);

    res.json({ success: true, message: `✅ Setup complete! ${signals.length} signals, ${validations.length} validations, ${supplierData.length} supplier records, ${forecasts.length} forecasts inserted.` });
  } catch (err: any) {
    logger.error('[Setup] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});


app.get('/health', async (_req, res) => {
  const geminiEnabled = !!config.gemini.apiKey;
  res.json({
    status:          'ok',
    service:         'TrendHunterEngine',
    version:         '1.0.0',
    forecast_mode:   geminiEnabled ? 'gemini-ai' : 'heuristic',
    gemini_enabled:  geminiEnabled,
    timestamp:       new Date().toISOString(),
  });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// Error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ success: false, error: err.message });
});

// ─── Startup ─────────────────────────────────────────────────────────────────

async function start() {
  logger.info('🚀 TrendHunterEngine starting...');

  // Test DB
  const dbOk = await testConnection();
  if (!dbOk) {
    logger.error('Cannot connect to database — check DATABASE_URL in .env');
    process.exit(1);
  }

  // Run migrations
  await runMigrations();

  // Start server
  app.listen(config.server.port, () => {
    const geminiEnabled = !!config.gemini.apiKey;
    logger.info(`✅ Server running on http://localhost:${config.server.port}`);
    logger.info(`📊 Trend Radar dashboard: http://localhost:${config.server.port}`);
    logger.info(`🤖 Forecast mode: ${geminiEnabled ? '✨ Gemini AI' : '📐 Heuristic (set GEMINI_API_KEY to enable AI)'}`);
    logger.info(`🔗 API base: http://localhost:${config.server.port}/api/trends`);
    logger.info('');
    logger.info('Available endpoints:');
    logger.info('  GET  /api/trends/top20');
    logger.info('  GET  /api/trends/signals');
    logger.info('  GET  /api/trends/validations');
    logger.info('  GET  /api/trends/suppliers');
    logger.info('  GET  /api/trends/stats');
    logger.info('  GET  /api/trends/keyword/:keyword');
    logger.info('  GET  /api/trends/queue/status');
    logger.info('  POST /api/trends/trigger/scan');
    logger.info('  POST /api/trends/trigger/validate');
    logger.info('  POST /api/trends/trigger/suppliers');
    logger.info('  POST /api/trends/trigger/top20');
    logger.info('  POST /api/trends/trigger/pipeline');
    logger.info('  POST /api/trends/launch');
    logger.info('');
    logger.info('💡 Run worker separately: npm run worker');
  });
}

start().catch((err) => {
  logger.error('Fatal startup error:', err);
  process.exit(1);
});

export default app;
