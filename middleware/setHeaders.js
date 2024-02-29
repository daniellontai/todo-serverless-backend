const setGeadersMiddleware = (req, res, next) => {
    res.setHeader('Cache-Control', 's-max-age=3600, stale-while-revalidate');
    next();
}

module.exports = setGeadersMiddleware;