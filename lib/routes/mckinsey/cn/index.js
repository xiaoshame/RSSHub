const cheerio = require('cheerio');
const got = require('@/utils/got');
const { parseRelativeDate } = require('@/utils/parse-date');

module.exports = async (ctx) => {
    const url = 'https://www.mckinsey.com.cn/insights/banking-insurance/';
    const res = await got({
        method: 'get',
        url,
        headers: {
            accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8,ja;q=0.7,zh-TW;q=0.6',
            cookie: 'ak_bmsc=71F206D976FBE715458180080E8FA912~000000000000000000000000000000~YAAQpm2bG4+bAOaTAQAAiR+hBRr0/3nDqw2NCVC4DghqHP9jOz19YoREtC32mauP51dccrFOrPEcrNmR3cvSL11c7fw6VKsAqa0x7RifY65eSYaxkbJ/d5pd6l4WhO1H5qfwr/xlXS5qxFSzQ/pTKfOrX1WaneJEhFKWArNkqRzr4vnpS5o313Z+uhfEuSS75ySUSeu7W7QoVA55WFOYncy57FeY0ZEhh5B3V2Hw3mJzFTRchYl3+yY8KxKJ4Is3XKyyUogm9wmeNp1h4w4cJQFuINfEgJuE0u2rFKgKm7aixnQj5CEB3aj7ZIoOCHnptbGuw59XKopcgeTFRn0OB31neNn8UQUMApQyH2uQxpyvldrq0KUWkcRID94pCPveSNhvXxsKvjNB3E4owixw',
            priority: 'u=0, i',
            referer: 'https://www.mckinsey.com.cn/insights/macroeconomy/',
            'sec-ch-ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'sec-fetch-dest': 'document',
            'sec-fetch-mode': 'navigate',
            'sec-fetch-site': 'same-origin',
            'sec-fetch-user': '?1',
            'upgrade-insecure-requests': '1',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
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
