const { parseDate } = require('@/utils/parse-date');
const got = require('@/utils/got');
const cheerio = require('cheerio');
const logger = require('@/utils/logger');

async function getContent(url) {
    const res = await got({
        method: 'get',
        url,
        headers: {
            // Cookie: cookie,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
        },
    });

    const $ = cheerio.load(res.data);
    let content = $('div.g_content').html();
    content = content ? content.trim() : '';

    return content;
}

async function fetchData(pageLink) {
    const response = await fetch(pageLink);
    if (!response.ok) {
        // 更简洁的检查方式，同时适用于所有非2xx状态码
        throw new Error(`Request failed with status ${response.status}`);
    }
    const data = await response.json();
    const result = data.result.map(async (item) => {
        const title = item.post_title;
        const date = item.post_publish_time;
        const description = await getContent('https://caifuhao.eastmoney.com/news/' + item.post_source_id);
        return {
            title,
            description,
            link: 'https://caifuhao.eastmoney.com/news/' + item.post_source_id,
            pubDate: parseDate(date),
        };
    });
    return result;
}

module.exports = async (ctx) => {
    try {
        const time = Date.now();
        const pageLink = `https://i.eastmoney.com/api/guba/userdynamiclistv2?uid=7547385857936250&pagenum=1&pagesize=10&type=1&_=${time}`;

        const result = await fetchData(pageLink);

        ctx.state.data = {
            title: `巴伦`,
            link: `https://i.eastmoney.com/7547385857936250`,
            description: `巴伦的动态`,
            item: result,
        };
    } catch (error) {
        logger.error(error);
    }
};
