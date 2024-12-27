const cheerio = require('cheerio');
const got = require('@/utils/got');
const { parseRelativeDate } = require('@/utils/parse-date');

module.exports = async (ctx) => {
    const url = 'https://www.mckinsey.com.cn/insights/banking-insurance/';
    const res = await got({
        method: 'get',
        url,
        headers: {
            Referer: 'https://www.mckinsey.com.cn/insights/',
            'Upgrade-Insecure-Requests': '1',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            'sec-ch-ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': 'Windows',
        },
    });
    const $ = cheerio.load(res.data);

    const targetNav = $('nav[role="navigation"][aria-label="Recent"]');
    if (!targetNav) {
        return null;
    }
    const list = targetNav.find('li').get();

    const items = list
        .map((i) => {
            const $item = $(i);
            const title = $item.find('.rpwwt-post-title').text();
            const link = $item.find('a').attr('href');
            const lastTouched = $item.find('.rpwwt-post-date').text();
            const pubDate = parseRelativeDate(lastTouched);
            return link ? { title, link, pubDate } : undefined;
        })
        .filter((item) => item !== undefined);

    ctx.state.data = {
        title: `McKinsey Greater China`,
        link: `https://www.mckinsey.com.cn`,
        item: items,
    };
};
