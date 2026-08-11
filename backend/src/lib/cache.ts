import { Redis } from 'ioredis';

export interface CacheValue<T = unknown> {
  data: T;
  expiresAt: number;
}

export interface CacheOptions {
  ttlSeconds: number;
  jitter?: boolean;
  tags?: string[];
}

export type CacheStore = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
  del(key: string): Promise<void>;
  delPattern(pattern: string): Promise<void>;
  health(): Promise<boolean>;
};

const env = process.env.NODE_ENV ?? 'dev';
const NAMESPACE = `oyewell:${env}`;

function buildKey(key: string) {
  return `${NAMESPACE}:${key}`;
}

function withJitter(ttlSeconds: number) {
  const jitter = Math.floor(Math.random() * Math.min(30, Math.ceil(ttlSeconds * 0.1)));
  return ttlSeconds + jitter;
}

class MemoryCacheStore implements CacheStore {
  private store = new Map<string, { value: string; expiresAt: number }>();

  async get(key: string) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, ttlSeconds: number) {
    this.store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  async del(key: string) {
    this.store.delete(key);
  }

  async delPattern(pattern: string) {
    const prefix = pattern.replace(/\*$/, '');
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) this.store.delete(key);
    }
  }

  async health() {
    return true;
  }
}

class RedisCacheStore implements CacheStore {
  private client: Redis;

  constructor(url: string) {
    this.client = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 2 });
  }

  async get(key: string) {
    try {
      return await this.client.get(key);
    } catch {
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds: number) {
    try {
      await this.client.setex(key, ttlSeconds, value);
    } catch {
      // fall through silently; caller may fallback to DB
    }
  }

  async del(key: string) {
    try {
      await this.client.del(key);
    } catch {
      // ignore
    }
  }

  async delPattern(pattern: string) {
    try {
      const keys: string[] = [];
      const stream = this.client.scanStream({ match: pattern, count: 100 });
      for await (const chunk of stream) {
        keys.push(...(chunk as string[]));
      }
      if (keys.length) await this.client.del(...keys);
    } catch {
      // ignore
    }
  }

  async health() {
    try {
      await this.client.ping();
      return true;
    } catch {
      return false;
    }
  }
}

function createStore(): CacheStore {
  const url = process.env.REDIS_URL || process.env.CACHE_URL;
  if (!url) return new MemoryCacheStore();
  return new RedisCacheStore(url);
}

export class CacheService {
  private store: CacheStore;

  constructor() {
    this.store = createStore();
  }

  async get<T>(key: string): Promise<T | null> {
    const raw = await this.store.get(buildKey(key));
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as { data: T } | null;
      if (!parsed || typeof parsed !== 'object' || !('data' in parsed)) return null;
      return parsed.data;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T, options: CacheOptions) {
    const ttl = options.jitter ? withJitter(options.ttlSeconds) : options.ttlSeconds;
    await this.store.set(buildKey(key), JSON.stringify({ data: value, tags: options.tags ?? [] }), ttl);
  }

  async del(key: string) {
    await this.store.del(buildKey(key));
  }

  async delPattern(pattern: string) {
    await this.store.delPattern(`${NAMESPACE}:${pattern}*`);
  }

  async invalidate(tag: string) {
    await this.store.delPattern(`${NAMESPACE}:*:${tag}*`); // best-effort
  }

  async getOrSet<T>(key: string, factory: () => Promise<T>, options: CacheOptions): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;
    const value = await factory();
    await this.set(key, value, options);
    return value;
  }

  async remember<T>(key: string, factory: () => Promise<T>, options: CacheOptions) {
    return this.getOrSet(key, factory, options);
  }

  async health() {
    return this.store.health();
  }
}

export const cache = new CacheService();
