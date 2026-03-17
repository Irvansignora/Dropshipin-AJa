// src/config/index.ts
import dotenv from 'dotenv';
dotenv.config();

export const config = {
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    env: process.env.NODE_ENV || 'development',
  },

  db: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/arbitrade',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'arbitrade',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    ssl: process.env.NODE_ENV === 'production',
  },

  redis: {
    // Railway provides REDIS_URL as a full connection string
    url:      process.env.REDIS_URL || undefined,
    host:     process.env.REDIS_HOST || 'localhost',
    port:     parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },

  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '', // optional — falls back to heuristic forecast
  },

  social: {
    tiktok: {
      rapidApiKey: process.env.TIKTOK_RAPIDAPI_KEY || '',
      rapidApiHost: process.env.TIKTOK_RAPIDAPI_HOST || 'tiktok-scraper7.p.rapidapi.com',
    },
    instagram: {
      rapidApiKey: process.env.INSTAGRAM_RAPIDAPI_KEY || '',
      rapidApiHost: process.env.INSTAGRAM_RAPIDAPI_HOST || 'instagram-scraper-api2.p.rapidapi.com',
    },
    youtube: {
      apiKey: process.env.YOUTUBE_API_KEY || '',
    },
    pinterest: {
      rapidApiKey: process.env.PINTEREST_RAPIDAPI_KEY || '',
      rapidApiHost: process.env.PINTEREST_RAPIDAPI_HOST || 'pinterest-scraper1.p.rapidapi.com',
    },
  },

  marketplace: {
    shopee: {
      partnerId: process.env.SHOPEE_PARTNER_ID || '',
      apiKey: process.env.SHOPEE_API_KEY || '',
      baseUrl: process.env.SHOPEE_API_BASE || 'https://partner.shopeemobile.com',
    },
    tokopedia: {
      clientId: process.env.TOKOPEDIA_CLIENT_ID || '',
      clientSecret: process.env.TOKOPEDIA_CLIENT_SECRET || '',
      baseUrl: process.env.TOKOPEDIA_API_BASE || 'https://fs.tokopedia.net',
    },
    lazada: {
      appKey: process.env.LAZADA_APP_KEY || '',
      appSecret: process.env.LAZADA_APP_SECRET || '',
      baseUrl: process.env.LAZADA_API_BASE || 'https://api.lazada.co.id/rest',
    },
  },

  supplier: {
    alibaba1688: {
      rapidApiKey: process.env.ALIBABA_1688_RAPIDAPI_KEY || '',
      rapidApiHost: process.env.ALIBABA_1688_RAPIDAPI_HOST || '1688-product-data.p.rapidapi.com',
    },
    aliexpress: {
      rapidApiKey: process.env.ALIEXPRESS_RAPIDAPI_KEY || '',
      rapidApiHost: process.env.ALIEXPRESS_RAPIDAPI_HOST || 'aliexpress-datahub.p.rapidapi.com',
    },
    alibaba: {
      appKey: process.env.ALIBABA_APP_KEY || '',
      appSecret: process.env.ALIBABA_APP_SECRET || '',
    },
  },

  scoring: {
    trendScoreThreshold: parseFloat(process.env.TREND_SCORE_THRESHOLD || '85'),
    marginThresholdPct: parseFloat(process.env.MARGIN_THRESHOLD_PCT || '25'),
    competitionThreshold: parseFloat(process.env.COMPETITION_THRESHOLD || '60'),
    topN: parseInt(process.env.TOP_N_OPPORTUNITIES || '20', 10),
  },

  schedule: {
    socialScanIntervalMs: parseInt(process.env.SOCIAL_SCAN_INTERVAL_MS || '7200000', 10),
    marketplaceValidationIntervalMs: parseInt(process.env.MARKETPLACE_VALIDATION_INTERVAL_MS || '21600000', 10),
    supplierAnalysisIntervalMs: parseInt(process.env.SUPPLIER_ANALYSIS_INTERVAL_MS || '43200000', 10),
    dailyTop20Cron: process.env.DAILY_TOP20_CRON || '0 6 * * *',
  },
};
