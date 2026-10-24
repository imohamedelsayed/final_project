const { RateLimitError } = require('../shared/errors');

function createRateLimiter({
  windowMs = 60000,
  max = 100,
  keyGenerator = (req) => req.ip || req.socket.remoteAddress || 'unknown',
  message = 'Too many requests. Please try again later.'
} = {}) {
  const store = new Map();

  // Periodic cleanup of expired entries every 2 minutes
  const cleanupInterval = setInterval(
    () => {
      const now = Date.now();
      for (const [key, record] of store.entries()) {
        if (now > record.resetTime) {
          store.delete(key);
        }
      }
    },
    Math.max(windowMs, 60000)
  );

  // Do not keep Node process alive just for the cleanup timer
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  return function rateLimitMiddleware(req, res, next) {
    const key = keyGenerator(req);
    const now = Date.now();

    let record = store.get(key);
    if (!record || now > record.resetTime) {
      record = {
        count: 0,
        resetTime: now + windowMs
      };
      store.set(key, record);
    }

    record.count += 1;

    const remaining = Math.max(0, max - record.count);
    const resetSeconds = Math.ceil(record.resetTime / 1000);

    res.setHeader('RateLimit-Limit', max);
    res.setHeader('RateLimit-Remaining', remaining);
    res.setHeader('RateLimit-Reset', resetSeconds);

    if (record.count > max) {
      res.setHeader('Retry-After', Math.ceil((record.resetTime - now) / 1000));
      return next(new RateLimitError(message));
    }

    return next();
  };
}

module.exports = { createRateLimiter };
