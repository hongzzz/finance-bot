import { FinanceBot } from './core/bot';
import { WscnSource } from './adapters/source-wscn';
import { UpstashStorage } from './adapters/storage-upstash';
import { FeishuNotifier } from './adapters/notifier-feishu';

export interface Env {
    FEISHU_WEBHOOK_URL: string;
    KV_REST_API_URL: string;
    KV_REST_API_TOKEN: string;
}

export default {
    async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
        console.log(`Cron triggered at ${new Date(event.scheduledTime).toISOString()}`);

        const bot = new FinanceBot(
            new WscnSource(),
            new UpstashStorage(env.KV_REST_API_URL, env.KV_REST_API_TOKEN),
            new FeishuNotifier(env.FEISHU_WEBHOOK_URL)
        );

        ctx.waitUntil(
            bot.run()
                .then(result => console.log('Bot success:', result))
                .catch(err => console.error('Bot failed:', err.message))
        );
    },

    async fetch(request: Request, env: Env, ctx: ExecutionContext) {
        try {
            const bot = new FinanceBot(
                new WscnSource(),
                new UpstashStorage(env.KV_REST_API_URL, env.KV_REST_API_TOKEN),
                new FeishuNotifier(env.FEISHU_WEBHOOK_URL)
            );
            
            const result = await bot.run();
            return new Response(result, { status: 200 });
        } catch (err: any) {
            return new Response(err.message, { status: 500 });
        }
    }
};