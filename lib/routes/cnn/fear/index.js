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
    const fearAndGreedInfo = `
    <div>
    <h2>Fear and Greed Index:</h2>
    <p>Score: ${jsonData.fear_and_greed.score}</p>
    <p>Rating: ${jsonData.fear_and_greed.rating}</p>
    <p>timestamp: ${jsonData.fear_and_greed.timestamp}</p>
    <p>previous_close: ${jsonData.fear_and_greed.previous_close}</p>
    <p>previous_1_week: ${jsonData.fear_and_greed.previous_1_week}</p>
    <p>previous_1_month: ${jsonData.fear_and_greed.previous_1_month}</p>
    <p>previous_1_year: ${jsonData.fear_and_greed.previous_1_year}</p><br>
    </div>
    `;

    // 提取并格式化market_momentum_sp500数据
    const marketMomentumSP500Info = `
    <div>
    <h2>Market Momentum SP500:</h2>
    <p>Score: ${jsonData.market_momentum_sp500.score}</p>
    <p>Rating: ${jsonData.market_momentum_sp500.rating}</p>
    </div>
    `;

    // 拼接描述信息
    const description = fearAndGreedInfo + marketMomentumSP500Info;

    const link = `https://edition.cnn.com/markets/fear-and-greed`;
    const pubDate = now;
    const items = [{ title, description, link, pubDate }];

    ctx.state.data = {
        title: 'CNN Fear & Greed Index',
        link: `https://edition.cnn.com/markets/fear-and-greed`,
        item: items,
    };
};
