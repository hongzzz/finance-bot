import { INotifier, NewsArticle } from '../interfaces';

export class CompositeNotifier implements INotifier {
  private notifiers: INotifier[];

  constructor(notifiers: INotifier[]) {
    this.notifiers = notifiers;
  }

  async notify(article: NewsArticle): Promise<void> {
    await Promise.all(this.notifiers.map(n => n.notify(article)));
  }
}
