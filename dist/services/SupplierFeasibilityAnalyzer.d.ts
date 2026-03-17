import { TrendSupplierAnalysis } from '../types/trend.types';
export declare class SupplierFeasibilityAnalyzer {
    calculateFeasibilityScore(avg_price: number, stock_level: number, rating: number, shipping_time: number): number;
    private analyze1688;
    private analyzeAliExpress;
    private analyzeAlibaba;
    private analyzeTaobao;
    analyze(keyword: string): Promise<TrendSupplierAnalysis[]>;
    analyzeBatch(keywords: string[]): Promise<TrendSupplierAnalysis[]>;
    private getMockSupplierData;
}
//# sourceMappingURL=SupplierFeasibilityAnalyzer.d.ts.map