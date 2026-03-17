// src/config/redis.ts
import { config } from './index';

// Railway injects REDIS_URL as a full connection string e.g.:
// redis://default:password@host:port
// BullMQ accepts either { url } or { host, port, password }
export const redisConnection = config.redis.url
  ? {
      url: config.redis.url,
      maxRetriesPerRequest: null as null,
      enableReadyCheck: false,
    }
  : {
      host:     config.redis.host,
      port:     config.redis.port,
      password: config.redis.password,
      maxRetriesPerRequest: null as null,
      enableReadyCheck: false,
    };
