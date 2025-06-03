const got = require('@/utils/got');
const cheerio = require('cheerio');

module.exports = async (ctx) => {
    const currentUrl = 'https://linux.do/latest.rss';

    const response = await got({
        method: 'get',
        url: currentUrl,
        headers: {
            accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8,ja;q=0.7,zh-TW;q=0.6',
            priority: 'u=0, i',
            'sec-ch-ua': '"Chromium";v="136", "Google Chrome";v="136", "Not.A/Brand";v="99"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'sec-fetch-dest': 'document',
            'sec-fetch-mode': 'navigate',
            'sec-fetch-site': 'none',
            'sec-fetch-user': '?1',
            'upgrade-insecure-requests': '1',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
            cookie: '__stripe_mid=104c749c-e2ca-4e30-b4b4-501525e81637ac306c; _t=Q%2B9shWyF0LrAq9EbHiAjahr1VQjVm6fPjdQs8%2Byeg%2Ftw9L1TUFPUTCSsmeW0EtAtlWpgH%2F5JVi5ZW1RMV%2BHgrBDEI6V%2BI2MAz2vmSsUum88xH1RLU0X4zfNlgpELaa9S%2F%2B6SrTi8ThvuDEreHr%2FKzalTXEUTDfjoc81mac8CxizvbNOZT2hP7B6FAel0QEEL3OeKJTpJmlu0KUuZ1ThBw5d10PcrcZcJmkBtY5aw8IDIxrpxztNsENmgvkMrTf0NwcGgdEMANhzMvfOKaOuzePzkvh6vYfq%2Bm8yb6V7PMfP5r%2FBWgInjexTzQlLIS1YQ--yo%2BWPoojRY8iD4yh--%2FLt%2FXO8JbyBCof41q4astw%3D%3D; cf_clearance=x55YZ_uR37YYsLw0zS3imJE96DxnNBi5q4pWq5Y__38-1748932411-1.2.1.1-MIVFS93YtUQHn7h.2k0xarn3Gv7KQH21pRkudiY6i3uH0M6sWoowk.X2eEcPHVaV7bVKszqj9ayr.25NH0VitrG8i6s5KB8Psfop9kRUFgoXApGymlxKBuzXi0HyToZ0dg1YD4w.oV7073xrY3rQ4HL1WJJZQCoN3M0kN9MlX7SjEl2fVbad7Rg_Gk2EOy.O6BA_mlnZpVS94Itel6XuYIBHeviz8vYPTheoHM1nWa8_6.kdKrPi67udptmBPAkBe7AwcdCvje8GiBZBmXwurSZg9YQ.49BWL.O7PQ9oza0SxsQPcoRo9xo6zh6SibgQUsHJgDvNx9H0_oo4kcYsSk_pG5QftAkPKdCXN35.kuSZfXZyx4sqmeXkOIXTB2k4',
        },
    });
    const $ = cheerio.load(response.data, { xmlMode: true });
    const entries = $('entry').toArray();

    const items = await Promise.all(
        entries
            .map((i) => {
                const element = $(i);
                const link = element.find('link').attr('href');
                if (ctx.cache.get(link)) {
                    return;
                }
                return {
                    title: element.find('title').text(),
                    link: element.find('link').text(),
                    pubDate: element.find('pubDate').text(),
                    category: element.find('category').text(),
                    description: element.find('description').text(),
                };
            })
            .filter((item) => item !== undefined)
    );

    ctx.state.data = {
        title: `linux.do 最新话题`,
        link: currentUrl,
        item: items,
    };
};
