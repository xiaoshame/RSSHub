const got = require('@/utils/got');
const { parseDate } = require('@/utils/parse-date');

module.exports = async (ctx) => {
    const time = Date.now();
    const url = `http://i.eastmoney.com/api/guba/userdynamiclistv2?uid=7547385857936250&pagenum=1&pagesize=10&type=1&_=${time}`;

    const listResponse = await got({
        method: 'get',
        url,
        headers: {
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8,ja;q=0.7,zh-TW;q=0.6',
            'Cache-Control': 'max-age=0',
            Connection: 'keep-alive',
            Cookie: 'qgqp_b_id=3a22308902f293c0216583de8d7e5d03; websitepoptg_api_time=1728958469910; st_si=87374178579253; st_asi=delete; st_pvi=67282721971623; st_sp=2024-07-10%2009%3A25%3A52; st_inirUrl=https%3A%2F%2Fwap.eastmoney.com%2F; st_sn=12; st_psi=20241015112420657-119101302791-8995653296',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Upgrade-Insecure-Requests': '1',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
            'sec-ch-ua': '"Google Chrome";v="129", "Not=A?Brand";v="8", "Chromium";v="129"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
        },
    });

    const data = listResponse.data;

    const result = await Promise.all(
        data.result.map((item) => {
            const title = item.post_title;
            const text = item.post_content;
            const date = item.post_publish_time;
            const link = 'https://caifuhao.eastmoney.com/news/' + item.post_source_id;
            return {
                title,
                description: text,
                link,
                pubDate: parseDate(date),
            };
        })
    );
    ctx.state.data = {
        title: `巴伦`,
        link: `https://i.eastmoney.com/7547385857936250`,
        description: `巴伦的动态`,
        item: result,
    };
};
