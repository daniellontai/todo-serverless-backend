const setGeadersMiddleware = (req, res, next) => {
    res.setHeader('Cache-Control', 's-max-age=3600, stale-while-revalidate');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'self'");
    next();
}

module.exports = setGeadersMiddleware;