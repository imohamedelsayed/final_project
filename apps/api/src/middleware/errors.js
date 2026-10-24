const { AppError } = require('../shared/errors');

function notFoundHandler(req, res) {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `No route matches ${req.method} ${req.originalUrl}.`,
      fields: {}
    },
    meta: { requestId: req.id || null }
  });
}

function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  const requestId = req.id || null;

  if (error instanceof AppError) {
    if (error.statusCode >= 500 && req.log) {
      req.log.error({ err: error, requestId }, 'Internal application error');
    }
    return res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        fields: error.fields || {}
      },
      meta: { requestId }
    });
  }

  // Handle Zod validation errors
  if (error && error.name === 'ZodError' && Array.isArray(error.issues)) {
    const fields = {};
    for (const issue of error.issues) {
      const fieldPath = issue.path.join('.') || 'root';
      fields[fieldPath] = issue.message;
    }

    return res.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed.',
        fields
      },
      meta: { requestId }
    });
  }

  // Handle malformed JSON body errors from express.json()
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return res.status(400).json({
      error: {
        code: 'MALFORMED_JSON',
        message: 'Malformed JSON payload in request body.',
        fields: {}
      },
      meta: { requestId }
    });
  }

  // Unexpected internal errors
  if (req.log) {
    req.log.error({ err: error, requestId }, 'Unhandled request error');
  }

  return res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred.',
      fields: {}
    },
    meta: { requestId }
  });
}

module.exports = { errorHandler, notFoundHandler };
