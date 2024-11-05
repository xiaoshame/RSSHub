const got = require('@/utils/got');
const { parseDate } = require('@/utils/parse-date');
const timezone = require('@/utils/timezone');
const cheerio = require('cheerio');

async function fetchFeedAndParse(finderUrl, ctx) {
    const response = await got({
        method: 'get',
        url: finderUrl,
    });
    const $ = cheerio.load(response.data, { xmlMode: true });
    const entries = $('entry').toArray();

    const items = await Promise.all(
        entries.map((i) => {
            const element = $(i);
            const link = element.find('link').attr('href').replace('?utm_source=blogfinder', '');
            if (ctx.cache.get(link)) {
                return;
            }
            return ctx.cache.tryGet(link, () => {
                const cachedData = {
                    title: `${element.find('author > name').text()}: ${element.find('title').text()}`,
                    link,
                    description: element.find('summary').text(),
                    author: element.find('author > name').text(),
                    pubDate: element.find('published').text(),
                };
                return cachedData;
            });
        })
    );

    return items.filter((item) => item !== undefined); // 返回处理后的条目数组
}

module.exports = async (ctx) => {
    const urls = ['https://www.boyouquan.com/api/posts?sort=latest&keyword=&page=1', 'https://www.boyouquan.com/api/posts?sort=latest&keyword=&page=2'];
    const fetchAndCacheItem = (item) =>
        ctx.cache.tryGet(item.link, () => {
            const result = {
                title: `${item.blogName}: ${item.title}`,
                link: item.link,
                description: item.description,
                author: item.blogName,
                pubDate: timezone(parseDate(item.publishedAt), +8),
            };
            return result;
        });
    const [item1, item2] = await Promise.all(
        urls.map(async (url) => {
            const response = await got({
                method: 'get',
                url,
            });

            const jsonData = response.data;
            const promises = jsonData.results.map(fetchAndCacheItem);
            return Promise.all(promises);
        })
    );
    const finderurl = 'https://bf.zzxworld.com/feed.xml';
    const itme3 = await fetchFeedAndParse(finderurl, ctx);

    const items = item1.concat(item2).concat(itme3);

    ctx.state.data = {
        title: '博友圈&BlogFinder',
        link: 'https://www.boyouquan.com/home?sort=latest',
        item: items,
    };
};
