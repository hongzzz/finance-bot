import { WscnArticle } from './types';

export async function sendToFeishu(webhookUrl: string, article: WscnArticle) {
  if (!webhookUrl) {
    console.warn('No FEISHU_WEBHOOK_URL provided, skipping send.');
    return;
  }

  const date = new Date(article.display_time * 1000).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
  const title = article.title ? `**${article.title}**\n` : '';
  const content = article.content_text;

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
        template: article.score && article.score > 2 ? 'red' : 'blue',
      },
      elements: [
        {
          tag: 'div',
          text: {
            tag: 'lark_md',
            content: `${title}${content}`,
          },
        },
        {
          tag: 'action',
          actions: [
            {
              tag: 'button',
              text: {
                tag: 'plain_text',
                content: '阅读原文',
              },
              url: article.uri,
              type: article.score && article.score >= 2 ? 'danger' : 'primary',
            },
          ],
        },
        {
          tag: 'hr',
        },
        {
          tag: 'note',
          elements: [
            {
              tag: 'plain_text',
              content: `🕒 ${date}`,
            },
          ],
        },
      ],
    },
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Feishu API error (${response.status}): ${errorText}`);
    }

    console.log(`Sent to Feishu: ${article.id}`);
  } catch (error) {
    console.error('Failed to send to Feishu:', error);
    throw error; // Propagate error to caller
  }
}
