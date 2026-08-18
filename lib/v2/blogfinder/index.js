const { rootUrl, parseItems, getPage } = require('./utils');

module.exports = async (ctx) => {
    const $ = await getPage(rootUrl);

    const items = parseItems($, $('#home-block-list div.block.post'), (item) => {
        const site = item.find('a.site-icon-link');
        return {
            author: site.find('img').attr('alt'),
            authorLink: site.attr('href') ? `${rootUrl}${site.attr('href')}` : '',
        };
    });

    ctx.state.data = {
        title: 'BlogFinder - 发现优秀的个人博客',
        link: rootUrl,
        description: '聚合优秀的个人博客，发掘优质的个人博客文章和内容。',
        language: 'zh-CN',
        item: items,
    };
};
