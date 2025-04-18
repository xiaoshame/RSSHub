const got = require('@/utils/got');

module.exports = async (ctx) => {
    const { data } = await got({
        method: 'get',
        url: `https://news.topurl.cn/api`,
    });
    const items = await Promise.all(
        data.data.newsList.map(async (item) => {
            const cache = await ctx.cache.get(item.url);
            if (cache) {
                return null;
            }
            const single = {
                title: item.title,
                link: item.url,
                category: item.category,
                description: `分数: ${item.score}<br>分类: ${item.category}`,
            };
            ctx.cache.set(item.url, JSON.stringify(single));
            return single;
        })
    );
    // 过滤掉 null 值
    const filteredItems = items.filter((item) => item !== null);
    ctx.state.data = {
        title: 'TopURL 热门新闻',
        link: 'https://news.topurl.cn',
        item: filteredItems,
    };
};
