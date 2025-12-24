const { parseDate } = require('@/utils/parse-date');
const parser = require('@/utils/rss-parser');
const logger = require('@/utils/logger');

module.exports = async (ctx) => {
    const limit = ctx.query.limit ? Number.parseInt(ctx.query.limit, 10) : 20;
    const rootUrl = 'https://forum.naixi.net';
    const rssUrl = `${rootUrl}/forum.php?mod=rss`;

    logger.http(`Naixi RSS: Requesting ${rssUrl}`);

    const browser = await require('@/utils/puppeteer')({ stealth: true });
    let response;
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
        logger.error(`Naixi RSS: Request failed: ${error.message}`);
        browser.close();
        throw error;
    }
    browser.close();

    logger.info(`Naixi RSS: Response received, length: ${response.length}`);
    logger.debug(`Naixi RSS: Response body (first 500 chars): ${response.substring(0, 500)}`);

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
