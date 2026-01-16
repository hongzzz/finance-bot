# Finance-Bot Agent Instructions

This document outlines the architecture and operational logic of the `finance-bot` for maintenance and future development.

## Project Overview
A serverless news forwarder that fetches 7x24 financial news from Wall Street News (WSCN) and pushes formatted cards to Feishu/Lark groups.

## Tech Stack
- **Runtime**: Node.js (TypeScript)
- **Deployment**: Vercel (Serverless Functions)
- **Scheduling**: Vercel Cron Jobs (`* * * * *`)
- **State Management**: Upstash Redis (to track `last_id`)
- **API Communication**: Axios

## Core Logic Flow
1. **Trigger**: Vercel Cron hits `/api/cron` every minute.
2. **Fetch**: GET `https://api-one-wscn.awtmt.com/apiv1/content/lives?channel=global-channel&limit=10`.
3. **State Check**: Retrieve `wscn_last_id` from Upstash Redis.
4. **Filter**: Identify items with `id > last_id`.
5. **Sort**: Sort new items in ascending order (chronological) to ensure sequential delivery.
6. **Push**: For each new item, send an interactive card to Feishu Webhook.
7. **Update**: Update `wscn_last_id` in Redis after successful delivery.

## Key Files
- `api/cron.ts`: Vercel serverless entry point.
- `src/bot.ts`: Main orchestration logic.
- `src/feishu.ts`: Feishu message card formatting and delivery.
- `src/types.ts`: Type definitions for WSCN API responses.
- `vercel.json`: Cron job configuration.

## Environment Variables Required
- `FEISHU_WEBHOOK_URL`: The full webhook URL from Feishu Bot.
- `KV_REST_API_URL`: Upstash Redis REST URL.
- `KV_REST_API_TOKEN`: Upstash Redis REST Token.

## Maintenance Notes
- **Rate Limiting**: The WSCN API is currently public but may implement rate limiting. The 1-minute interval is generally safe.
- **Message Cards**: Card templates use `blue` for regular news and `red` for items with a `score >= 2`.
- **Error Handling**: Failures in sending a single message will stop the loop to prevent ID skip, ensuring "at least once" delivery upon next retry.
