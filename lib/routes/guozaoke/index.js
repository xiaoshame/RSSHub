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
        const comments = $('.reply-item')
            .toArray()
            .map((el) => {
                const $el = $(el);
                const $comment = $el.find('span.content').first();
                const comment = $comment.html()?.trim();
                const author = $el.find('span.username').first().text().trim();

                if (!comment) {
                    return null;
                }

                $comment.find('[href], [src]').each((index, element) => {
                    const $element = $(element);
                    for (const attribute of ['href', 'src']) {
                        const value = $element.attr(attribute);
                        if (value) {
                            $element.attr(attribute, new URL(value, url).href);
                        }
                    }
                });

                const $reply = $('<blockquote></blockquote>');
                $reply.append($('<p></p>').append($('<strong></strong>').text(author || '匿名用户')));
                $reply.append($('<div></div>').html($comment.html()));
                return $.html($reply);
            })
            .filter(Boolean);

        if (comments.length > 0) {
            content += `<hr><h3>评论（${comments.length}）</h3>${comments.join('')}`;
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
