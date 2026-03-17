import { TrendMarketValidation } from '../types/trend.types';
export declare class MarketplaceDemandValidator {
    calculateDemandScore(search_volume: number, price_spread: number, competition_score: number): number;
    private validateShopee;
    private validateTokopedia;
    private validateLazada;
    validate(keyword: string): Promise<TrendMarketValidation[]>;
    validateBatch(keywords: string[]): Promise<TrendMarketValidation[]>;
    private getMockValidation;
}
//# sourceMappingURL=MarketplaceDemandValidator.d.ts.map