import { FinanceBot } from './core/bot';
import { WscnSource } from './adapters/source-wscn';
import { UpstashStorage } from './adapters/storage-upstash';
import { FeishuNotifier } from './adapters/notifier-feishu';
import { WeChatWorkNotifier } from './adapters/notifier-wechatwork';
import { CompositeNotifier } from './adapters/notifier-composite';
import { INotifier } from './interfaces';

export interface Env {
    FEISHU_WEBHOOK_URL?: string;
    WECHAT_WORK_WEBHOOK_URL?: string;
    KV_REST_API_URL: string;
    KV_REST_API_TOKEN: string;
}

function validateEnv(env: Env): void {
    const required = ['KV_REST_API_URL', 'KV_REST_API_TOKEN'] as const;
    const missing = required.filter(key => !env[key]);
    if (missing.length > 0) {
        throw new Error(`Missing env vars: ${missing.join(', ')}`);
    }

    if (!env.FEISHU_WEBHOOK_URL && !env.WECHAT_WORK_WEBHOOK_URL) {
        throw new Error('At least one webhook URL must be provided (FEISHU_WEBHOOK_URL or WECHAT_WORK_WEBHOOK_URL)');
    }
}

function createBot(env: Env): FinanceBot {
    validateEnv(env);

    const notifiers: INotifier[] = [];

    if (env.FEISHU_WEBHOOK_URL) {
        notifiers.push(new FeishuNotifier(env.FEISHU_WEBHOOK_URL));
    }

    if (env.WECHAT_WORK_WEBHOOK_URL) {
        notifiers.push(new WeChatWorkNotifier(env.WECHAT_WORK_WEBHOOK_URL));
    }

    return new FinanceBot(
        new WscnSource(),
        new UpstashStorage(env.KV_REST_API_URL, env.KV_REST_API_TOKEN),
        new CompositeNotifier(notifiers)
    );
}

export default {
    async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
        console.log(`Cron triggered at ${new Date(event.scheduledTime).toISOString()}`);

        try {
            const bot = createBot(env);

            ctx.waitUntil(
                bot.run()
                    .then(result => console.log('Bot success:', result))
                    .catch(err => console.error('Bot failed:', err.message))
            );
        } catch (e: any) {
            console.error('Scheduled task error:', e.message);
        }
    },

    async fetch(request: Request, env: Env, ctx: ExecutionContext) {
        try {
            const bot = createBot(env);
            
            const result = await bot.run();
            return new Response(result, { status: 200 });
        } catch (err: any) {
            return new Response(err.message, { status: 500 });
        }
    }
};
