import { INewsSource, IStateStorage, INotifier } from '../interfaces';

export interface FinanceBotOptions {
  /** Only items with score >= minScore are pushed. Others are skipped but still marked as processed. */
  minScore?: number;
}

export class FinanceBot {
  private minScore: number;

  constructor(
    private source: INewsSource,
    private storage: IStateStorage,
    private notifier: INotifier,
    options: FinanceBotOptions = {}
  ) {
    this.minScore = options.minScore ?? 2;
  }

  async run(): Promise<string> {
    // 1. Fetch latest news
    const items = await this.source.fetchLatest();

    if (items.length === 0) {
      return 'No items found from source';
    }

    // 2. Get last processed ID
    const lastId = Number(await this.storage.getLastId()) || 0;
    console.log(`Last processed ID: ${lastId}`);

    // 3. Filter new items
    const newItems = items
      .filter(item => Number(item.id) > lastId)
      .sort((a, b) => Number(a.id) - Number(b.id));

    if (newItems.length === 0) {
      return 'No new items to send';
    }

    console.log(`Found ${newItems.length} new items.`);

    // 4. Process items
    let sent = 0;
    for (const item of newItems) {
      try {
        // Business Rule: only push important news; skipped items still advance last_id
        if ((item.score ?? 0) >= this.minScore) {
          await this.notifier.notify(item);
          sent++;
          console.log(`Sent item: ${item.id} (score: ${item.score})`);
        } else {
          console.log(`Skipped item: ${item.id} (score: ${item.score})`);
        }

        // 5. Update state after each item to ensure "at least once" delivery semantics
        // even if the script crashes later
        await this.storage.setLastId(item.id);
      } catch (error) {
        console.error(`Stopping delivery at item ${item.id} due to error.`);
        throw error; // Halt execution so next run retries
      }
    }

    return `Processed ${newItems.length} items, sent ${sent}. Latest ID: ${newItems[newItems.length - 1].id}`;
  }
}
