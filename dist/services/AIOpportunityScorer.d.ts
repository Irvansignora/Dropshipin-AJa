import { TrendSignal, TrendMarketValidation, TrendSupplierAnalysis, TrendOpportunity } from '../types/trend.types';
export declare class AIOpportunityScorer {
    private forecaster;
    calculateOpportunityScore(virality_score: number, demand_score: number, margin_potential: number, supplier_feasibility_score: number): number;
    score(signals: TrendSignal[], validations: TrendMarketValidation[], suppliers: TrendSupplierAnalysis[]): Promise<TrendOpportunity[]>;
    private scoreKeyword;
}
//# sourceMappingURL=AIOpportunityScorer.d.ts.map