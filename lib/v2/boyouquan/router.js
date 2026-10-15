module.exports = (router) => {
    router.get('/', require('./index'));
    router.get('/index', require('./index'));
};
