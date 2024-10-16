const Parser = require('rss-parser');

module.exports = async (ctx) => {
    const rssUrl = `https://cn.nikkei.com/rss.html`;

    const parser = new Parser();
    const feed = await parser.parseURL(rssUrl);
    const items = feed.map((item) => ({
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
