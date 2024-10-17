const got = require('@/utils/got');

function formatTimestampToDate(timestamp) {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0'); // 月份从0开始，所以需要+1，并且补零
    const day = date.getDate().toString().padStart(2, '0'); // 补零
    return `${year}-${month}-${day}`;
}

module.exports = async (ctx) => {
    const now = Date.now();
    const formattedDate = formatTimestampToDate(now);
    const rootUrl = `https://production.dataviz.cnn.io/index/fearandgreed/graphdata/${formattedDate}`;
    const response = await got({
        method: 'get',
        url: rootUrl,
        headers: {
            Referer: `https://edition.cnn.com/`,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
        },
    });

    const jsonData = response.data;
    const title = `CNN Fear & Greed Index ${formattedDate}`;
    // 提取并格式化fear_and_greed数据
    const fearAndGreedInfo = `Fear and Greed Index:
    Score: ${jsonData.fear_and_greed.score}
    Rating: ${jsonData.fear_and_greed.rating}
    previous_close: ${jsonData.fear_and_greed.previous_close}
    previous_1_week: ${jsonData.fear_and_greed.previous_1_week}
    previous_1_month: ${jsonData.fear_and_greed.previous_1_month}
    previous_1_year: ${jsonData.fear_and_greed.previous_1_year}
    `;

    // 提取并格式化market_momentum_sp500数据
    const marketMomentumSP500Info = `Market Momentum SP500:
    Score: ${jsonData.market_momentum_sp500.score}
    Rating: ${jsonData.market_momentum_sp500.rating}
    `;

    // 拼接描述信息
    const description = fearAndGreedInfo + '\n\n' + marketMomentumSP500Info;

    const link = `https://edition.cnn.com/markets/fear-and-greed`;
    const pubDate = now;
    const items = [{ title, description, link, pubDate }];

    ctx.state.data = {
        title: 'CNN Fear & Greed Index',
        link: `https://edition.cnn.com/markets/fear-and-greed`,
        item: items,
    };
};
