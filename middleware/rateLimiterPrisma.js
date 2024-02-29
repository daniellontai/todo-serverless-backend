const { prisma } = require("../prisma/initDb.js");
const { RateLimiterPrisma, RateLimiterMemory } = require('rate-limiter-flexible');
import { ipAddress, next as vercelNext } from '@vercel/edge'

const rateLimiterMemory = new RateLimiterMemory({
    points: 1, // if there are 5 workers
    duration: 1,
});

const rateLimiter = new RateLimiterPrisma({
    storeClient: prisma,
    points: 20, // Number of points (requests) allowed
    duration: 5, // seconds
    //insuranceLimiter: rateLimiterMemory,
    tableName: 'RateLimiter',
});

const rateLimiterMiddleware = (req, res, next) => {
    const ip = ipAddress(request) || '127.0.0.9'
    rateLimiter.consume(ip)
      .then(() => {
        next();
      })
      .catch(() => {
        res.status(429).send('Too Many Requests');
      });
  };
  
  module.exports = rateLimiterMiddleware;