# Finance Bot

A serverless financial news forwarder that fetches 7x24 news from Wall Street News (WSCN) and pushes formatted messages to Feishu/Lark and WeChat Work groups.

## Features
- **Cron-driven**: Runs every minute via Cloudflare Workers Cron Triggers.
- **Deduplication**: Uses Upstash Redis to track the last processed news ID.
- **Multi-Channel Notifications**: Sends messages to Feishu and/or WeChat Work webhooks.

## Tech Stack
- TypeScript
- Cloudflare Workers
- Upstash Redis

## Setup

1. **Clone the repository**
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Configure Environment Variables**:
   Copy `.env.example` to `.env` (for local dev) and fill in the values:
   - `FEISHU_WEBHOOK_URL` (optional if WeChat Work is configured)
   - `WECHAT_WORK_WEBHOOK_URL` (optional if Feishu is configured)
   - `KV_REST_API_URL`
   - `KV_REST_API_TOKEN`

   Note: At least one webhook URL (Feishu or WeChat Work) must be provided.

## Development

Run the worker locally:
```bash
npm run dev:cf
```

## Deployment

1. **Login to Cloudflare**:
   ```bash
   npx wrangler login
   ```
2. **Deploy**:
   ```bash
   npm run deploy:cf
   ```
3. **Set Secrets**:
   Set environment variables in Cloudflare Dashboard or via CLI:
   ```bash
   npx wrangler secret put FEISHU_WEBHOOK_URL
   npx wrangler secret put WECHAT_WORK_WEBHOOK_URL
   npx wrangler secret put KV_REST_API_URL
   npx wrangler secret put KV_REST_API_TOKEN
   ```

   Note: You can configure one or both webhook URLs depending on your needs.

Ensure the cron job is active as defined in `wrangler.toml`.