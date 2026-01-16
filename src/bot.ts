import { Redis } from '@upstash/redis/cloudflare';
import { WscnResponse } from './types';
import { sendToFeishu } from './feishu';

const WSCN_API_URL = 'https://api-one-wscn.awtmt.com/apiv1/content/lives?channel=global-channel&limit=10';
const REDIS_LAST_ID_KEY = 'wscn_last_id';

export async function checkAndSendNews(config: {
  redisUrl: string;
  redisToken: string;
  webhookUrl: string;
}) {
  if (!config.redisUrl || !config.redisToken) {
    throw new Error('Redis configuration missing (KV_REST_API_URL / KV_REST_API_TOKEN)');
  }

  const redis = new Redis({
    url: config.redisUrl,
    token: config.redisToken,
  });

  console.log('Fetching news from WSCN...');
  const response = await fetch(WSCN_API_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch news: ${response.statusText}`);
  }
  const data = await response.json() as WscnResponse;
  const items = data.data.items;

  if (!items || items.length === 0) {
    return 'No items found from API';
  }

  // Get last processed ID from Redis
  const lastIdStr = await redis.get<string | number>(REDIS_LAST_ID_KEY);
  const lastId = lastIdStr ? Number(lastIdStr) : 0;

  console.log(`Last processed ID: ${lastId}`);

  // Filter new items and sort chronological
  const newItems = items
    .filter(item => item.id > lastId)
    .sort((a, b) => a.id - b.id);

  if (newItems.length === 0) {
    return 'No new items to send';
  }

  console.log(`Found ${newItems.length} new items.`);

  // Send to Feishu
  for (const item of newItems) {
    try {
      await sendToFeishu(config.webhookUrl, item);
      // Update Redis after each successful send
      await redis.set(REDIS_LAST_ID_KEY, item.id);
    } catch (error) {
      console.error(`Stopping delivery at item ${item.id} due to error.`);
      throw error; // Halt execution so next cron run can retry from this item
    }
  }

  return `Processed ${newItems.length} items. Latest ID: ${newItems[newItems.length - 1].id}`;
}
