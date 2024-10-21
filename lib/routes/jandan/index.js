const got = require('@/utils/got');

async function crawl(startId, limit, items) {
    if (items.length >= limit) {
        return items;
    }
    try {
        const url = `https://api.jandan.net/api/v1/comment/list/108629${startId ? `?start_id=${startId}` : ''}`;
        const response = await got({
            method: 'get',
            url,
        });
        const jsonData = response.data;

        const resData = jsonData.data.map((item) => ({
            title: item.author,
            description: `<img src="${item.images[0].url}">`,
            pubDate: item.date,
            link: `https://jandan.net/t/${item.id}`,
            author: item.author,
        }));
        const lastItemId = jsonData.data?.at(-1)?.id;
        return crawl(lastItemId, limit, items.concat(resData));
    } catch {
        return items;
    }
}

module.exports = async (ctx) => {
    const limit = 60;
    const items = [];
    const out = await crawl(undefined, limit, items);

    ctx.state.data = {
        title: '妹子图 - 煎蛋',
        link: 'https://jandan.net',
        item: out,
    };
};
