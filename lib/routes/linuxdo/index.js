const got = require('@/utils/got');
const cheerio = require('cheerio');

module.exports = async (ctx) => {
    const currentUrl = 'https://linuxdo.apiok.eu.org/latest.rss';
    const response = await got({
        method: 'get',
        url: currentUrl,
    });

    const $ = cheerio.load(response.data, { xmlMode: true });
    const entries = $('item').toArray();
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
