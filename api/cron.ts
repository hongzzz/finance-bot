import { VercelRequest, VercelResponse } from '@vercel/node';
import { checkAndSendNews } from '../src/bot';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const result = await checkAndSendNews({
      redisUrl: process.env.KV_REST_API_URL || '',
      redisToken: process.env.KV_REST_API_TOKEN || '',
      webhookUrl: process.env.FEISHU_WEBHOOK_URL || '',
    });
    
    console.log(result);
    return res.status(200).json({ message: result });

  } catch (error: any) {
    console.error('Error in cron job:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
