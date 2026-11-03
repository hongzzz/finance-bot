#!/usr/bin/env node
// Twice-daily AI digest of WSCN 7x24 news, summarized by `claude -p` and pushed to Feishu / WeChat Work.
// Runs in GitHub Actions (see .github/workflows/digest.yml). Node 20+ (global fetch), no dependencies.
//
// Env:
//   FEISHU_WEBHOOK_URL / WECHAT_WEBHOOK_URL  at least one required (unless DRY_RUN=1)
//   DIGEST_MODEL      claude model alias, default "sonnet"
//   DIGEST_SLOTS      Beijing hours that close a digest window, default "10,17"
//   DRY_RUN=1         print the digest instead of sending it
//   NEWS_FILE         read news JSON (WSCN items array) from file instead of the API (for local testing)

import { spawnSync } from 'node:child_process';
import { appendFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const WSCN_API = 'https://api-one-wscn.awtmt.com/apiv1/content/lives';
const CST_OFFSET_SEC = 8 * 3600;
const WECHAT_MAX_BYTES = 4000; // markdown limit is 4096 bytes
const MAX_PAGES = 15;

/**
 * Window [start, end) in unix seconds, bounded by the two most recent slot boundaries (Beijing time).
 * Using fixed boundaries keeps windows contiguous even when Actions starts the job late.
 */
export function digestWindow(nowSec, slots) {
  const hours = [...slots].sort((a, b) => a - b);
  const boundaries = [];
  const dayStartCst = Math.floor((nowSec + CST_OFFSET_SEC) / 86400) * 86400 - CST_OFFSET_SEC;
  for (const dayOffset of [-2, -1, 0]) {
    for (const h of hours) boundaries.push(dayStartCst + dayOffset * 86400 + h * 3600);
  }
  const past = boundaries.filter(b => b <= nowSec);
  return { start: past[past.length - 2], end: past[past.length - 1] };
}

export function formatCst(sec) {
  const d = new Date((sec + CST_OFFSET_SEC) * 1000);
  const p = n => String(n).padStart(2, '0');
  return `${d.getUTCMonth() + 1}月${d.getUTCDate()}日 ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

async function fetchNews(start, end) {
  if (process.env.NEWS_FILE) {
    return JSON.parse(readFileSync(process.env.NEWS_FILE, 'utf8'))
      .filter(i => i.display_time >= start && i.display_time < end);
  }
  const items = [];
  let cursor = '';
  for (let page = 0; page < MAX_PAGES; page++) {
    const url = `${WSCN_API}?channel=global-channel&limit=100${cursor ? `&cursor=${cursor}` : ''}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 finance-bot-digest' } });
    if (!res.ok) throw new Error(`WSCN API error: ${res.status}`);
    const data = (await res.json()).data;
    const batch = data?.items ?? [];
    items.push(...batch);
    cursor = data?.next_cursor;
    if (!batch.length || !cursor || batch[batch.length - 1].display_time < start) break;
  }
  const seen = new Set();
  return items
    .filter(i => i.display_time >= start && i.display_time < end)
    .filter(i => !seen.has(i.id) && seen.add(i.id))
    .sort((a, b) => a.display_time - b.display_time);
}

export function newsToText(items) {
  return items.map(i => {
    const time = formatCst(i.display_time).split(' ')[1];
    const mark = (i.score ?? 0) >= 2 ? '【重要】' : '';
    const title = i.title ? `${i.title}：` : '';
    const content = String(i.content_text ?? '').replace(/\s+/g, ' ').trim();
    return `${time} ${mark}${title}${content}`;
  }).join('\n');
}

function buildPrompt(windowLabel, count) {
  return `以下是华尔街见闻 ${windowLabel} 的 7x24 快讯，共 ${count} 条（标【重要】的是编辑标红的快讯）。
请写一份中文市场简报，给关注 A 股、港股、美股和宏观的投资者阅读：

1. 第一行写「📌 核心要点」，然后用 3-5 条列出本时段最重要的事件，每条一句话，写清楚影响。
2. 然后按主题分组（例如：宏观与政策、A股/港股、美股、大宗商品与外汇、公司动态），每组列 2-4 条要点；没有内容的组直接省略。
3. 最后用「👀 后续关注」列出 1-3 个接下来值得留意的事件或数据。

要求：只根据给出的快讯写，不要编造数据；合并重复或同一事件的快讯；忽略不重要的琐碎消息；
纯文本加简单的 emoji 和「- 」列表，不要用 Markdown 标题、加粗或表格；总长度控制在 900 字以内。
直接输出简报正文，不要任何开场白或解释。`;
}

