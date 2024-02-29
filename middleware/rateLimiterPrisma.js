require('dotenv').config()
const { prisma } = require("../prisma/initDb.js");
const { RateLimiterPrisma, RateLimiterMemory } = require('rate-limiter-flexible');
const { ipAddress/*, next*/ } = require('@vercel/edge');

const rateLimiterMemory = new RateLimiterMemory({
    points: 1, // if there are 5 workers
    duration: 1,
});

const rateLimiter = new RateLimiterPrisma({
    storeClient: prisma,
    points: process.env.RL_POINTS, // Number of points (requests) allowed
    duration: process.env.RL_DURATION_SECONDS,
    insuranceLimiter: rateLimiterMemory,
    tableName: 'RateLimiter',
});

const rateLimiterMiddleware = (req, res, next) => {
    const newReq = { ...req };
    newReq.headers = { ...req.header };
    newReq.headers.get = (key) => req.get(key);
    const ip = ipAddress(newReq) || 'no-ip';
    rateLimiter.consume(ip)
        .then(() => {
            next();
        })
        .catch(() => {
            res.status(429).send('Too Many Requests');
        });
};

module.exports = rateLimiterMiddleware;