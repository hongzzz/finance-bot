import { WscnArticle } from './types';

export interface NewsArticle {
  id: number | string;
  title?: string;
  content: string;
  url: string;
  timestamp: number;
  score?: number;
  raw: any;
}

export interface INewsSource {
  fetchLatest(): Promise<NewsArticle[]>;
}

export interface IStateStorage {
  getLastId(): Promise<string | number | null>;
  setLastId(id: string | number): Promise<void>;
}

export interface INotifier {
  notify(article: NewsArticle): Promise<void>;
}
