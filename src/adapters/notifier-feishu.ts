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

    const title = article.title ? `【${article.title}】\n` : '';
    const textContent = `${title}${article.content}`;

    const payload = {
      msg_type: 'text',
      content: {
        text: textContent,
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
