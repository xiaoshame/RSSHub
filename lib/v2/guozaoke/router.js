module.exports = (router) => {
    router.get('/', require('./index'));
    router.get('/default', require('./index'));
};
