import { INotifier, NewsArticle } from '../interfaces';

/**
 * CompositeNotifier broadcasts notifications to multiple notifiers.
 * If any notifier fails, it logs the error but continues with the rest.
 */
export class CompositeNotifier implements INotifier {
  private notifiers: INotifier[];

  constructor(notifiers: INotifier[]) {
    this.notifiers = notifiers.filter(n => n !== null && n !== undefined);
  }

  async notify(article: NewsArticle): Promise<void> {
    if (this.notifiers.length === 0) {
      console.warn('No notifiers configured, skipping send.');
      return;
    }

    const results = await Promise.allSettled(
      this.notifiers.map(notifier => notifier.notify(article))
    );

    const failures: string[] = [];
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        failures.push(`Notifier ${index}: ${result.reason}`);
      }
    });

    if (failures.length > 0) {
      console.error('Some notifiers failed:', failures.join('; '));
      // Don't throw - we still want to mark the item as processed
      // if at least one notifier succeeded
      if (failures.length === results.length) {
        throw new Error('All notifiers failed');
      }
    }
  }
}
