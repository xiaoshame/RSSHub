jest.mock('@/utils/got', () => jest.fn());

const got = require('@/utils/got');
const route = require('@/v2/guozaoke');

const topic = (id, replies = 0) => `<div class="topic-item">
    <h3 class="title"><a href="/t/${id}#reply${replies}">Topic ${id}</a></h3>
    <span class="username"><a href="/u/alice">alice</a></span>
    <span class="node"><a href="/node/water">water</a></span>
</div>`;

const detail = `<div class="topic-detail">
    <span class="created-time">发表于 2 小时前</span>
    <div class="ui-content"><p>Full text <a href="/t/2">link</a><img src="/image.jpg"></p></div>
</div>
<div class="reply-item"><span class="username">bob</span><span class="content"><p>Reply <a href="/u/alice">alice</a></p></span></div>
<div class="reply-item"><span class="content"></span></div>`;

const context = () => ({
    state: {},
    cache: { tryGet: jest.fn((key, callback) => callback()) },
});

beforeEach(() => {
    got.mockReset();
});

it('extracts full topics and comments with stable unique links', async () => {
    got.mockResolvedValueOnce({ data: `${topic(1, 2)}${topic(1, 3)}${topic(2)}` }).mockResolvedValue({ data: detail });
    const ctx = context();
    await route(ctx);
    expect(ctx.state.data.title).toBe('过早客');
    expect(ctx.state.data.item).toHaveLength(2);
    expect(ctx.state.data.item.map((item) => item.link)).toEqual(['https://www.guozaoke.com/t/1', 'https://www.guozaoke.com/t/2']);
    const item = ctx.state.data.item[0];
    expect(item).toMatchObject({ title: 'Topic 1', author: 'alice', category: ['water'], guid: item.link });
    expect(item.description).toContain('Full text');
    expect(item.description).toContain('https://www.guozaoke.com/image.jpg');
    expect(item.description).toContain('https://www.guozaoke.com/u/alice');
    expect(item.description).toContain('<strong>bob</strong>');
    expect(item.description).toContain('评论（1）');
    expect(Math.abs(Date.now() - new Date(item.pubDate).getTime() - 2 * 60 * 60 * 1000)).toBeLessThan(5000);
    expect(got).toHaveBeenCalledTimes(3);
});

it('limits detail requests to twenty topics', async () => {
    got.mockResolvedValueOnce({ data: Array.from({ length: 25 }, (value, index) => topic(index + 1)).join('') }).mockResolvedValue({ data: detail });
    const ctx = context();
    await route(ctx);
    expect(ctx.state.data.item).toHaveLength(20);
    expect(got).toHaveBeenCalledTimes(21);
});

it('handles an empty list and topics without dates or comments', async () => {
    got.mockResolvedValueOnce({ data: '' });
    const empty = context();
    await route(empty);
    expect(empty.state.data.item).toEqual([]);

    got.mockResolvedValueOnce({ data: topic(1) }).mockResolvedValueOnce({ data: '<div class="topic-detail"><div class="ui-content">Text</div></div>' });
    const ctx = context();
    await route(ctx);
    expect(ctx.state.data.item[0]).toMatchObject({ description: 'Text' });
    expect(ctx.state.data.item[0].pubDate).toBeUndefined();
});

it('reuses cached topic details', async () => {
    got.mockResolvedValueOnce({ data: topic(1) });
    const ctx = context();
    ctx.cache.tryGet.mockResolvedValue({ description: 'Cached content', pubDate: '2026-10-12T00:00:00.000Z' });
    await route(ctx);
    expect(ctx.state.data.item[0].description).toBe('Cached content');
    expect(got).toHaveBeenCalledTimes(1);
});
