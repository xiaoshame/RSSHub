const got = require('@/utils/got');
const { parseDate } = require('@/utils/parse-date');
const parser = require('@/utils/rss-parser');
const logger = require('@/utils/logger');

module.exports = async (ctx) => {
    const limit = ctx.query.limit ? Number.parseInt(ctx.query.limit, 10) : 20;
    const rootUrl = 'https://forum.naixi.net';
    const rssUrl = `${rootUrl}/forum.php?mod=rss`;

    logger.http(`Naixi RSS: Requesting ${rssUrl}`);

    let response;
    try {
        response = await got({
            method: 'get',
            url: rssUrl,
            headers: {
                accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8,ja;q=0.7,zh-TW;q=0.6',
                priority: 'u=0, i',
                'sec-ch-ua': '"Google Chrome";v="143", "Chromium";v="143", "Not A(Brand";v="24"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"Windows"',
                'sec-fetch-dest': 'document',
                'sec-fetch-mode': 'navigate',
                'sec-fetch-site': 'none',
                'sec-fetch-user': '?1',
                'upgrade-insecure-requests': '1',
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',
            },
        });
    } catch (error) {
        logger.error(`Naixi RSS: Request failed with status: ${error.response?.statusCode}`);
        logger.error(`Naixi RSS: Response headers: ${JSON.stringify(error.response?.headers)}`);
        logger.error(`Naixi RSS: Response body: ${error.response?.body?.substring(0, 1000)}`);
        throw error;
    }

    logger.info(`Naixi RSS: Response status: ${response.statusCode}`);
    logger.info(`Naixi RSS: Response headers: ${JSON.stringify(response.headers)}`);
    logger.debug(`Naixi RSS: Response body (first 500 chars): ${response.body?.substring(0, 500)}`);

    const feed = await parser.parseString(response.data);

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
