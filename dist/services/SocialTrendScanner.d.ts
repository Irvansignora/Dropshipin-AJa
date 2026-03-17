import { TrendSignal, PlatformSignals, TrendStage } from '../types/trend.types';
export declare class SocialTrendScanner {
    calculateViralityScore(s: PlatformSignals): number;
    classifyTrendStage(score: number): TrendStage;
    private signalToTrendSignal;
    scanTikTok(): Promise<TrendSignal[]>;
    scanInstagram(): Promise<TrendSignal[]>;
    scanYouTube(): Promise<TrendSignal[]>;
    scanPinterest(): Promise<TrendSignal[]>;
    scanAll(): Promise<TrendSignal[]>;
    private extractProductKeyword;
    private getMockSignals;
}
//# sourceMappingURL=SocialTrendScanner.d.ts.map