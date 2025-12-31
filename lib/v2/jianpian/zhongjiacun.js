const { parseRelativeDate } = require('@/utils/parse-date');
const got = require('@/utils/got');

module.exports = async (ctx) => {
    const response = await got({
        method: 'post',
        url: 'https://pc-api.jianpian.cn/v1/template/search',
        headers: {
            'content-type': 'application/json',
            'epian-user-id': '0',
            'pc-agent': 'pc_epian',
            origin: 'https://www.jianpian.cn',
            referer: 'https://www.jianpian.cn/',
        },
        json: {
            title: '钟家村小学',
            page: 1,
            type: 3,
            size: 80,
        },
    });

    const list = response.data.data.peer || [];

    const result = list
        .map((item) => ({
            title: item.title.replaceAll(/<[^>]+>/g, ''),
            link: item.url,
            pubDate: parseRelativeDate(item.list_time_str),
            author: item.user?.nickname,
        }))
        .filter((item) => item.title.includes('钟家村小学') || item.author?.includes('钟家村小学'));

    ctx.state.data = {
        title: '钟家村小学',
        link: 'https://www.jianpian.cn/mpage/2oic2',
        item: result,
    };
};
