const got = require('@/utils/got');
const { parseDate } = require('@/utils/parse-date');

module.exports = async (ctx) => {
    const time = Date.now();
    const url = `http://i.eastmoney.com/api/guba/userdynamiclistv2?uid=7547385857936250&pagenum=1&pagesize=10&type=1&_=${time}`;

    const listResponse = await got({
        method: 'get',
        url,
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
