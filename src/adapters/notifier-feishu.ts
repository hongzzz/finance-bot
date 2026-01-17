import { INotifier, NewsArticle } from '../interfaces';

export class FeishuNotifier implements INotifier {
  private webhookUrl: string;

  constructor(webhookUrl: string) {
    this.webhookUrl = webhookUrl;
  }

  async notify(article: NewsArticle): Promise<void> {
    if (!this.webhookUrl) {
      console.warn('No FEISHU_WEBHOOK_URL provided, skipping send.');
      return;
    }

    const date = new Date(article.timestamp * 1000).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
    const title = article.title ? `**${article.title}**\n` : '';
    const content = article.content;
    
    // Style Logic:
    // Consistent style: Red/Danger if score > 2, Blue/Primary otherwise.
    // Note: The bot only sends items with score >= 2.
    // So score == 2 will be Blue/Primary, score > 2 will be Red/Danger.
    const isImportant = article.score && article.score > 2;

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
          template: isImportant ? 'red' : 'blue',
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
                url: article.url,
                type: isImportant ? 'danger' : 'primary',
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
      const response = await fetch(this.webhookUrl, {
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
      throw error;
    }
  }
}
