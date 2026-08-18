const got = require('@/utils/got');
const cheerio = require('cheerio');
const { parseDate } = require('@/utils/parse-date');
const timezone = require('@/utils/timezone');

const rootUrl = 'https://bf.zzxworld.com';

// /go/p/{id} 仅在带站内 Referer 时才 301，否则返回 404，因此提前解析成真实地址
const resolveLink = (ctx, goLink) =>
    ctx.cache.tryGet(
        `blogfinder:link:${goLink}`,
        async () => {
            const response = await got(goLink, {
                headers: { Referer: `${rootUrl}/` },
                followRedirect: false,
                throwHttpErrors: false,
            });
            return response.headers.location || goLink;
        },
        30 * 24 * 60 * 60
    );

const parseItems = (ctx, $, elements, getSite) => {
    const items = elements
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

    return Promise.all(
        items.map(async (item) => ({
            ...item,
            link: await resolveLink(ctx, item.link),
        }))
    );
};

const getPage = async (url) => {
    const response = await got(url);
    return cheerio.load(response.data);
};

module.exports = {
    rootUrl,
    parseItems,
    getPage,
};
