const got = require('@/utils/got');
const cheerio = require('cheerio');
const { parseDate } = require('@/utils/parse-date');
const timezone = require('@/utils/timezone');

const rootUrl = 'https://bf.zzxworld.com';

const DEFAULT_LIMIT = 20;
const CONCURRENCY = 6;
const LINK_TIMEOUT = 3000;
// 留出余量给页面抓取和渲染，避免 serverless 函数整体超时
const TOTAL_BUDGET = 6000;

// /go/p/{id} 仅在带站内 Referer 时才 301，否则返回 404，因此提前解析成真实地址
const resolveLink = async (ctx, goLink, deadline) => {
    const key = `blogfinder:link:${goLink}`;
    const cached = await ctx.cache.get(key);
    if (cached) {
        return cached;
    }

    const remaining = deadline - Date.now();
    if (remaining <= 0) {
        return goLink;
    }

    try {
        const response = await got(goLink, {
            headers: { Referer: `${rootUrl}/` },
            followRedirect: false,
            throwHttpErrors: false,
            retry: { limit: 0 },
            timeout: Math.min(LINK_TIMEOUT, remaining),
        });
        const location = response.headers.location;
        if (location) {
            await ctx.cache.set(key, location, 30 * 24 * 60 * 60);
            return location;
        }
    } catch {
        // 解析失败或超时，退回跳转链接
    }
    return goLink;
};

const mapWithConcurrency = async (list, concurrency, fn) => {
    const results = Array.from({ length: list.length });
    let cursor = 0;
    await Promise.all(
        Array.from({ length: Math.min(concurrency, list.length) }, async () => {
            while (cursor < list.length) {
                const index = cursor++;
                // eslint-disable-next-line no-await-in-loop -- worker 串行取任务，并发由 worker 数量控制
                results[index] = await fn(list[index]);
            }
        })
    );
    return results;
};

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

    const limit = Number.parseInt(ctx.query.limit, 10) || DEFAULT_LIMIT;
    const deadline = Date.now() + TOTAL_BUDGET;

    return mapWithConcurrency(items.slice(0, limit), CONCURRENCY, async (item) => ({
        ...item,
        link: await resolveLink(ctx, item.link, deadline),
    }));
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
