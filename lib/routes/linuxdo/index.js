const got = require('@/utils/got');
const cheerio = require('cheerio');
const config = require('@/config').value;

module.exports = async (ctx) => {
    const currentUrl = 'https://linux.do/latest.rss';
    const token = config.linuxdo.cookies;
    const response = await got({
        method: 'get',
        url: currentUrl,
        headers: {
            accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8,ja;q=0.7,zh-TW;q=0.6',
            priority: 'u=0, i',
            'sec-ch-ua': '"Chromium";v="136", "Google Chrome";v="136", "Not.A/Brand";v="99"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'sec-fetch-dest': 'document',
            'sec-fetch-mode': 'navigate',
            'sec-fetch-site': 'none',
            'sec-fetch-user': '?1',
            'upgrade-insecure-requests': '1',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
            cookie: token,
        },
    });
    const $ = cheerio.load(response.data, { xmlMode: true });
    const entries = $('item').toArray();

    const items = await Promise.all(
        entries
            .map((i) => {
                const element = $(i);
                const link = element.find('link').attr('href');
                if (ctx.cache.get(link)) {
                    return;
                }
                return {
                    title: element.find('title').text(),
                    link: element.find('link').text(),
                    pubDate: element.find('pubDate').text(),
                    category: element.find('category').text(),
                    description: element.find('description').text(),
                };
            })
            .filter((item) => item !== undefined)
    );

    ctx.state.data = {
        title: `linux.do 最新话题`,
        link: currentUrl,
        item: items,
    };
};
