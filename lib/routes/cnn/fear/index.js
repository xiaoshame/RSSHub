const got = require('@/utils/got');
const config = require('@/config').value;

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
    const list = [{ url: `https://production.dataviz.cnn.io/index/fearandgreed/graphdata/${formattedDate}` }];
    const items = await Promise.all(
        list.map((item) =>
            ctx.cache.tryGet(item.url, async () => {
                const response = await got({
                    method: 'get',
                    url: item.url,
                    headers: {
                        Referer: 'https://edition.cnn.com/',
                        'User-Agent': config.ua,
                    },
                });

                const jsonData = response.data;
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
                const title = formattedDate;
                const description = fearAndGreedInfo + marketMomentumSP500Info;

                const link = item.url;
                const pubDate = now;
                return { title, description, link, pubDate };
            })
        )
    );

    ctx.state.data = {
        title: 'CNN Fear & Greed Index',
        link: 'https://edition.cnn.com/markets/fear-and-greed',
        item: items,
    };
};
