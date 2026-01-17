import { INewsSource, IStateStorage, INotifier } from '../interfaces';

export class FinanceBot {
  constructor(
    private source: INewsSource,
    private storage: IStateStorage,
    private notifier: INotifier
  ) { }

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
    for (const item of newItems) {
      try {
        await this.notifier.notify(item);
        console.log(`Sent item: ${item.id}`);

        // 5. Update state after each item to ensure "at least once" delivery semantics
        // even if the script crashes later
        await this.storage.setLastId(item.id);
      } catch (error) {
        console.error(`Stopping delivery at item ${item.id} due to error.`);
        throw error; // Halt execution so next run retries
      }
    }

    return `Processed ${newItems.length} items. Latest ID: ${newItems[newItems.length - 1].id}`;
  }
}
