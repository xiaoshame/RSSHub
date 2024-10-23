const got = require('@/utils/got');
const date = require('@/utils/date');

module.exports = async (ctx) => {
    const rootUrl = `https://www.boyouquan.com/api/posts?sort=latest&keyword=&page=1`;
    const response = await got({
        method: 'get',
        url: rootUrl,
    });

    const jsonData = response.data;
    const items = await Promise.all(
        jsonData.results.map((item) => {
            // 拼接描述信息
            const title = item.title;
            const description = item.description;
            const author = item.blogName;
            const link = item.link;
            const puDate = date(item.publishedAt);

            return {
                title,
                link,
                description,
                author,
                pubDate: puDate,
            };
        })
    );

    ctx.state.data = {
        title: '博友圈',
        link: `https://www.boyouquan.com/home?sort=latest`,
        item: items,
    };
};
