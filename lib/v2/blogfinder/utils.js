const got = require('@/utils/got');
const cheerio = require('cheerio');
const { parseDate } = require('@/utils/parse-date');
const timezone = require('@/utils/timezone');

const rootUrl = 'https://bf.zzxworld.com';

const parseItems = ($, elements, getSite) =>
    elements
        .toArray()
        .flatMap((element) => {
            const item = $(element);
            const { author, authorLink } = getSite(item);
            const pubDate = item.find('time').attr('datetime');

            return item
                .find('a[href^="/go/p/"]')
                .toArray()
                .map((link) => {
                    link = $(link);
                    return {
                        title: (link.attr('title') || link.text()).trim(),
                        link: `${rootUrl}${link.attr('href')}`,
                        author,
                        description: authorLink ? `来自博客：<a href="${authorLink}">${author}</a>` : author,
                        pubDate: pubDate ? timezone(parseDate(pubDate), +8) : undefined,
                    };
                });
        })
        .filter((item) => item.title);

const getPage = async (url) => {
    const response = await got(url);
    return cheerio.load(response.data);
};

const limitItems = (ctx, items) => (ctx.query.limit ? items.slice(0, Number.parseInt(ctx.query.limit, 10)) : items);

module.exports = {
    rootUrl,
    parseItems,
    getPage,
    limitItems,
};
