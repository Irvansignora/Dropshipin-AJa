"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
exports.testConnection = testConnection;
exports.query = query;
exports.queryOne = queryOne;
// src/db/connection.ts
const pg_1 = require("pg");
const config_1 = require("../config");
const logger_1 = __importDefault(require("../utils/logger"));
exports.pool = new pg_1.Pool({
    connectionString: config_1.config.db.url,
    ssl: config_1.config.db.ssl ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});
exports.pool.on('error', (err) => {
    logger_1.default.error('Unexpected DB pool error', { error: err.message });
});
async function testConnection() {
    try {
        const client = await exports.pool.connect();
        await client.query('SELECT 1');
        client.release();
        logger_1.default.info('✅ Database connection OK');
        return true;
    }
    catch (err) {
        logger_1.default.error('❌ Database connection FAILED', { error: err.message });
        return false;
    }
}
async function query(sql, params) {
    const client = await exports.pool.connect();
    try {
        const result = await client.query(sql, params);
        return result.rows;
    }
    finally {
        client.release();
    }
}
async function queryOne(sql, params) {
    const rows = await query(sql, params);
    return rows[0] ?? null;
}
//# sourceMappingURL=connection.js.map