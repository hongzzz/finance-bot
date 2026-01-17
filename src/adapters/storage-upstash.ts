import { Redis } from '@upstash/redis/cloudflare';
import { IStateStorage } from '../interfaces';

export class UpstashStorage implements IStateStorage {
  private redis: Redis;
  private key: string;

  constructor(url: string, token: string, key: string = 'wscn_last_id') {
    if (!url || !token) {
        throw new Error('Redis configuration missing');
    }
    this.redis = new Redis({ url, token });
    this.key = key;
  }

  async getLastId(): Promise<string | number | null> {
    const lastIdStr = await this.redis.get<string | number>(this.key);
    return lastIdStr ? Number(lastIdStr) : 0;
  }

  async setLastId(id: string | number): Promise<void> {
    await this.redis.set(this.key, id);
  }
}
