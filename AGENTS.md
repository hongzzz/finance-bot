# Finance-Bot Agent Instructions

This document outlines the architecture and operational logic of the `finance-bot` for maintenance and future development.

## Project Overview
A serverless news forwarder that fetches 7x24 financial news from Wall Street News (WSCN) and pushes formatted messages to Feishu/Lark and WeChat Work groups.

## Tech Stack
- **Runtime**: Cloudflare Workers
- **Language**: TypeScript
- **Scheduling**: Cloudflare Workers Triggers (Cron)
- **State Management**: Upstash Redis (to track `last_id`)
- **Architecture**: Hexagonal / Clean Architecture (Interfaces + Adapters)

## Architecture

The project is structured to separate business logic from external dependencies:

- **`src/worker.ts`**: The entry point (Composition Root). Wires up dependencies and handles the Cloudflare Worker events (`scheduled`, `fetch`).
- **`src/core/bot.ts`**: Pure business logic (`FinanceBot`). It knows *how* to process news but not *where* it comes from or goes to.
- **`src/interfaces/index.ts`**: Defines the contracts (`INewsSource`, `IStateStorage`, `INotifier`) that the core logic relies on.
- **`src/adapters/`**: Concrete implementations of the interfaces.
    - `source-wscn.ts`: Fetches from Wall Street News API.
    - `storage-upstash.ts`: Persists state to Upstash Redis.
    - `notifier-feishu.ts`: Sends messages to Feishu Webhook.
    - `notifier-wechatwork.ts`: Sends messages to WeChat Work Webhook.
    - `notifier-composite.ts`: Broadcasts messages to multiple notifiers.

## Core Logic Flow
1. **Trigger**: Cloudflare Worker Cron hits the `scheduled` handler.
2. **Fetch**: `WscnSource` calls WSCN API.
3. **State Check**: `UpstashStorage` retrieves the last processed ID.
4. **Filter & Sort**: Core logic filters items where `id > last_id` and sorts them chronologically.
5. **Process**:
    - `CompositeNotifier` sends messages to all configured webhooks (Feishu and/or WeChat Work).
    - If any notifier fails, it logs the error but continues with others.
    - If all notifiers fail, the process stops to retry on the next run.
6. **Update**: `UpstashStorage` updates the `last_id` after each item to ensure reliable processing.

## Environment Variables Required
- `FEISHU_WEBHOOK_URL` (optional): The full webhook URL from Feishu Bot.
- `WECHAT_WORK_WEBHOOK_URL` (optional): The full webhook URL from WeChat Work Bot.
- `KV_REST_API_URL`: Upstash Redis REST URL.
- `KV_REST_API_TOKEN`: Upstash Redis REST Token.

**Note**: At least one webhook URL (Feishu or WeChat Work) must be provided.

## Extending the Bot
- **New Source**: Implement `INewsSource` in `src/adapters/` and update `src/worker.ts` to use it.
- **New Storage**: Implement `IStateStorage` (e.g., for Cloudflare KV or D1).
- **New Output**: Implement `INotifier` (e.g., for Slack, Discord, or Email).