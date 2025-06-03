const got = require('@/utils/got');
const cheerio = require('cheerio');
const config = require('@/config').value;
const logger = require('@/utils/logger');

module.exports = async (ctx) => {
    const currentUrl = 'https://linux.do/latest.rss';
    logger.info('token: 111');
    logger.info('token: ' + config.linuxdo.cookies);
    const response = await got({
        method: 'get',
        url: currentUrl,
        headers: {
            Cookie: config.linuxdo.cookies,
            'User-Agent': config.ua,
        },
    });

    const $ = cheerio.load(response.data, { xmlMode: true });
    logger.info('data ' + response.data);
    const entries = $('item').toArray();
    logger.info('data ' + response.data);
    const items = await Promise.all(
        entries
            .map((i) => {
                const element = $(i);
                const link = element.find('link').attr('href');
                if (ctx.cache.get(link)) {
                    return;
                }
                return {
                    title: element.find('title').text(),
                    link: element.find('link').text(),
                    pubDate: element.find('pubDate').text(),
                    category: element.find('category').text(),
                    description: element.find('description').text(),
                };
            })
            .filter((item) => item !== undefined)
    );

    ctx.state.data = {
        title: `linux.do 最新话题`,
        link: currentUrl,
        item: items,
    };
};
