const got = require('@/utils/got');
const Parser = require('rss-parser');

module.exports = async (ctx) => {
    const rssUrl = `https://cn.nikkei.com/rss.html`;
    const response = await got({
        method: 'get',
        url: rssUrl,
        headers: {
            Referer: `https://cn.nikkei.com/`,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
        },
    });

    const parser = new Parser();
    const feed = await parser.parseString(response.data.replace('<rss version="">', '<rss version="2">'));
    const items = feed.items.map((item) => ({
        title: item.title,
        description: item.content,
        link: item.link,
        pubDate: item.pubDate,
    }));

    ctx.state.data = {
        title: `日经中文网--日本经济新闻中文版`,
        description: `日经中文网--日本经济新闻中文版`,
        link: `https://cn.nikkei.com`,
        item: items,
    };
};
