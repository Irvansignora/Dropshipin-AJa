import { Pool } from 'pg';
export declare const pool: Pool;
export declare function testConnection(): Promise<boolean>;
export declare function query<T = any>(sql: string, params?: any[]): Promise<T[]>;
export declare function queryOne<T = any>(sql: string, params?: any[]): Promise<T | null>;
//# sourceMappingURL=connection.d.ts.map