import axios from 'axios';
import { WscnArticle } from './types';

export async function sendToFeishu(webhookUrl: string, article: WscnArticle) {
  if (!webhookUrl) {
    console.warn('No FEISHU_WEBHOOK_URL provided, skipping send.');
    return;
  }

  const date = new Date(article.display_time * 1000).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
  const title = article.title ? `**${article.title}**\n` : '';
  const content = article.content_text.replace(/\n/g, '\n\n'); // Add breathing room for markdown

  const payload = {
    msg_type: 'interactive',
    card: {
      config: {
        wide_screen_mode: true,
      },
      header: {
        title: {
          tag: 'plain_text',
          content: '华尔街见闻快讯',
        },
        template: article.score && article.score >= 2 ? 'red' : 'blue', // Highlight important news
      },
      elements: [
        {
          tag: 'div',
          text: {
            tag: 'lark_md',
            content: `${title}${content}\n\n🕒 ${date} | [原文链接](${article.uri})`,
          },
        },
      ],
    },
  };

  try {
    await axios.post(webhookUrl, payload);
    console.log(`Sent to Feishu: ${article.id}`);
  } catch (error) {
    console.error('Failed to send to Feishu:', error);
    throw error; // Propagate error to caller
  }
}
