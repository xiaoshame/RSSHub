const got = require('@/utils/got');
const cheerio = require('cheerio');

const ProcessFeed = (list, caches) =>
    Promise.all(
        list.map((item) => {
            const $item = cheerio.load(item);
            const $titleContainer = $item('.title-container');
            const $title = $item('.title');
            const itemUrl = $titleContainer.attr('href').toString();
            return caches.tryGet(itemUrl, () => ({
                title: $title.text(),
                link: itemUrl,
            }));
        })
    );

module.exports = async (ctx) => {
    const response = await got({
        method: 'get',
        url: 'https://www.jianpian.cn/mpage/2oic2',
        headers: {
            Referer: 'https://www.jianpian.cn',
        },
    });

    const data = response.data;

    const $ = cheerio.load(data);
    const list = $('.list-detail').get();

    const result = await ProcessFeed(list, ctx.cache);

    ctx.state.data = {
        title: '钟家村小学',
        link: 'https://www.jianpian.cn/mpage/2oic2',
        description: $('meta[name="description"]').attr('content'),
        item: result,
    };
};