function summarize(prompt, newsText) {
  const model = process.env.DIGEST_MODEL || 'sonnet';
  const result = spawnSync('claude', ['-p', prompt, '--model', model, '--tools', '', '--output-format', 'text'], {
    input: newsText,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
    timeout: 10 * 60 * 1000,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`claude -p exited with ${result.status}: ${result.stderr || result.stdout}`);
  }
  const text = result.stdout.trim();
  if (!text) throw new Error('claude -p returned empty output');
  return text;
}

/** Split text on line boundaries into chunks of at most maxBytes (UTF-8). */
export function splitByBytes(text, maxBytes) {
  const chunks = [];
  let current = '';
  for (const line of text.split('\n')) {
    const candidate = current ? `${current}\n${line}` : line;
    if (Buffer.byteLength(candidate) <= maxBytes) {
      current = candidate;
      continue;
    }
    if (current) chunks.push(current);
    // A single over-long line: hard-split it by characters.
    current = '';
    for (const ch of line) {
      if (Buffer.byteLength(current + ch) > maxBytes) {
        chunks.push(current);
        current = '';
      }
      current += ch;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

async function postJson(url, payload, name, isOk) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await res.text();
  let json = {};
  try { json = JSON.parse(body); } catch { /* keep raw body for the error */ }
  if (!res.ok || !isOk(json)) throw new Error(`${name} webhook error (${res.status}): ${body}`);
}

async function sendFeishu(url, text) {
  // Feishu returns HTTP 200 with a non-zero `code` on failure.
  await postJson(url, { msg_type: 'text', content: { text } }, 'Feishu',
    j => (j.code ?? j.StatusCode ?? 0) === 0);
}

async function sendWeChat(url, text) {
  for (const chunk of splitByBytes(text, WECHAT_MAX_BYTES)) {
    await postJson(url, { msgtype: 'markdown', markdown: { content: chunk } }, 'WeChat',
      j => (j.errcode ?? 0) === 0);
  }
}

async function main() {
  const slots = (process.env.DIGEST_SLOTS || '10,17').split(',').map(Number).filter(Number.isFinite);
  const { start, end } = digestWindow(Math.floor(Date.now() / 1000), slots);
  const windowLabel = `${formatCst(start)} - ${formatCst(end)}`;
  console.log(`Digest window (Beijing time): ${windowLabel}`);

  const items = await fetchNews(start, end);
  console.log(`Fetched ${items.length} items.`);
  if (items.length === 0) {
    console.log('No news in window, skip.');
    return;
  }

  const summary = summarize(buildPrompt(windowLabel, items.length), newsToText(items));
  const message = `📰 财经简报｜${windowLabel}（${items.length} 条快讯）\n\n${summary}`;

  if (process.env.DRY_RUN === '1') {
    console.log(`\n${message}`);
    if (process.env.GITHUB_STEP_SUMMARY) {
      appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Digest preview (dry run, not sent)\n\n\`\`\`\n${message}\n\`\`\`\n`);
    }
    return;
  }

  const { FEISHU_WEBHOOK_URL, WECHAT_WEBHOOK_URL } = process.env;
  if (!FEISHU_WEBHOOK_URL && !WECHAT_WEBHOOK_URL) {
    throw new Error('Set FEISHU_WEBHOOK_URL and/or WECHAT_WEBHOOK_URL');
  }
  const sends = [];
  if (FEISHU_WEBHOOK_URL) sends.push(sendFeishu(FEISHU_WEBHOOK_URL, message));
  if (WECHAT_WEBHOOK_URL) sends.push(sendWeChat(WECHAT_WEBHOOK_URL, message));
  const results = await Promise.allSettled(sends);
  const failures = results.filter(r => r.status === 'rejected');
  failures.forEach(f => console.error(f.reason));
  if (failures.length) process.exit(1);
  console.log('Digest sent.');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
