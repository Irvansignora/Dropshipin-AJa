"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runMigrations = runMigrations;
// src/db/migrate.ts
const connection_1 = require("./connection");
const logger_1 = __importDefault(require("../utils/logger"));
const migrations = [
    {
        name: '001_create_trend_signals',
        sql: `
      CREATE TABLE IF NOT EXISTS trend_signals (
        id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        keyword         VARCHAR(255) NOT NULL,
        platform        VARCHAR(50)  NOT NULL CHECK (platform IN ('tiktok','instagram','youtube','pinterest')),
        virality_score  DECIMAL(6,2) NOT NULL DEFAULT 0,
        trend_stage     VARCHAR(20)  NOT NULL CHECK (trend_stage IN ('early','rising','peak')),
        detected_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_trend_signals_keyword     ON trend_signals(keyword);
      CREATE INDEX IF NOT EXISTS idx_trend_signals_platform    ON trend_signals(platform);
      CREATE INDEX IF NOT EXISTS idx_trend_signals_detected_at ON trend_signals(detected_at DESC);
      CREATE INDEX IF NOT EXISTS idx_trend_signals_score       ON trend_signals(virality_score DESC);
    `,
    },
    {
        name: '002_create_trend_market_validation',
        sql: `
      CREATE TABLE IF NOT EXISTS trend_market_validation (
        id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        keyword             VARCHAR(255) NOT NULL,
        marketplace         VARCHAR(50)  NOT NULL CHECK (marketplace IN ('shopee','tokopedia','lazada')),
        search_volume       INTEGER      NOT NULL DEFAULT 0,
        number_of_listings  INTEGER      NOT NULL DEFAULT 0,
        competition_score   DECIMAL(6,2) NOT NULL DEFAULT 0,
        price_range_min     DECIMAL(14,2) NOT NULL DEFAULT 0,
        price_range_max     DECIMAL(14,2) NOT NULL DEFAULT 0,
        demand_score        DECIMAL(6,2)  NOT NULL DEFAULT 0,
        validated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_tmv_keyword     ON trend_market_validation(keyword);
      CREATE INDEX IF NOT EXISTS idx_tmv_marketplace ON trend_market_validation(marketplace);
      CREATE INDEX IF NOT EXISTS idx_tmv_demand      ON trend_market_validation(demand_score DESC);
      CREATE INDEX IF NOT EXISTS idx_tmv_validated   ON trend_market_validation(validated_at DESC);
    `,
    },
    {
        name: '003_create_trend_supplier_analysis',
        sql: `
      CREATE TABLE IF NOT EXISTS trend_supplier_analysis (
        id                         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        keyword                    VARCHAR(255) NOT NULL,
        supplier_platform          VARCHAR(50)  NOT NULL CHECK (supplier_platform IN ('1688','alibaba','aliexpress','taobao')),
        avg_price                  DECIMAL(14,2) NOT NULL DEFAULT 0,
        stock_level                INTEGER       NOT NULL DEFAULT 0,
        rating                     DECIMAL(4,2)  NOT NULL DEFAULT 0,
        shipping_time              INTEGER       NOT NULL DEFAULT 0,
        supplier_feasibility_score DECIMAL(6,2)  NOT NULL DEFAULT 0,
        analyzed_at                TIMESTAMPTZ   NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_tsa_keyword  ON trend_supplier_analysis(keyword);
      CREATE INDEX IF NOT EXISTS idx_tsa_platform ON trend_supplier_analysis(supplier_platform);
      CREATE INDEX IF NOT EXISTS idx_tsa_score    ON trend_supplier_analysis(supplier_feasibility_score DESC);
    `,
    },
    {
        name: '004_create_trend_forecasts',
        sql: `
      CREATE TABLE IF NOT EXISTS trend_forecasts (
        id                       UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        keyword                  VARCHAR(255) NOT NULL,
        predicted_daily_sales    INTEGER      NOT NULL DEFAULT 0,
        estimated_monthly_profit DECIMAL(14,2) NOT NULL DEFAULT 0,
        trend_lifespan_days      INTEGER      NOT NULL DEFAULT 0,
        forecasted_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_tf_keyword     ON trend_forecasts(keyword);
      CREATE INDEX IF NOT EXISTS idx_tf_forecasted  ON trend_forecasts(forecasted_at DESC);
    `,
    },
    {
        name: '005_create_trend_opportunities',
        sql: `
      CREATE TABLE IF NOT EXISTS trend_opportunities (
        id                         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        keyword                    VARCHAR(255) NOT NULL,
        trend_opportunity_score    DECIMAL(6,2) NOT NULL DEFAULT 0,
        virality_score             DECIMAL(6,2) NOT NULL DEFAULT 0,
        demand_score               DECIMAL(6,2) NOT NULL DEFAULT 0,
        margin_potential           DECIMAL(6,2) NOT NULL DEFAULT 0,
        supplier_feasibility_score DECIMAL(6,2) NOT NULL DEFAULT 0,
        competition_score          DECIMAL(6,2) NOT NULL DEFAULT 0,
        avg_buy_price              DECIMAL(14,2) NOT NULL DEFAULT 0,
        avg_sell_price             DECIMAL(14,2) NOT NULL DEFAULT 0,
        trend_stage                VARCHAR(20)  NOT NULL DEFAULT 'early',
        top_platform               VARCHAR(50)  NOT NULL DEFAULT 'tiktok',
        auto_pushed                BOOLEAN      NOT NULL DEFAULT FALSE,
        created_at                 TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_to_score      ON trend_opportunities(trend_opportunity_score DESC);
      CREATE INDEX IF NOT EXISTS idx_to_created    ON trend_opportunities(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_to_keyword    ON trend_opportunities(keyword);
    `,
    },
    {
        name: '006_create_migrations_table',
        sql: `
      CREATE TABLE IF NOT EXISTS _migrations (
        id         SERIAL PRIMARY KEY,
        name       VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `,
    },
];
async function runMigrations() {
    const client = await connection_1.pool.connect();
    try {
        // ensure _migrations table exists first
        await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id         SERIAL PRIMARY KEY,
        name       VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
        for (const migration of migrations) {
            const exists = await client.query('SELECT 1 FROM _migrations WHERE name = $1', [migration.name]);
            if (exists.rowCount && exists.rowCount > 0) {
                logger_1.default.info(`Migration already applied: ${migration.name}`);
                continue;
            }
            logger_1.default.info(`Running migration: ${migration.name}`);
            await client.query('BEGIN');
            try {
                await client.query(migration.sql);
                await client.query('INSERT INTO _migrations (name) VALUES ($1)', [migration.name]);
                await client.query('COMMIT');
                logger_1.default.info(`✅ Migration complete: ${migration.name}`);
            }
            catch (err) {
                await client.query('ROLLBACK');
                throw new Error(`Migration failed (${migration.name}): ${err.message}`);
            }
        }
        logger_1.default.info('✅ All migrations applied');
    }
    finally {
        client.release();
    }
}
// Run directly: tsx src/db/migrate.ts
if (require.main === module) {
    runMigrations()
        .then(() => process.exit(0))
        .catch((err) => {
        logger_1.default.error(err.message);
        process.exit(1);
    });
}
//# sourceMappingURL=migrate.js.map