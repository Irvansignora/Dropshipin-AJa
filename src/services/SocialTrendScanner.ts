// src/services/SocialTrendScanner.ts
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { TrendSignal, PlatformSignals, Platform, TrendStage } from '../types/trend.types';
import { config } from '../config';
import logger from '../utils/logger';

export class SocialTrendScanner {

  // ─── Virality Score Formula ───────────────────────────────────────────────────

  calculateViralityScore(s: PlatformSignals): number {
    const score =
      s.view_growth_rate * 0.4 +
      s.engagement_ratio * 0.3 +
      s.hashtag_growth   * 0.3;
    return Math.min(100, Math.max(0, score));
  }

  classifyTrendStage(score: number): TrendStage {
    if (score >= 75) return 'peak';
    if (score >= 45) return 'rising';
    return 'early';
  }

  private signalToTrendSignal(s: PlatformSignals): TrendSignal {
    const virality_score = this.calculateViralityScore(s);
    return {
      id: uuidv4(),
      keyword: s.keyword,
      platform: s.platform,
      virality_score,
      trend_stage: this.classifyTrendStage(virality_score),
      detected_at: new Date(),
    };
  }

  // ─── TikTok ───────────────────────────────────────────────────────────────────

  async scanTikTok(): Promise<TrendSignal[]> {
    try {
      const { rapidApiKey, rapidApiHost } = config.social.tiktok;
      if (!rapidApiKey) return this.getMockSignals('tiktok');

      const response = await axios.get('https://tiktok-scraper7.p.rapidapi.com/trending/hashtags', {
        headers: {
          'X-RapidAPI-Key': rapidApiKey,
          'X-RapidAPI-Host': rapidApiHost,
        },
        timeout: 15000,
      });

      const hashtags = response.data?.data || [];
      const signals: PlatformSignals[] = hashtags.slice(0, 30).map((h: any) => {
        const views       = h.videoCount || 1;
        const likes       = h.stats?.diggCount || 0;
        const comments    = h.stats?.commentCount || 0;
        const growth      = Math.min(100, ((h.stats?.videoCount || 0) / 1000) * 100);
        const eng_ratio   = Math.min(100, ((likes + comments) / Math.max(views, 1)) * 10000);
        const hash_growth = Math.min(100, (h.stats?.shareCount || 0) / 100);

        return {
          keyword: h.challengeName || h.title,
          platform: 'tiktok',
          view_growth_rate: growth,
          engagement_ratio: eng_ratio,
          hashtag_growth: hash_growth,
          raw_views: views,
          raw_likes: likes,
          raw_comments: comments,
        } satisfies PlatformSignals;
      });

      return signals.map((s) => this.signalToTrendSignal(s));
    } catch (err: any) {
      logger.warn(`TikTok scan failed: ${err.message} — using mock data`);
      return this.getMockSignals('tiktok');
    }
  }

  // ─── Instagram ────────────────────────────────────────────────────────────────

  async scanInstagram(): Promise<TrendSignal[]> {
    try {
      const { rapidApiKey, rapidApiHost } = config.social.instagram;
      if (!rapidApiKey) return this.getMockSignals('instagram');

      const trendingTopics = [
        'aesthetic products', 'viral gadgets', 'mini projector', 'led strip',
        'portable blender', 'magnetic wallet', 'wireless charger', 'smart watch',
      ];

      const allSignals: PlatformSignals[] = [];

      for (const topic of trendingTopics.slice(0, 5)) {
        const response = await axios.get('https://instagram-scraper-api2.p.rapidapi.com/v1/hashtag', {
          params: { hashtag: topic.replace(' ', '') },
          headers: {
            'X-RapidAPI-Key': rapidApiKey,
            'X-RapidAPI-Host': rapidApiHost,
          },
          timeout: 10000,
        });

        const data = response.data?.data;
        if (!data) continue;

        const mediaCount   = data.media_count || 0;
        const growth       = Math.min(100, (mediaCount / 500000) * 100);
        const recentPosts  = data.edge_hashtag_to_media?.edges || [];
        const totalLikes   = recentPosts.reduce((s: number, e: any) => s + (e.node?.edge_liked_by?.count || 0), 0);
        const totalViews   = recentPosts.reduce((s: number, e: any) => s + (e.node?.edge_media_to_comment?.count || 0), 0);
        const eng_ratio    = Math.min(100, (totalLikes / Math.max(totalViews, 1)) * 100);

        allSignals.push({
          keyword: topic,
          platform: 'instagram',
          view_growth_rate: growth,
          engagement_ratio: eng_ratio,
          hashtag_growth: Math.min(100, mediaCount / 10000),
        });
      }

      return allSignals.map((s) => this.signalToTrendSignal(s));
    } catch (err: any) {
      logger.warn(`Instagram scan failed: ${err.message} — using mock data`);
      return this.getMockSignals('instagram');
    }
  }

  // ─── YouTube ──────────────────────────────────────────────────────────────────

