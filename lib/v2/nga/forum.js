const got = require('@/utils/got');
const config = require('@/config').value;
const { parseDate } = require('@/utils/parse-date');

const X_UA = 'NGA_skull/6.0.5(iPhone10,3;iOS 12.0.1)';

const deepReplace = (content, pattern, replacement) => {
    while (pattern.test(content)) {
        content = content.replace(pattern, replacement);
    }
    return content;
};

const formatContent = (content = '') => {
    content = deepReplace(content, /\[(b|u|i|del|code|sub|sup)]([\S\s]+?)\[\/\1]/g, '<$1>$2</$1>');
    content = deepReplace(content, /\[quote]([\S\s]+?)\[\/quote]/g, '<blockquote>$1</blockquote>');
    content = deepReplace(content, /\[collapse(?:=([^\]]+))?]([\S\s]+?)\[\/collapse]/g, '<details><summary>$1</summary>$2</details>');

    return content
        .replaceAll(/\[img]([\S\s]+?)\[\/img]/g, (match, source) => {
            const normalizedSource = source.startsWith('.') ? `https://img.nga.178.com/attachments${source.slice(1)}` : source;
            const src = normalizedSource.replaceAll(/\?.*/g, '');
            return `<p><img src="${src}" loading="lazy" /></p>`;
        })
        .replaceAll(/\[url=([^\]]+)]([\S\s]+?)\[\/url]/g, '<a href="$1">$2</a>')
        .replaceAll(/\[url]([\S\s]+?)\[\/url]/g, '<a href="$1">$1</a>')
        .replaceAll(/\[uid=(\d+)]([\S\s]+?)\[\/uid]/g, '<a href="https://nga.178.com/nuke.php?func=ucp&uid=$1">$2</a>')
        .replaceAll(/\[tid=(\d+)]([\S\s]+?)\[\/tid]/g, '<a href="https://nga.178.com/read.php?tid=$1">$2</a>')
        .replaceAll(/\[pid=(\d+),(\d+),(\d+)]([\S\s]+?)\[\/pid]/g, '<a href="https://nga.178.com/read.php?tid=$2&page=$3#pid$1Anchor">$4</a>')
        .replaceAll(/\[s:[^:\]]+:([^\]]+)]/g, '<span title="NGA 表情">[$1]</span>')
        .replaceAll('[br]', '<br />')
        .replaceAll(/\*\*([\S\s]+?)\*\*/g, '<strong>$1</strong>')
        .replaceAll(/\r?\n/g, '<br />');
};

const formatPost = (post, tid) => {
    const floor = post.lou === 0 ? '主题' : `${post.lou} 楼`;
    const author = post.author?.username || `UID:${post.author?.uid || '未知'}`;
    const postLink = post.pid ? `https://nga.178.com/read.php?tid=${tid}#pid${post.pid}Anchor` : `https://nga.178.com/read.php?tid=${tid}`;

    return `<div><p><strong>${floor} · ${author}</strong> · <time>${post.postdate || ''}</time> · <a href="${postLink}">原帖</a></p><div>${formatContent(post.content)}</div></div><hr />`;
};

module.exports = async (ctx) => {
    const { fid, recommend } = ctx.params;
    const timestamp = Math.floor(Date.now() / 1000);
    let cookieString = `guestJs=${timestamp};`;
    if (config.nga.uid && config.nga.cid) {
        cookieString = `ngaPassportUid=${config.nga.uid}; ngaPassportCid=${config.nga.cid};`;
    }
    const homePage = await got.post('https://ngabbs.com/app_api.php?__lib=subject&__act=list', {
        headers: {
            'X-User-Agent': X_UA,
            Cookie: cookieString,
        },
        form: {
            fid,
            recommend: recommend ? 1 : 0,
        },
    });

    const forumname = homePage.data.forumname;

    const list = homePage.data.result.data.filter(({ tid }) => tid);

    const resultItem = await Promise.all(
        list.map(async ({ subject, postdate, tid }) => {
            const link = `https://nga.178.com/read.php?tid=${tid}`;
            const item = {
                title: subject,
                description: '',
                link,
                pubDate: parseDate(postdate, 'X'),
            };

            const description = await ctx.cache.tryGet(`nga-forum:v2:${link}`, async () => {
                const response = await got.post('https://ngabbs.com/app_api.php?__lib=post&__act=list', {
                    headers: {
                        'X-User-Agent': X_UA,
                        Cookie: cookieString,
                    },
                    form: {
                        tid,
                    },
                });
                return response.data.code === 0 ? response.data.result.map((post) => formatPost(post, tid)).join('') : response.data.msg;
            });

            item.description = description;
            return item;
        })
    );

    ctx.state.data = {
        title: `NGA-${forumname}${recommend ? '-精华' : ''}`,
        link: `https://nga.178.com/thread.php?fid=${fid}`,
        description: 'NGA是国内专业的游戏玩家社区,魔兽世界,英雄联盟,炉石传说,风暴英雄,暗黑破坏神3(D3)游戏攻略讨论,以及其他热门游戏玩家社区',
        item: resultItem,
    };
};
