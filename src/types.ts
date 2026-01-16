export interface WscnArticle {
  id: number;
  content_text: string;
  display_time: number;
  uri: string;
  title?: string;
  score?: number; // Importance score
}

export interface WscnResponse {
  code: number;
  data: {
    items: WscnArticle[];
    next_cursor: string;
  };
}
