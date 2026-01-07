module.exports = (router) => {
    router.get('/recommend', require('./index'));
    router.get('/daily', require('./daily'));
};
