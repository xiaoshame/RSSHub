jest.mock('@/utils/got', () => jest.fn());

const got = require('@/utils/got');
const route = require('@/v2/boyouquan');
const Router = require('@koa/router');
const Koa = require('koa');
const supertest = require('supertest');
const routes = require('@/v2router');
const legacyRouter = require('@/router');

const post = (id) => ({
    blogName: `Blog ${id}`,
    title: `Post ${id}`,
    link: `https://example.com/posts/${id}`,
    description: `<p>Summary ${id}</p>`,
    publishedAt: '2026/10/15 18:22:46',
});

const mockPages = (first, second) => {
    got.mockImplementation(({ url }) => Promise.resolve({ data: { results: url.endsWith('page=1') ? first : second } }));
};

beforeEach(() => {
    got.mockReset();
});

it('collects two latest pages without requesting BlogFinder', async () => {
    mockPages([post(1)], [post(2)]);
    const ctx = { state: {} };
    await route(ctx);

    expect(got.mock.calls.map(([options]) => options.url)).toEqual(['https://www.boyouquan.com/api/posts?sort=latest&keyword=&page=1', 'https://www.boyouquan.com/api/posts?sort=latest&keyword=&page=2']);
    expect(ctx.state.data).toMatchObject({
        title: '博友圈',
        link: 'https://www.boyouquan.com/home?sort=latest',
        language: 'zh-CN',
        item: [
            { title: 'Blog 1: Post 1', author: 'Blog 1', description: '<p>Summary 1</p>', link: post(1).link },
            { title: 'Blog 2: Post 2', author: 'Blog 2', link: post(2).link },
        ],
    });
    expect(ctx.state.data.item[0].pubDate.toISOString()).toBe('2026-10-15T10:22:46.000Z');
});

it('deduplicates links across pages while keeping their original order', async () => {
    mockPages([post(1), post(1), post(2)], [post(2), post(3)]);
    const ctx = { state: {} };
    await route(ctx);
    expect(ctx.state.data.item.map((item) => item.link)).toEqual([post(1).link, post(2).link, post(3).link]);
});

it('keeps all entries on repeated requests even when item links are already cached', async () => {
    mockPages([post(1)], [post(2)]);
    const ctx = { state: {}, cache: { get: jest.fn().mockResolvedValue('cached') } };
    await route(ctx);
    const first = ctx.state.data.item;
    await route(ctx);
    expect(ctx.state.data.item).toEqual(first);
    expect(ctx.cache.get).not.toHaveBeenCalled();
});

it('supports empty pages', async () => {
    mockPages([], []);
    const ctx = { state: {} };
    await route(ctx);
    expect(ctx.state.data.item).toEqual([]);
});

it('propagates upstream errors instead of returning an incomplete feed', async () => {
    got.mockRejectedValue(new Error('Upstream failed'));
    const ctx = { state: {} };
    await expect(route(ctx)).rejects.toThrow('Upstream failed');
    expect(ctx.state.data).toBeUndefined();
});

it.each(['/boyouquan', '/boyouquan/index'])('serves %s through the discovered v2 router', async (path) => {
    mockPages([post(1)], []);
    const app = new Koa();
    const router = new Router({ prefix: '/boyouquan' });
    routes.boyouquan(router);
    app.use(async (ctx, next) => {
        await next();
        if (ctx.state.data) {
            ctx.body = ctx.state.data;
        }
    });
    app.use(router.routes());
    const response = await supertest(app.callback()).get(path);
    expect(response.status).toBe(200);
    expect(response.body.title).toBe('博友圈');
    expect(response.body.item).toHaveLength(1);
    expect(legacyRouter.stack.some((layer) => layer.path === '/boyouquan')).toBe(false);
    expect(routes.blogfinder).toEqual(expect.any(Function));
});
