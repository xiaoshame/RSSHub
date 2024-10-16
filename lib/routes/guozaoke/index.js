const cheerio = require('cheerio');
const got = require('@/utils/got');
const logger = require('@/utils/logger');
const { parseDate } = require('@/utils/parse-date');
const config = require('@/config').value;

function convertToDate(relativeTime) {
    const minutesAgo = /\d+/.test(relativeTime) ? Number.parseInt(relativeTime.match(/\d+/)[0], 10) : 0;
    const now = new Date();
    const pastDate = new Date(now - minutesAgo * 60 * 1000); // Subtract minutes in milliseconds
    return pastDate;
}

async function getContent(link) {
    const url = `https://www.guozaoke.com${link}`;
    const Cookie = config.guozaoke.cookies;
    logger.info(`正在获取Cookie: ${Cookie ? Cookie : '未配置'}`);
    const res = await got({
        method: 'get',
        url,
        headers: {
            Cookie,
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

    let out = [];
    for (const item of list) {
        const $item = $(item);
        const title = $item.find('h3.title a').text();
        const link = $item.find('h3.title a').attr('href');
        const author = $item.find('span.username a').text();
        const lastTouched = $item.find('span.last-touched').text();
        const time = convertToDate(lastTouched);
        try {
            const content = getContent(link);
            if (content === '') {
                continue;
            }
            const single = {
                title,
                link,
                pubDate: parseDate(time),
                description: content,
                author,
            };
            out.push(single);
        } catch (error) {
            logger.error(error);
            continue;
        }
    }

    // 如果需要过滤掉undefined的结果，可以在循环结束后进行
    out = out.filter((result) => result !== undefined);

    ctx.state.data = {
        title: `过早客`,
        link: url,
        item: out,
    };
};
