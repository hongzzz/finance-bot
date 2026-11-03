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
## AI Digest (GitHub Actions + Claude Code)

`.github/workflows/digest.yml` runs `scripts/digest.mjs` at **10:00 and 17:00 Beijing time**. It fetches all WSCN 7x24 news since the previous slot (17:00 → 10:00, 10:00 → 17:00), summarizes it with `claude -p`, and pushes one digest to Feishu (orange interactive card) / WeChat Work (markdown), so it stands out from the plain-text realtime pushes. It uses your Claude subscription, so no API key is needed.

Setup (repo **Settings → Secrets and variables → Actions**):
- Secret `CLAUDE_CODE_OAUTH_TOKEN`: run `claude setup-token` locally and paste the token here.
- Secret `FEISHU_WEBHOOK_URL` and/or `WECHAT_WEBHOOK_URL`.
- Optional variable `DIGEST_MODEL` (default `sonnet`, e.g. `haiku`).

Scheduled workflows only run from the default branch. Trigger it manually via **Actions → News Digest → Run workflow** (tick `dry_run` to only show the digest in the run summary without sending).

Local test:
```bash
DRY_RUN=1 node scripts/digest.mjs
```
