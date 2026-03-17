import { TrendSignal, TrendMarketValidation, TrendSupplierAnalysis, TrendForecast, TrendOpportunity } from '../../types/trend.types';
export declare class TrendRepository {
    bulkInsertSignals(signals: TrendSignal[]): Promise<void>;
    getRecentSignals(hoursBack?: number): Promise<TrendSignal[]>;
    getRecentKeywords(hoursBack?: number): Promise<string[]>;
    getTopSignalsByKeyword(keyword: string): Promise<TrendSignal[]>;
    bulkInsertValidations(validations: TrendMarketValidation[]): Promise<void>;
    getRecentValidations(hoursBack?: number): Promise<TrendMarketValidation[]>;
    getValidationsByKeyword(keyword: string): Promise<TrendMarketValidation[]>;
    bulkInsertSupplierAnalysis(analyses: TrendSupplierAnalysis[]): Promise<void>;
    getRecentSupplierAnalysis(hoursBack?: number): Promise<TrendSupplierAnalysis[]>;
    bulkInsertForecasts(forecasts: TrendForecast[]): Promise<void>;
    getLatestForecast(keyword: string): Promise<TrendForecast | null>;
    upsertOpportunity(op: TrendOpportunity): Promise<void>;
    getTop20Opportunities(): Promise<TrendOpportunity[]>;
    getDashboardStats(): Promise<{
        total_signals: number;
        total_keywords: number;
        auto_pushed: number;
        avg_score: number;
        last_scan: Date | null;
    }>;
}
//# sourceMappingURL=TrendRepository.d.ts.map