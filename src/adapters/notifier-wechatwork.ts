import { INotifier, NewsArticle } from '../interfaces';

export class WeChatWorkNotifier implements INotifier {
  private webhookUrl: string;

  constructor(webhookUrl: string) {
    this.webhookUrl = webhookUrl;
  }

  async notify(article: NewsArticle): Promise<void> {
    if (!this.webhookUrl) {
      console.warn('No WECHAT_WORK_WEBHOOK_URL provided, skipping send.');
      return;
    }

    const title = article.title ? `【${article.title}】\n` : '';
    const textContent = `${title}${article.content}`;

    const payload = {
      msgtype: 'text',
      text: {
        content: textContent,
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
        throw new Error(`WeChat Work API error (${response.status}): ${errorText}`);
      }

      console.log(`Sent to WeChat Work: ${article.id}`);
    } catch (error) {
      console.error('Failed to send to WeChat Work:', error);
      throw error;
    }
  }
}
