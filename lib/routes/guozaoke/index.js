const cheerio = require('cheerio');
const got = require('@/utils/got');
const config = require('@/config').value;
const asyncPool = require('tiny-async-pool');

function convertToDate(relativeTime) {
    const minutesAgoMatch = relativeTime.match(/\d+/);
    const minutesAgo = minutesAgoMatch ? Number.parseInt(minutesAgoMatch[0], 10) : 0;
    const now = Date.now();
    const pastDate = new Date(now - minutesAgo * 60 * 1000); // Subtract minutes in milliseconds
    return pastDate;
}

async function getContent(link) {
    const url = `https://www.guozaoke.com${link}`;
    const res = await got({
        method: 'get',
        url,
        headers: {
            Cookie: config.guozaoke.cookies,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
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

    return content;
}

module.exports = async (ctx) => {
    const url = `https://www.guozaoke.com/`;
    const res = await got({
        method: 'get',
        url,
        headers: {
            Cookie: config.guozaoke.cookies,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
        },
    });
    const $ = cheerio.load(res.data);

    const list = $('div.topic-item');
    const items = [];

    for await (const data of asyncPool(2, list.slice(0, 20), async (i) => {
        const $item = $(i);
        const title = $item.find('h3.title a').text();
        const link = $item.find('h3.title a').attr('href');
        const author = $item.find('span.username a').text();
        const lastTouched = $item.find('span.last-touched').text();
        const time = convertToDate(lastTouched);
        const description = await getContent(link);
        return {
            title,
            description,
            link: link.split('#')[0],
            author,
            pubDate: time,
        };
    })) {
        items.push(data);
    }

    ctx.state.data = {
        title: '过早客',
        link: url,
        item: items,
    };
};
