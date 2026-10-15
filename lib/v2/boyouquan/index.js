const got = require('@/utils/got');
const { parseDate } = require('@/utils/parse-date');
const timezone = require('@/utils/timezone');

module.exports = async (ctx) => {
    const pages = await Promise.all(
        [1, 2].map(async (page) => {
            const response = await got({
                method: 'get',
                url: `https://www.boyouquan.com/api/posts?sort=latest&keyword=&page=${page}`,
            });
            return response.data.results;
        })
    );

    const seen = new Set();
    const items = pages
        .flat()
        .filter((item) => {
            if (seen.has(item.link)) {
                return false;
            }
            seen.add(item.link);
            return true;
        })
        .map((item) => ({
            title: `${item.blogName}: ${item.title}`,
            link: item.link,
            description: item.description,
            author: item.blogName,
            pubDate: timezone(parseDate(item.publishedAt, 'YYYY/MM/DD HH:mm:ss'), +8),
        }));

    ctx.state.data = {
        title: '博友圈',
        link: 'https://www.boyouquan.com/home?sort=latest',
        description: '博友圈最新博客文章',
        language: 'zh-CN',
        item: items,
    };
};
