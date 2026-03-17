"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisConnection = void 0;
// src/config/redis.ts
const index_1 = require("./index");
// Railway injects REDIS_URL as a full connection string e.g.:
// redis://default:password@host:port
// BullMQ accepts either { url } or { host, port, password }
exports.redisConnection = index_1.config.redis.url
    ? {
        url: index_1.config.redis.url,
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
    }
    : {
        host: index_1.config.redis.host,
        port: index_1.config.redis.port,
        password: index_1.config.redis.password,
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
    };
//# sourceMappingURL=redis.js.map