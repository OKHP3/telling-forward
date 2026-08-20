import Redis from "ioredis";
import { RedisStore, type RedisReply } from "rate-limit-redis";
import { logger } from "./logger";

/**
 * Shared Redis client for every express-rate-limit store in this process.
 *
 * Each limiter still receives its own RedisStore instance and key prefix:
 * express-rate-limit uses store state to validate a limiter's configuration,
 * so sharing a store object would incorrectly couple independent limits.
 */
let client: Redis | undefined;
let fallbackLogged = false;

function redisUrl(): string | undefined {
  return process.env["REDIS_URL"];
}

function logInMemoryFallback(): void {
  if (fallbackLogged) {
    return;
  }

  fallbackLogged = true;
  logger.warn(
    "REDIS_URL is not configured; rate limits use in-memory counters and are not shared between instances",
  );
}

function getClient(): Redis | undefined {
  const url = redisUrl();
  if (!url) {
    return undefined;
  }

  if (!client) {
    client = new Redis(url, {
      connectTimeout: 5_000,
      maxRetriesPerRequest: 1,
      retryStrategy: (attempt) => Math.min(attempt * 100, 2_000),
    });

    client.on("error", (error) => {
      logger.error({ err: error }, "Rate-limit Redis connection error");
    });
  }

  return client;
}

/**
 * Check the rate-limit Redis dependency during server bootstrap.
 *
 * Production must not quietly run the sign-in endpoints with per-process,
 * resettable counters. Development and tests retain the default in-memory
 * store when REDIS_URL is intentionally absent.
 */
export async function initializeRateLimitRedis(): Promise<void> {
  const rateLimitClient = getClient();
  if (!rateLimitClient) {
    if (process.env["NODE_ENV"] === "production") {
      throw new Error(
        "REDIS_URL must be configured in production so authentication rate limits remain shared and durable",
      );
    }

    logInMemoryFallback();
    return;
  }

  try {
    await rateLimitClient.ping();
    logger.info("Rate-limit Redis connection ready");
  } catch (error) {
    throw new Error(
      `Rate-limit Redis is unavailable; refusing to start with unprotected shared limits: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

/**
 * Create an endpoint-specific Redis store backed by the process-wide client.
 *
 * Undefined intentionally lets express-rate-limit use its MemoryStore in
 * non-production environments without REDIS_URL. Do not reuse the returned
 * RedisStore across different rateLimit() middleware instances.
 */
export function createRateLimitRedisStore(prefix: string): RedisStore | undefined {
  const rateLimitClient = getClient();
  if (!rateLimitClient) {
    logInMemoryFallback();
    return undefined;
  }

  return new RedisStore({
    prefix,
    sendCommand: async (...args: string[]): Promise<RedisReply> => {
      const [command, ...commandArgs] = args;
      if (!command) {
        throw new Error("Redis rate-limit store attempted to send an empty command");
      }

      return (await rateLimitClient.call(command, ...commandArgs)) as RedisReply;
    },
  });
}