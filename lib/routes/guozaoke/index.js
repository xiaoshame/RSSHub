const cheerio = require('cheerio');
const got = require('@/utils/got');
const logger = require('@/utils/logger');
const { parseDate } = require('@/utils/parse-date');

function convertToDate(relativeTime) {
    const minutesAgo = Number.parseInt(relativeTime.match(/\d+/)[0], 10);
    const now = new Date();
    const pastDate = new Date(now - minutesAgo * 60 * 1000); // Subtract minutes in milliseconds
    return pastDate;
}

async function getContent(link) {
    const url = `https://www.guozaoke.com${link}`;
    const res = await got({
        method: 'get',
        url,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
        },
    });

    const $ = cheerio.load(res.data);
    let content = $('div.ui-content').html();
    content = content ? content.trim() : '';
    const comments = $('.reply-item')
        .map((i, el) => {
            const $el = $(el);
            return {
                comment: $el.find('span.content').text().trim(), // 提取content内容并去除前后空格
                author: $el.find('span.username').text(), // 提取username
            };
        })
        .get();
    if (comments && comments.length > 0) {
        for (const item of comments) {
            content += '<br>' + item.author + ': ' + item.comment;
        }
    }
    return content ? content : '';
}

module.exports = async (ctx) => {
    const url = `https://www.guozaoke.com/`;
    const res = await got.get(url);
    const $ = cheerio.load(res.data);

    const list = $('div.topic-item');
    const out = await Promise.all(
        [...list].slice(1).map(async (item) => {
            const $item = $(item);
            const title = $item.find('h3.title a').text();
            const link = $item.find('h3.title a').attr('href');
            const author = $item.find('span.username a').text();
            const lastTouched = $item.find('span.last-touched').text();
            const time = convertToDate(lastTouched);
            try {
                const content = await getContent(link);
                const single = {
                    title,
                    link,
                    pubDate: parseDate(time),
                    description: content,
                    author,
                };

                return single;
            } catch (error) {
                logger.error(error);
                return;
            }
        })
    ).then((results) => results.filter((result) => result !== undefined));

    ctx.state.data = {
        title: `过早客`,
        link: url,
        item: out,
    };
};
