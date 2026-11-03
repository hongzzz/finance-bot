# Finance Bot

A serverless financial news forwarder that fetches 7x24 news from Wall Street News (WSCN) and pushes formatted cards to Feishu/Lark groups.

## Features
- **Cron-driven**: Runs every minute via Cloudflare Workers Cron Triggers.
- **Deduplication**: Uses Upstash Redis to track the last processed news ID.
- **Rich Notifications**: Sends interactive message cards to Feishu with importance highlighting (red/blue).

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
   - `FEISHU_WEBHOOK_URL`
   - `KV_REST_API_URL`
   - `KV_REST_API_TOKEN`
   - `WECHAT_WEBHOOK_URL` (optional)
   - `MIN_SCORE` (optional, default `2`): only news with `score >= MIN_SCORE` is pushed; lower-score items are skipped but still marked as processed. Set to `1` to push everything.

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
   npx wrangler secret put KV_REST_API_URL
   npx wrangler secret put KV_REST_API_TOKEN
   ```

Ensure the cron job is active as defined in `wrangler.toml`.