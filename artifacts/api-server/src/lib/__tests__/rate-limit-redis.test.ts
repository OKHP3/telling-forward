import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const instances: Array<{
    url: string;
    on: ReturnType<typeof vi.fn>;
    ping: ReturnType<typeof vi.fn>;
    call: ReturnType<typeof vi.fn>;
  }> = [];

  const RedisMock = vi.fn().mockImplementation(function RedisMock(url: string) {
    const instance = {
      url,
      on: vi.fn(),
      ping: vi.fn().mockResolvedValue("PONG"),
      call: vi.fn().mockResolvedValue(["1", "0"]),
    };
    instances.push(instance);
    return instance;
  });

  return {
    instances,
    RedisMock,
    RedisStoreMock: vi.fn().mockImplementation((options) => ({ options })),
    logger: {
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
    },
  };
});

vi.mock("ioredis", () => ({ default: mocks.RedisMock }));
vi.mock("rate-limit-redis", () => ({ RedisStore: mocks.RedisStoreMock }));
vi.mock("../logger", () => ({ logger: mocks.logger }));

describe("rate-limit Redis store", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.instances.length = 0;
    delete process.env["REDIS_URL"];
    delete process.env["NODE_ENV"];
  });

  it("uses express-rate-limit's in-memory store when Redis is intentionally absent locally", async () => {
    const { createRateLimitRedisStore, initializeRateLimitRedis } = await import(
      "../rate-limit-redis"
    );

    expect(createRateLimitRedisStore("test:")).toBeUndefined();
    await initializeRateLimitRedis();

    expect(mocks.RedisMock).not.toHaveBeenCalled();
    expect(mocks.logger.warn).toHaveBeenCalledOnce();
  });

  it("refuses production startup when REDIS_URL is absent", async () => {
    process.env["NODE_ENV"] = "production";
    const { initializeRateLimitRedis } = await import("../rate-limit-redis");

    await expect(initializeRateLimitRedis()).rejects.toThrow(
      "REDIS_URL must be configured in production",
    );
    expect(mocks.RedisMock).not.toHaveBeenCalled();
  });

  it("reuses one Redis connection while giving each limiter an independent key prefix", async () => {
    process.env["REDIS_URL"] = "redis://rate-limit.example.test:6379";

    const { createRateLimitRedisStore, initializeRateLimitRedis } = await import(
      "../rate-limit-redis"
    );

    const loginStore = createRateLimitRedisStore("telling-forward:rate-limit:login:");
    const registerStore = createRateLimitRedisStore(
      "telling-forward:rate-limit:register:",
    );

    expect(loginStore).toBeDefined();
    expect(registerStore).toBeDefined();
    expect(mocks.RedisMock).toHaveBeenCalledTimes(1);
    expect(mocks.RedisStoreMock).toHaveBeenCalledTimes(2);
    expect(mocks.RedisStoreMock.mock.calls[0]?.[0]).toMatchObject({
      prefix: "telling-forward:rate-limit:login:",
    });
    expect(mocks.RedisStoreMock.mock.calls[1]?.[0]).toMatchObject({
      prefix: "telling-forward:rate-limit:register:",
    });

    await initializeRateLimitRedis();
    expect(mocks.instances[0]?.ping).toHaveBeenCalledOnce();
    expect(mocks.logger.info).toHaveBeenCalledWith(
      "Rate-limit Redis connection ready",
    );
  });

  it("refuses startup when the configured Redis service cannot be reached", async () => {
    process.env["REDIS_URL"] = "redis://rate-limit.example.test:6379";
    const { createRateLimitRedisStore, initializeRateLimitRedis } = await import(
      "../rate-limit-redis"
    );

    createRateLimitRedisStore("telling-forward:rate-limit:login:");
    mocks.instances[0]?.ping.mockRejectedValueOnce(new Error("connection refused"));

    await expect(initializeRateLimitRedis()).rejects.toThrow(
      "Rate-limit Redis is unavailable",
    );
  });
});