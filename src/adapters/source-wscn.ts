import { INewsSource, NewsArticle } from '../interfaces';
import { WscnResponse } from '../interfaces/types';

const WSCN_API_URL = 'https://api-one-wscn.awtmt.com/apiv1/content/lives?channel=global-channel&limit=10';

export class WscnSource implements INewsSource {
  async fetchLatest(): Promise<NewsArticle[]> {
    console.log('Fetching news from WSCN...');
    const response = await fetch(WSCN_API_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch news: ${response.statusText}`);
    }
    const data = await response.json() as WscnResponse;
    const items = data.data.items;

    if (!items || items.length === 0) {
      return [];
    }

    // Map WSCN specific structure to generic NewsArticle
    return items.map(item => ({
      id: item.id,
      title: item.title,
      content: item.content_text,
      url: item.uri,
      timestamp: item.display_time,
      score: item.score,
      raw: item
    }));
  }
}
