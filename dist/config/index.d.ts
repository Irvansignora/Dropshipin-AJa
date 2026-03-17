export declare const config: {
    server: {
        port: number;
        env: string;
    };
    db: {
        url: string;
        host: string;
        port: number;
        database: string;
        user: string;
        password: string;
        ssl: boolean;
    };
    redis: {
        url: string | undefined;
        host: string;
        port: number;
        password: string | undefined;
    };
    gemini: {
        apiKey: string;
    };
    social: {
        tiktok: {
            rapidApiKey: string;
            rapidApiHost: string;
        };
        instagram: {
            rapidApiKey: string;
            rapidApiHost: string;
        };
        youtube: {
            apiKey: string;
        };
        pinterest: {
            rapidApiKey: string;
            rapidApiHost: string;
        };
    };
    marketplace: {
        shopee: {
            partnerId: string;
            apiKey: string;
            baseUrl: string;
        };
        tokopedia: {
            clientId: string;
            clientSecret: string;
            baseUrl: string;
        };
        lazada: {
            appKey: string;
            appSecret: string;
            baseUrl: string;
        };
    };
    supplier: {
        alibaba1688: {
            rapidApiKey: string;
            rapidApiHost: string;
        };
        aliexpress: {
            rapidApiKey: string;
            rapidApiHost: string;
        };
        alibaba: {
            appKey: string;
            appSecret: string;
        };
    };
    scoring: {
        trendScoreThreshold: number;
        marginThresholdPct: number;
        competitionThreshold: number;
        topN: number;
    };
    schedule: {
        socialScanIntervalMs: number;
        marketplaceValidationIntervalMs: number;
        supplierAnalysisIntervalMs: number;
        dailyTop20Cron: string;
    };
};
//# sourceMappingURL=index.d.ts.map