const got = require('@/utils/got');

module.exports = async (ctx) => {
    const { data } = await got({
        method: 'get',
        url: `https://news.topurl.cn/api`,
    });
    const items = await Promise.all(
        data.data.newsList.map((item) => ({
            title: item.title,
            link: item.url,
            category: item.category,
            description: `分数: ${item.score}<br>分类: ${item.category}`,
        }))
    );

    ctx.state.data = {
        title: 'TopURL 热门新闻',
        link: 'https://news.topurl.cn',
        item: items,
    };
};
