import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client!: Redis;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    // create the Redis connection when the module loads
    this.client = new Redis(this.config.get<string>('REDIS_URL')!);

    this.client.on('connect', () => console.log('Redis connected'));
    this.client.on('error',   (err) => console.error('Redis error:', err));
  }

  onModuleDestroy(): void {
    // cleanly close the connection when the app shuts down
    this.client.quit();
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      // EX (expires) sets the expiry time in seconds(TTL = time to live)
      await this.client.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }
}