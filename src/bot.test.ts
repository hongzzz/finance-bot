import { checkAndSendNews } from './bot';
import { Redis } from '@upstash/redis';
import axios from 'axios';
import { sendToFeishu } from './feishu';

jest.mock('@upstash/redis', () => {
    const mRedis = {
        get: jest.fn(),
        set: jest.fn(),
    };
    return {
        Redis: jest.fn(() => mRedis),
    };
});
jest.mock('axios');
jest.mock('./feishu');

const mockRedis = new (require('@upstash/redis').Redis)();

describe('checkAndSendNews', () => {
    const config = {
        redisUrl: 'http://localhost:8080',
        redisToken: 'token',
        webhookUrl: 'http://feishu.webhook',
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should filter and send only new items in chronological order', async () => {
        const mockItems = [
            { id: 102, content_text: 'Old news', display_time: 123, uri: 'url' },
            { id: 105, content_text: 'New news 2', display_time: 125, uri: 'url' },
            { id: 104, content_text: 'New news 1', display_time: 124, uri: 'url' },
        ];

        (axios.get as jest.Mock).mockResolvedValue({ data: { data: { items: mockItems } } });
        (mockRedis.get as jest.Mock).mockResolvedValue(103);

        await checkAndSendNews(config);

        expect(sendToFeishu).toHaveBeenCalledTimes(2);
        // Should be called with id 104 then 105 (sorted)
        expect(sendToFeishu).toHaveBeenNthCalledWith(1, config.webhookUrl, mockItems[2]);
        expect(sendToFeishu).toHaveBeenNthCalledWith(2, config.webhookUrl, mockItems[1]);
    });

    it('should stop and throw error if Feishu delivery fails', async () => {
        const mockItems = [
            { id: 104, content_text: 'News 1', display_time: 124, uri: 'url' },
            { id: 105, content_text: 'News 2', display_time: 125, uri: 'url' },
        ];

        (axios.get as jest.Mock).mockResolvedValue({ data: { data: { items: mockItems } } });
        (mockRedis.get as jest.Mock).mockResolvedValue(103);
        (sendToFeishu as jest.Mock).mockRejectedValueOnce(new Error('Feishu error'));

        await expect(checkAndSendNews(config)).rejects.toThrow('Feishu error');

        expect(sendToFeishu).toHaveBeenCalledTimes(1);
        expect(mockRedis.set).not.toHaveBeenCalled();
    });
});
