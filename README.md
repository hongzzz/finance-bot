# Finance Bot

A serverless financial news forwarder that fetches 7x24 news from Wall Street News (WSCN) and pushes formatted cards to Feishu/Lark groups.

## Features
- **Cron-driven**: Runs every minute via Vercel Cron.
- **Deduplication**: Uses Upstash Redis to track the last processed news ID.
- **Rich Notifications**: Sends interactive message cards to Feishu with importance highlighting (red/blue).

## Tech Stack
- Node.js + TypeScript
- Vercel (Serverless Functions)
- Upstash Redis

## Setup

1. **Clone the repository**
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Configure Environment Variables**:
   Copy `.env.example` to `.env` and fill in the values:
   - `FEISHU_WEBHOOK_URL`
   - `KV_REST_API_URL`
   - `KV_REST_API_TOKEN`
4. **Local Development**:
   You can run the cron logic manually using `ts-node` (after installing it).

## Deployment

Deploy to Vercel:
```bash
vercel
```
Ensure the cron job is active as defined in `vercel.json`.
