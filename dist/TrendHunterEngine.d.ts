import { TrendOpportunity } from './types/trend.types';
export declare class TrendHunterEngine {
    private scanner;
    private validator;
    private supplier;
    private scorer;
    private repo;
    runSocialScan(): Promise<void>;
    runMarketplaceValidation(): Promise<void>;
    runSupplierAnalysis(): Promise<void>;
    generateTop20(): Promise<TrendOpportunity[]>;
    runFullPipeline(): Promise<TrendOpportunity[]>;
}
//# sourceMappingURL=TrendHunterEngine.d.ts.map