export type Platform = 'tiktok' | 'instagram' | 'youtube' | 'pinterest';
export type TrendStage = 'early' | 'rising' | 'peak';
export type Marketplace = 'shopee' | 'tokopedia' | 'lazada';
export type SupplierPlatform = '1688' | 'alibaba' | 'aliexpress' | 'taobao';
export interface TrendSignal {
    id: string;
    keyword: string;
    platform: Platform;
    virality_score: number;
    trend_stage: TrendStage;
    detected_at: Date;
}
export interface TrendMarketValidation {
    id?: string;
    keyword: string;
    marketplace: Marketplace;
    search_volume: number;
    number_of_listings: number;
    competition_score: number;
    price_range_min: number;
    price_range_max: number;
    demand_score: number;
    validated_at?: Date;
}
export interface TrendSupplierAnalysis {
    id?: string;
    keyword: string;
    supplier_platform: SupplierPlatform;
    avg_price: number;
    stock_level: number;
    rating: number;
    shipping_time: number;
    supplier_feasibility_score: number;
    analyzed_at?: Date;
}
export interface TrendForecast {
    id?: string;
    keyword: string;
    predicted_daily_sales: number;
    estimated_monthly_profit: number;
    trend_lifespan_days: number;
    forecasted_at?: Date;
}
export interface TrendOpportunity {
    keyword: string;
    trend_opportunity_score: number;
    virality_score: number;
    demand_score: number;
    margin_potential: number;
    supplier_feasibility_score: number;
    competition_score: number;
    avg_buy_price: number;
    avg_sell_price: number;
    trend_stage: TrendStage;
    top_platform: Platform;
    forecast: TrendForecast;
    auto_pushed: boolean;
}
export interface PlatformSignals {
    keyword: string;
    platform: Platform;
    view_growth_rate: number;
    engagement_ratio: number;
    hashtag_growth: number;
    raw_views?: number;
    raw_likes?: number;
    raw_comments?: number;
}
export interface SocialScanJobData {
    platforms?: Platform[];
}
export interface MarketplaceValidationJobData {
    keywords: string[];
}
export interface SupplierAnalysisJobData {
    keywords: string[];
}
export interface OpportunityScoringJobData {
    keywords: string[];
}
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    timestamp: string;
}
//# sourceMappingURL=trend.types.d.ts.map