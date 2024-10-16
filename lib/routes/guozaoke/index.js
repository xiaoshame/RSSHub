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
    const cookie = config.guozaoke.cookies;
    const res = await got({
        method: 'get',
        url,
        headers: {
            Cookie: cookie,
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

async function fetchContent(item) {
    try {
        const content = await getContent(item.link);
        if (content === '') {
            return null; // 如果内容为空，则返回null
        }
        return {
            title: item.title,
            link: item.link,
            pubDate: parseDate(item.time),
            description: content,
            author: item.author,
        };
    } catch (error) {
        logger.error(error);
        return null; // 如果发生错误，则返回null
    }
}

async function processItems(itemsToFetch) {
    // 并发限制为5
    const concurrentLimit = 5;
    let out = [];
    let currentIndex = 0;

    while (currentIndex < itemsToFetch.length) {
        const batch = itemsToFetch.slice(currentIndex, currentIndex + concurrentLimit);
        const results = await Promise.all(batch.map(fetchContent));
        out = out.concat(results.filter((result) => result !== null));
        // 更新当前索引以处理下一批项目
        currentIndex += concurrentLimit;
    }

    return out;
}

module.exports = async (ctx) => {
    const url = `https://www.guozaoke.com/`;
    const res = await got.get(url);
    const $ = cheerio.load(res.body);

    const list = $('div.topic-item');
    const itemsToFetch = [];
    const maxItems = 10; // 最多取10个数据

    for (const item of list) {
        if (itemsToFetch.length >= maxItems) {
            break;
        }
        const $item = $(item);
        const title = $item.find('h3.title a').text();
        const link = $item.find('h3.title a').attr('href');
        const author = $item.find('span.username a').text();
        const lastTouched = $item.find('span.last-touched').text();
        const time = convertToDate(lastTouched);
        itemsToFetch.push({ title, link, author, time });
    }

    const out = await processItems(itemsToFetch);

    ctx.state.data = {
        title: `过早客`,
        link: url,
        item: out,
    };
};
