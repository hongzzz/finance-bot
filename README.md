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
## AI Digest (GitHub Actions + Codex subscription)

The GitHub-hosted workflow runs at **10:00 and 17:00 Beijing time**, fetches the
previous news window, summarizes with `codex exec`, and sends Feishu / WeChat Work
messages. No server or OpenAI API key is required. The realtime Cloudflare Worker
is independent; it does not run Codex CLI.

### Subscription login

On your own computer:

```bash
npm install -g @openai/codex
codex -c 'cli_auth_credentials_store="file"' login
# For a headless login, append --device-auth if your account supports it.
```

Sign in using your ChatGPT subscription account. The file-backed login stores
credentials at `~/.codex/auth.json` (or your explicitly configured CODEX_HOME).
Do not use or extract credentials injected into this cloud task.

In repository **Settings → Secrets and variables → Actions**:

- Add secret `CODEX_AUTH_JSON` containing the complete local auth.json. Treat it as
  account credentials: never paste it in chat, commit it, or upload it as an artifact.
- Keep `FEISHU_WEBHOOK_URL` and/or `WECHAT_WEBHOOK_URL` as secrets.
- Leave `DIGEST_MODEL` unset for Codex's default model, or set a model available
  to your account.

The workflow restores credentials with private permissions into a temporary
CODEX_HOME, checks login, and removes them after the job. Only the authentication
step receives CODEX_AUTH_JSON. The job has read-only repository permissions.

**Renewal limitation:** hosted runners discard refreshed login state. If OAuth tokens
rotate, expire or are revoked, a later run may fail. Log in locally again and replace
CODEX_AUTH_JSON. This is not a permanent-token solution; subscription quotas also
apply. Authentication failure stops delivery, without falling back to another provider.

### Verify before delivery

Run **Actions → News Digest → Run workflow** with `dry_run=true`. It calls the
model and consumes quota, but only prints the digest and writes the Actions summary.
Scheduled workflows run from the default branch. A real subscription-authenticated
Actions run is still required to validate end-to-end behavior after configuring the
secret; local mocked checks do not establish credential validity.

Local preview after Codex login:

```bash
DRY_RUN=1 node scripts/digest.mjs
# NEWS_FILE=/absolute/path/news.json can replace live news fetching.
```

The summarizer uses an empty temporary working directory, read-only sandbox and the
final-answer output file, then removes temporary outputs. Read-only is not a guarantee
that no tools can run; the prompt treats news as data and requests no tool use.

Checks:

```bash
node scripts/check-digest.mjs
npm run typecheck
npm test -- --runInBand
```
