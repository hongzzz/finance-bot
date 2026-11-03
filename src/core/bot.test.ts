import { FinanceBot } from './bot';
import { INewsSource, IStateStorage, INotifier, NewsArticle } from '../interfaces';

// Mocks
class MockSource implements INewsSource {
  items: NewsArticle[] = [];
  async fetchLatest() { return this.items; }
}

class MockStorage implements IStateStorage {
  lastId: string | number | null = null;
  async getLastId() { return this.lastId; }
  async setLastId(id: string | number) { this.lastId = id; }
}

class MockNotifier implements INotifier {
  notifiedItems: NewsArticle[] = [];
  async notify(article: NewsArticle) { this.notifiedItems.push(article); }
}

describe('FinanceBot Core Logic', () => {
  let bot: FinanceBot;
  let source: MockSource;
  let storage: MockStorage;
  let notifier: MockNotifier;

  beforeEach(() => {
    source = new MockSource();
    storage = new MockStorage();
    notifier = new MockNotifier();
    bot = new FinanceBot(source, storage, notifier);
  });

  it('should process new important items and update state', async () => {
    // Setup
    storage.lastId = 100;
    source.items = [
      { id: 100, title: 'Old', content: '...', url: '...', timestamp: 1000, score: 5, raw: {} }, // Old
      { id: 101, title: 'Low Score', content: '...', url: '...', timestamp: 1001, score: 1, raw: {} }, // New but low score
      { id: 102, title: 'Important', content: '...', url: '...', timestamp: 1002, score: 3, raw: {} }, // New and important
    ];

    // Run
    const result = await bot.run();

    // Assert
    // 1. Should filter out ID 100
    // 2. Should see 101 and 102 as new items
    
    // Check Notification: only 102 (101 is below the default minScore of 2)
    expect(notifier.notifiedItems.map(i => i.id)).toEqual([102]);

    // Check State Update: Should end up at 102 (skipped items still marked processed)
    expect(storage.lastId).toBe(102);

    expect(result).toContain('Processed 2 items, sent 1');
  });

  it('should still advance last_id when every new item is skipped', async () => {
    storage.lastId = 100;
    source.items = [
      { id: 101, content: '...', url: '...', timestamp: 1001, score: 1, raw: {} },
      { id: 102, content: '...', url: '...', timestamp: 1002, raw: {} }, // missing score
    ];

    await bot.run();

    expect(notifier.notifiedItems).toHaveLength(0);
    expect(storage.lastId).toBe(102);
  });

  it('should respect a custom minScore', async () => {
    bot = new FinanceBot(source, storage, notifier, { minScore: 1 });
    storage.lastId = 100;
    source.items = [
      { id: 101, content: '...', url: '...', timestamp: 1001, score: 1, raw: {} },
      { id: 102, content: '...', url: '...', timestamp: 1002, score: 2, raw: {} },
    ];

    await bot.run();

    expect(notifier.notifiedItems.map(i => i.id)).toEqual([101, 102]);
  });

  it('should handle unordered input and process chronologically', async () => {
    storage.lastId = 100;
    source.items = [
      { id: 103, title: 'Newer', content: '...', url: '...', timestamp: 1003, score: 3, raw: {} },
      { id: 101, title: 'Older', content: '...', url: '...', timestamp: 1001, score: 3, raw: {} },
      { id: 102, title: 'Middle', content: '...', url: '...', timestamp: 1002, score: 3, raw: {} },
    ];

    await bot.run();

    // Notifier should have received them in order: 101, 102, 103
    expect(notifier.notifiedItems.map(i => i.id)).toEqual([101, 102, 103]);
    expect(storage.lastId).toBe(103);
  });

  it('should stop processing if notification fails', async () => {
    storage.lastId = 100;
    source.items = [
      { id: 101, title: 'First', content: '...', url: '...', timestamp: 1001, score: 3, raw: {} },
      { id: 102, title: 'Second', content: '...', url: '...', timestamp: 1002, score: 3, raw: {} },
    ];

    // Mock notifier to fail on first item
    notifier.notify = jest.fn().mockRejectedValueOnce(new Error('Network Error'));

    await expect(bot.run()).rejects.toThrow('Network Error');

    // Storage should NOT have updated for 101 (or 102) because it failed
    // Wait, let's check the code:
    // await this.notifier.notify(item);
    // await this.storage.setLastId(item.id);
    // So if notify fails, setLastId is NOT called.
    
    expect(storage.lastId).toBe(100); 
  });
});
