const got = require('@/utils/got');
const Parser = require('rss-parser');
const cheerio = require('cheerio');

async function getContent(link) {
    const res = await got({
        method: 'get',
        url: link,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
        },
    });

    const $ = cheerio.load(res.data);
    const content = $('div.newsText.fix').html();
    return content ? content : '';
}

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
        link: item.link,
        pubDate: item.pubDate,
    }));

    const out = await Promise.all(
        items.map(async (item) => {
            const description = await getContent(item.link);
            return {
                title: item.title,
                description,
                pubDate: item.pubDate,
                link: item.link,
            };
        })
    );

    ctx.state.data = {
        title: `日经中文网--日本经济新闻中文版`,
        description: `日经中文网--日本经济新闻中文版`,
        link: `https://cn.nikkei.com`,
        item: out,
    };
};
