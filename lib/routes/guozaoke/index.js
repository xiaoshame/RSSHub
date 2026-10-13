const cheerio = require('cheerio');
const got = require('@/utils/got');
const config = require('@/config').value;
const asyncPool = require('tiny-async-pool');
const { parseRelativeDate } = require('@/utils/parse-date');

module.exports = async (ctx) => {
    const url = 'https://www.guozaoke.com/';
    const maxItems = 20;
    const minAge = 24 * 60 * 60 * 1000;
    const deadline = Date.now() + 8000;
    const itemsByLink = new Map();
    const pageResults = await Promise.allSettled(
        [1, 2, 3].map((page) =>
            got({
                method: 'get',
                url: page === 1 ? url : `${url}?p=${page}`,
                timeout: { request: 4000 },
                retry: { limit: 0 },
                headers: {
                    Cookie: config.guozaoke.cookies,
                    'User-Agent': config.ua,
                },
            })
        )
    );
    const pages = pageResults.filter((result) => result.status === 'fulfilled').map((result) => result.value);
    if (pages.length === 0) {
        throw pageResults[0].reason;
    }
    for (const res of pages) {
        const $ = cheerio.load(res.data);
        const list = $('div.topic-item').toArray();

        for (const i of list) {
            const $item = $(i);
            const title = $item.find('h3.title a').text();
            const topicPath = $item.find('h3.title a').attr('href');
            const author = $item.find('span.username a').text();
            const topicUrl = topicPath ? new URL(topicPath, url) : undefined;
            if (topicUrl) {
                topicUrl.hash = '';
            }
            const link = topicUrl?.href;
            if (link && !itemsByLink.has(link)) {
                itemsByLink.set(link, { title, link, guid: link, author });
            }
        }
        if (list.length === 0) {
            break;
        }
    }
    const items = [...itemsByLink.values()].slice(0, maxItems);
    const out = [];
    for await (const result of asyncPool(5, items, async (item) => {
        const remainingTime = deadline - Date.now();
        if (remainingTime <= 0) {
            return null;
        }
        const detailUrl = item.link.split('#')[0];
        const res = await got({
            method: 'get',
            url: detailUrl,
            timeout: { request: Math.min(4000, remainingTime) },
            retry: { limit: 0 },
            headers: {
                Cookie: config.guozaoke.cookies,
                'User-Agent': config.ua,
            },
        }).catch(() => null);
        if (!res) {
            return null;
        }

        const $ = cheerio.load(res.data);
        const createdTime = $('.created-time')
            .first()
            .text()
            .replace(/^\s*发表于\s*/, '')
            .trim();
        if (/^昨[天日]$/.test(createdTime)) {
            return null;
        }
        const pubDate = new Date(parseRelativeDate(createdTime));
        if (!Number.isFinite(pubDate.getTime()) || Date.now() - pubDate.getTime() < minAge) {
            return null;
        }
        item.pubDate = pubDate;
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
                            $element.attr(attribute, new URL(value, detailUrl).href);
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
        if (result) {
            out.push(result);
        }
    }

    ctx.state.data = {
        title: '过早客',
        link: url,
        item: out.sort((first, second) => second.pubDate - first.pubDate).slice(0, maxItems),
    };
};
