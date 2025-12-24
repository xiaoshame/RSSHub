const got = require('@/utils/got');
const config = require('@/config').value;
const { parseDate } = require('@/utils/parse-date');
const parser = require('@/utils/rss-parser');

module.exports = async (ctx) => {
    const limit = ctx.query.limit ? Number.parseInt(ctx.query.limit, 10) : 20;
    const rootUrl = 'https://forum.naixi.net';
    const rssUrl = `${rootUrl}/forum.php?mod=rss`;
    const cookie = config.naixi.cookie;

    if (!cookie) {
        throw new Error('Naixi RSS is disabled due to the lack of <a href="https://docs.rsshub.app/install/#pei-zhi-bu-fen-rss-mo-kuai-pei-zhi">relevant config</a>');
    }

    const response = await got({
        method: 'get',
        url: rssUrl,
        headers: {
            accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',
            cookie,
        },
    });

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
