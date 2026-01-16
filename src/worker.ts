import { checkAndSendNews } from './bot';

export interface Env {
    FEISHU_WEBHOOK_URL: string;
    KV_REST_API_URL: string;
    KV_REST_API_TOKEN: string;
}

export default {
    async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
        console.log(`Cron triggered at ${new Date(event.scheduledTime).toISOString()}`);

        ctx.waitUntil(
            checkAndSendNews({
                redisUrl: env.KV_REST_API_URL,
                redisToken: env.KV_REST_API_TOKEN,
                webhookUrl: env.FEISHU_WEBHOOK_URL,
            })
                .then(result => console.log('Bot success:', result))
                .catch(err => console.error('Bot failed:', err.message))
        );
    },

    // Also support manual trigger via HTTP for testing
    async fetch(request: Request, env: Env, ctx: ExecutionContext) {
        try {
            const result = await checkAndSendNews({
                redisUrl: env.KV_REST_API_URL,
                redisToken: env.KV_REST_API_TOKEN,
                webhookUrl: env.FEISHU_WEBHOOK_URL,
            });
            return new Response(result, { status: 200 });
        } catch (err: any) {
            return new Response(err.message, { status: 500 });
        }
    }
};
