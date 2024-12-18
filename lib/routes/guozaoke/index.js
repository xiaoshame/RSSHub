const cheerio = require('cheerio');
const got = require('@/utils/got');
const config = require('@/config').value;
const asyncPool = require('tiny-async-pool');
const { parseRelativeDate } = require('@/utils/parse-date');

module.exports = async (ctx) => {
    const url = 'https://www.guozaoke.com/';
    const res = await got({
        method: 'get',
        url,
        headers: {
            Cookie: config.guozaoke.cookies,
            'User-Agent': config.ua,
        },
    });
    const $ = cheerio.load(res.data);

    const list = $('div.topic-item').toArray();
    const maxItems = 20;

    const items = list
        .slice(0, maxItems)
        .map((i) => {
            const $item = $(i);
            const title = $item.find('h3.title a').text();
            const url = $item.find('h3.title a').attr('href');
            const author = $item.find('span.username a').text();
            const lastTouched = $item.find('span.last-touched').text();
            const pubDate = parseRelativeDate(lastTouched);
            const link = url ? url.split('#')[0] : undefined;
            return link ? { title, link, author, pubDate } : undefined;
        })
        .filter((item) => item !== undefined);
    const out = [];
    for await (const result of asyncPool(2, items, async (item) => {
        const url = `https://www.guozaoke.com${item.link}`;
        const res = await got({
            method: 'get',
            url,
            headers: {
                Cookie: config.guozaoke.cookies,
                'User-Agent': config.ua,
            },
        });

        const $ = cheerio.load(res.data);
        let content = $('div.ui-content').html();
        content = content ? content.trim() : '';
        const comments = $('.reply-item').map((i, el) => {
            const $el = $(el);
            const comment = $el.find('span.content').text().trim();
            const author = $el.find('span.username').text();
            return {
                comment,
                author,
            };
        });
        if (comments && comments.length > 0) {
            for (const item of comments) {
                content += '<br>' + item.author + ': ' + item.comment;
            }
        }
        item.description = content;
        return item;
    })) {
        out.push(result);
    }

    ctx.state.data = {
        title: '过早客',
        link: url,
        item: out,
    };
};
