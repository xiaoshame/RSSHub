const got = require('@/utils/got');
const date = require('@/utils/date');

module.exports = async (ctx) => {
    const urls = ['https://www.boyouquan.com/api/posts?sort=latest&keyword=&page=1', 'https://www.boyouquan.com/api/posts?sort=latest&keyword=&page=2'];
    const fetchAndCacheItem = (item) =>
        ctx.cache.tryGet(item.link, () => {
            const result = {
                title: `${item.blogName}: ${item.title}`,
                link: item.link,
                description: item.description,
                author: item.blogName,
                pubDate: date(item.publishedAt), // 确保 date 是已定义的函数
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

    const items = item1.concat(item2);

    ctx.state.data = {
        title: '博友圈',
        link: 'https://www.boyouquan.com/home?sort=latest',
        item: items,
    };
};