  async scanYouTube(): Promise<TrendSignal[]> {
    try {
      const { apiKey } = config.social.youtube;
      if (!apiKey) return this.getMockSignals('youtube');

      const searchTerms = [
        'viral product review', 'must have gadget 2025', 'aliexpress finds',
        'temu products', 'aesthetic room decor haul',
      ];

      const allSignals: PlatformSignals[] = [];

      for (const term of searchTerms) {
        const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
          params: {
            key: apiKey,
            q: term,
            part: 'snippet,statistics',
            type: 'video',
            order: 'viewCount',
            publishedAfter: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
            maxResults: 5,
          },
          timeout: 10000,
        });

        const videos = response.data?.items || [];
        for (const video of videos) {
          const stats       = video.statistics || {};
          const viewCount   = parseInt(stats.viewCount || '0', 10);
          const likeCount   = parseInt(stats.likeCount || '0', 10);
          const commentCount = parseInt(stats.commentCount || '0', 10);
          const growth      = Math.min(100, (viewCount / 100000) * 100);
          const eng_ratio   = Math.min(100, ((likeCount + commentCount) / Math.max(viewCount, 1)) * 1000);

          // Extract product keywords from title
          const title = video.snippet?.title || term;
          allSignals.push({
            keyword: this.extractProductKeyword(title) || term,
            platform: 'youtube',
            view_growth_rate: growth,
            engagement_ratio: eng_ratio,
            hashtag_growth: Math.min(100, (likeCount / 1000)),
            raw_views: viewCount,
            raw_likes: likeCount,
            raw_comments: commentCount,
          });
        }
      }

      return allSignals.map((s) => this.signalToTrendSignal(s));
    } catch (err: any) {
      logger.warn(`YouTube scan failed: ${err.message} — using mock data`);
      return this.getMockSignals('youtube');
    }
  }

  // ─── Pinterest ────────────────────────────────────────────────────────────────

  async scanPinterest(): Promise<TrendSignal[]> {
    try {
      const { rapidApiKey, rapidApiHost } = config.social.pinterest;
      if (!rapidApiKey) return this.getMockSignals('pinterest');

      const trendingQueries = [
        'aesthetic products', 'room decor ideas', 'minimalist gadgets',
        'useful gifts', 'viral tiktok products',
      ];

      const allSignals: PlatformSignals[] = [];

      for (const q of trendingQueries.slice(0, 4)) {
        const response = await axios.get('https://pinterest-scraper1.p.rapidapi.com/search/pins', {
          params: { query: q, limit: '10' },
          headers: {
            'X-RapidAPI-Key': rapidApiKey,
            'X-RapidAPI-Host': rapidApiHost,
          },
          timeout: 10000,
        });

        const pins = response.data?.data || [];
        const totalSaves   = pins.reduce((s: number, p: any) => s + (p.aggregated_pin_data?.saves || 0), 0);
        const totalReacts  = pins.reduce((s: number, p: any) => s + (p.aggregated_pin_data?.done_count || 0), 0);
        const growth       = Math.min(100, (totalSaves / 10000) * 100);
        const eng_ratio    = Math.min(100, (totalReacts / Math.max(totalSaves, 1)) * 100);

        allSignals.push({
          keyword: q,
          platform: 'pinterest',
          view_growth_rate: growth,
          engagement_ratio: eng_ratio,
          hashtag_growth: Math.min(100, totalSaves / 500),
        });
      }

      return allSignals.map((s) => this.signalToTrendSignal(s));
    } catch (err: any) {
      logger.warn(`Pinterest scan failed: ${err.message} — using mock data`);
      return this.getMockSignals('pinterest');
    }
  }

  // ─── Scan All ────────────────────────────────────────────────────────────────

  async scanAll(): Promise<TrendSignal[]> {
    logger.info('[SocialScanner] Scanning all platforms...');
    const results = await Promise.allSettled([
      this.scanTikTok(),
      this.scanInstagram(),
      this.scanYouTube(),
      this.scanPinterest(),
    ]);

    const signals: TrendSignal[] = [];
    const labels: Platform[] = ['tiktok', 'instagram', 'youtube', 'pinterest'];

    results.forEach((result, i) => {
      if (result.status === 'fulfilled') {
        signals.push(...result.value);
        logger.info(`[SocialScanner] ${labels[i]}: ${result.value.length} signals`);
      } else {
        logger.error(`[SocialScanner] ${labels[i]} failed: ${result.reason}`);
      }
    });

    logger.info(`[SocialScanner] Total signals: ${signals.length}`);
    return signals;
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private extractProductKeyword(title: string): string {
    // Strip common non-keyword words and extract product terms
    const cleaned = title
      .replace(/[^\w\s]/gi, ' ')
      .replace(/\b(review|best|top|cheap|amazing|viral|must|have|buy|2024|2025|haul)\b/gi, '')
      .trim()
      .split(/\s+/)
      .slice(0, 4)
      .join(' ')
      .toLowerCase();
    return cleaned || title.slice(0, 40);
  }

  // ─── Mock Data (for development without API keys) ────────────────────────────

  private getMockSignals(platform: Platform): TrendSignal[] {
    const mockProducts = [
      { keyword: 'mini led projector',    vgr: 85, er: 72, hg: 68 },
      { keyword: 'magnetic phone wallet', vgr: 92, er: 81, hg: 75 },
      { keyword: 'portable blender',      vgr: 78, er: 65, hg: 71 },
      { keyword: 'smart led strip',       vgr: 88, er: 77, hg: 82 },
      { keyword: 'wireless earbuds',      vgr: 95, er: 89, hg: 91 },
      { keyword: 'car phone mount',       vgr: 70, er: 58, hg: 63 },
      { keyword: 'desk organizer',        vgr: 62, er: 55, hg: 59 },
      { keyword: 'face mask sheet',       vgr: 74, er: 68, hg: 70 },
      { keyword: 'reusable straw set',    vgr: 55, er: 62, hg: 48 },
      { keyword: 'galaxy projector lamp', vgr: 80, er: 73, hg: 77 },
    ];

    return mockProducts.map((p) => {
      const signals: PlatformSignals = {
        keyword: p.keyword,
        platform,
        view_growth_rate: p.vgr + (Math.random() * 10 - 5),
        engagement_ratio: p.er  + (Math.random() * 10 - 5),
        hashtag_growth:   p.hg  + (Math.random() * 10 - 5),
      };
      return this.signalToTrendSignal(signals);
    });
  }
}
