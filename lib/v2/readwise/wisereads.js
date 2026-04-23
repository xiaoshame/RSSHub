const got = require('@/utils/got');
const cheerio = require('cheerio');
const { parseDate } = require('@/utils/parse-date');

const baseUrl = 'https://wise.readwise.io';
const baseVol = 138;
const baseDate = new Date('2026-04-20T00:00:00Z');
const weekMs = 7 * 24 * 60 * 60 * 1000;

function getCurrentVol() {
    const now = Date.now();
    const diff = now - baseDate.getTime();
    return baseVol + Math.max(0, Math.floor(diff / weekMs));
}

module.exports = async (ctx) => {
    const vol = ctx.params.vol ? Number.parseInt(ctx.params.vol, 10) : getCurrentVol();
    const currentUrl = `${baseUrl}/issues/wisereads-vol-${vol}/`;

    const { data: response } = await got(currentUrl);
    const $ = cheerio.load(response);

    const title = $('h1').first().text().trim();
    const pubDate = $('meta[property="article:published_time"]').attr('content');
    const ogImage = $('meta[property="og:image"]').attr('content');

    const items = [];

    // 每个推荐项都有一个 <h3><a> 标题
    $('h3').each((_, el) => {
        const $h3 = $(el);
        const $a = $h3.find('a');
        if (!$a.length) {
            return;
        }

        const itemTitle = $a.text().trim();
        const itemLink = $a.attr('href');
        if (!itemTitle || !itemLink) {
            return;
        }

        // 获取作者 (h3 后面紧跟的 .author 段落)
        const $author = $h3.next('p.author');
        const author = $author.length ? $author.text().trim() : '';

        // 获取描述 (author 后面的段落, 或 h3 后面非 author 的段落)
        let description = '';
        const $descStart = $author.length ? $author : $h3;
        const descParts = [];
        let $next = $descStart.next();
        while ($next.length && !$next.is('hr, h2, h3')) {
            if ($next.is('p') && !$next.hasClass('author')) {
                descParts.push($next.html());
            }
            $next = $next.next();
        }
        description = descParts.join('<br/>');

        // 获取图片 (h3 前面的 a > img)
        let image = '';
        const $prevA = $h3.prev('a');
        if ($prevA.length) {
            const $img = $prevA.find('img.document-image');
            if ($img.length) {
                image = $img.attr('src');
            }
        }

        // 获取分类 (h3 前面的 h2)
        let category = '';
        let $prev = $h3.prev();
        while ($prev.length && !$prev.is('h2')) {
            $prev = $prev.prev();
        }
        if ($prev.is('h2')) {
            category = $prev.text().trim();
        }

        const fullDesc = image ? `<img src="${image}" /><br/>${description}` : description;

        items.push({
            title: itemTitle,
            link: itemLink,
            author,
            description: fullDesc,
            category: category ? [category] : [],
            pubDate: pubDate ? parseDate(pubDate) : undefined,
        });
    });

    ctx.state.data = {
        title: title || `Wisereads Vol. ${vol}`,
        link: currentUrl,
        description: `Readwise Wisereads Weekly Newsletter - Vol. ${vol}`,
        language: 'en',
        image: ogImage,
        icon: ogImage,
        logo: ogImage,
        author: 'Readwise',
        allowEmpty: true,
        item: items,
    };
};
