const crypto = require('node:crypto');

function requestIdMiddleware(req, res, next) {
  const incomingId = req.headers['x-request-id'];
  const requestId =
    typeof incomingId === 'string' && incomingId.trim().length > 0
      ? incomingId.trim()
      : crypto.randomUUID();

  req.id = requestId;
  res.setHeader('x-request-id', requestId);
  next();
}

module.exports = { requestIdMiddleware };
