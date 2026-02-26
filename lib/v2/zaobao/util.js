const got = require('@/utils/got');
const cheerio = require('cheerio');

const baseUrl = 'https://rsshub.app/zaobao';

/**
 * 从 RSSHub 获取联合早报的 RSS 信息
 *
 * @param {*} ctx RSSHub 的 ctx 参数，用来设置缓存
 * @param {string} sectionUrl 形如 /realtime/china 的字符串
 * @returns {Promise<{
 *  title: string;
 *  resultList: {
 *    title: string;
 *    description: string;
 *    pubDate: string;
 *    link: string;
 *  }[];}>} 新闻标题以及新闻列表
 */
const parseList = async (ctx, sectionUrl) => {
    const rssUrl = baseUrl + sectionUrl;
    const response = await got.get(rssUrl);
    const $ = cheerio.load(response.data, { xmlMode: true });

    const title = $('channel > title').text();

    const resultList = $('channel > item')
        .toArray()
        .map((item) => {
            const $item = $(item);
            return {
                title: $item.find('title').text(),
                description: $item.find('description').text(),
                pubDate: $item.find('pubDate').text(),
                link: $item.find('link').text(),
            };
        });

    return {
        title,
        resultList,
    };
};

module.exports = {
    parseList,
};
