const cheerio = require('cheerio');
const got = require('@/utils/got');
const config = require('@/config').value;
const asyncPool = require('tiny-async-pool');
const { parseRelativeDate } = require('@/utils/parse-date');

const baseUrl = 'https://www.guozaoke.com/';

module.exports = async (ctx) => {
    const headers = {
        Cookie: config.guozaoke.cookies,
    };
    const response = await got(baseUrl, { headers });
    const $ = cheerio.load(response.data);
    const itemsByLink = new Map();

    $('.topic-item').each((index, element) => {
        const topic = $(element);
        const anchor = topic.find('h3.title a').first();
        const path = anchor.attr('href');
        if (!path) {
            return;
        }
        const url = new URL(path, baseUrl);
        url.hash = '';
        const link = url.href;
        if (!itemsByLink.has(link)) {
            itemsByLink.set(link, {
                title: anchor.text().trim(),
                link,
                guid: link,
                author: topic.find('.username a').first().text().trim(),
                category: [topic.find('.node a').first().text().trim()].filter(Boolean),
            });
        }
    });

    const items = [...itemsByLink.values()].slice(0, 20);
    const results = new Map();
    for await (const item of asyncPool(5, items, async (item) => {
        const detail = await ctx.cache.tryGet(`guozaoke:topic:${item.link}`, async () => {
            const response = await got(item.link, { headers });
            const $ = cheerio.load(response.data);
            const content = $('.topic-detail > .ui-content').first();
            const comments = $('.reply-item')
                .toArray()
                .map((element) => {
                    const reply = $(element);
                    const body = reply.find('.content').first();
                    if (!body.html()?.trim()) {
                        return '';
                    }
                    const author = reply.find('.username').first().text().trim();
                    const comment = $('<blockquote></blockquote>');
                    comment.append($('<p></p>').append($('<strong></strong>').text(author)));
                    comment.append(body.clone());
                    return $.html(comment);
                })
                .filter(Boolean);
            const description = $('<div></div>').append(content.html() || '');
            if (comments.length) {
                description.append(`<hr><h3>评论（${comments.length}）</h3>${comments.join('')}`);
            }
            description.find('[href], [src]').each((index, element) => {
                const target = $(element);
                for (const attribute of ['href', 'src']) {
                    const value = target.attr(attribute);
                    if (value) {
                        target.attr(attribute, new URL(value, item.link).href);
                    }
                }
            });
            const createdTime = $('.topic-detail .created-time')
                .first()
                .text()
                .replace(/^\s*发表于\s*/, '')
                .trim();
            const pubDate = createdTime ? parseRelativeDate(createdTime) : undefined;
            return {
                description: description.html(),
                pubDate: pubDate && Number.isFinite(pubDate.getTime()) ? pubDate : undefined,
            };
        });
        return { ...item, ...detail };
    })) {
        results.set(item.link, item);
    }

    ctx.state.data = {
        title: '过早客',
        link: baseUrl,
        item: items.map((item) => results.get(item.link)),
    };
};
