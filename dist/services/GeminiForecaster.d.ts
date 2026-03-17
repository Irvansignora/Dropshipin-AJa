import { TrendForecast, TrendOpportunity } from '../types/trend.types';
export declare class GeminiForecaster {
    private genAI;
    private getModel;
    forecast(opportunity: Omit<TrendOpportunity, 'forecast'>): Promise<TrendForecast>;
    private heuristicForecast;
}
//# sourceMappingURL=GeminiForecaster.d.ts.map