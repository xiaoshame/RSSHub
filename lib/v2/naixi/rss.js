const got = require('@/utils/got');
const { parseDate } = require('@/utils/parse-date');
const parser = require('@/utils/rss-parser');
const logger = require('@/utils/logger');
const config = require('@/config').value;

module.exports = async (ctx) => {
    const limit = ctx.query.limit ? Number.parseInt(ctx.query.limit, 10) : 20;
    const rootUrl = 'https://forum.naixi.net';
    const rssUrl = `${rootUrl}/forum.php?mod=rss`;

    logger.http(`Naixi RSS: Requesting ${rssUrl}`);

    let response;

    // 优先使用 Puppeteer（如果可用）
    if (config.puppeteerWSEndpoint) {
        logger.info('Naixi RSS: Using Puppeteer with remote endpoint');
        const browser = await require('@/utils/puppeteer')({ stealth: true });
        try {
            const page = await browser.newPage();
            await page.setRequestInterception(true);
            page.on('request', (request) => {
                request.resourceType() === 'document' || request.resourceType() === 'xhr' ? request.continue() : request.abort();
            });
            await page.goto(rssUrl, {
                waitUntil: 'networkidle0',
            });
            response = await page.content();
            page.close();
        } catch (error) {
            logger.error(`Naixi RSS: Puppeteer request failed: ${error.message}`);
            browser.close();
            throw error;
        }
        browser.close();
    } else {
        // 回退到 got 方式
        logger.info('Naixi RSS: Using got (Puppeteer not available)');
        try {
            const res = await got({
                method: 'get',
                url: rssUrl,
                headers: {
                    accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                    'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8,ja;q=0.7,zh-TW;q=0.6',
                    priority: 'u=0, i',
                    'sec-ch-ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
                    'sec-ch-ua-mobile': '?0',
                    'sec-ch-ua-platform': '"Windows"',
                    'sec-fetch-dest': 'document',
                    'sec-fetch-mode': 'navigate',
                    'sec-fetch-site': 'none',
                    'sec-fetch-user': '?1',
                    'upgrade-insecure-requests': '1',
                    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                },
            });
            response = res.data;
        } catch (error) {
            logger.error(`Naixi RSS: got request failed: ${error.message}`);
            throw new Error('Naixi RSS requires Puppeteer. Please set PUPPETEER_WS_ENDPOINT environment variable.');
        }
    }

    logger.info(`Naixi RSS: Response received, length: ${response.length}`);

    const feed = await parser.parseString(response);

    const items = feed.items.slice(0, limit).map((item) => ({
        title: item.title,
        link: item.link,
        description: item.content || item.contentSnippet,
        category: item.categories,
        author: item.creator || item.author,
        pubDate: parseDate(item.pubDate),
    }));

    ctx.state.data = {
        title: feed.title,
        link: feed.link,
        description: feed.description,
        image: feed.image?.url,
        item: items,
    };
};
