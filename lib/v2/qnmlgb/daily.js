const cheerio = require('cheerio');
const got = require('@/utils/got');
const { parseDate } = require('@/utils/parse-date');

module.exports = async (ctx) => {
    const baseUrl = 'https://qnmlgb.tech';
    const dailyUrl = `${baseUrl}/daily`;

    const response = await got({
        method: 'get',
        url: dailyUrl,
        headers: {
            accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8,ja;q=0.7,zh-TW;q=0.6',
            cookie: 'jwt_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7Im5pY2tuYW1lIjoieGlhb3NoYW1lMTIwOSIsInV1aWQiOiI3NDgzMjUzNGViYTMxMWYwYjJmODY1M2Y5YTA0MWQyNCIsImF2YXRhciI6IiJ9LCJleHAiOjE3OTkzMTA3NzF9.72eHmzHsGCzE7954oAwWrOjZAr3Xyd1SEFkWQ4oR8Ag',
            referer: 'https://qnmlgb.tech/',
            'sec-ch-ua': '"Google Chrome";v="143", "Chromium";v="143", "Not A(Brand";v="24"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'sec-fetch-dest': 'document',
            'sec-fetch-mode': 'navigate',
            'sec-fetch-site': 'same-origin',
            'sec-fetch-user': '?1',
            'upgrade-insecure-requests': '1',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',
        },
    });

    const $ = cheerio.load(response.data);

    // 解析文章列表
    const list = $('.ae')
        .toArray()
        .map((item) => {
            const element = $(item);
            const link = element.find('a').attr('href');
            const title = element.find('.tp .pretty_v2').text().trim();
            const dateText = element.find('.ae-container-2 div').eq(1).text().trim(); // 格式：1.07 14:58 财联社AI daily
            const author = dateText.split(' ').slice(2).join(' '); // 提取作者名
            const dateMatch = dateText.match(/^(\d+\.\d+)\s+(\d+:\d+)/);

            let pubDate;
            if (dateMatch) {
                const [, monthDay, time] = dateMatch;
                const [month, day] = monthDay.split('.');
                const [hour, minute] = time.split(':');
                const now = new Date();
                const year = now.getFullYear();

                // 构造日期字符串：YYYY-MM-DD HH:mm
                const dateStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')} ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
                pubDate = parseDate(dateStr, 'YYYY-MM-DD HH:mm', '-08:00');
            }

            return {
                title,
                link,
                pubDate,
                author,
            };
        })
        .filter((item) => item.title && item.link);

    ctx.state.data = {
        title: '瓦斯阅读 - 早报',
        link: dailyUrl,
        description: '瓦斯阅读每日早报资讯',
        item: list,
    };
};
