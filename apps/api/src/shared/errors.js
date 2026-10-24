class AppError extends Error {
  constructor(message, { statusCode = 500, code = 'INTERNAL_ERROR', fields = {} } = {}) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.fields = fields;
    Error.captureStackTrace(this, this.constructor);
  }
}

class BadRequestError extends AppError {
  constructor(message = 'Invalid request format or parameters.', fields = {}) {
    super(message, { statusCode: 400, code: 'BAD_REQUEST', fields });
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required.', code = 'UNAUTHORIZED') {
    super(message, { statusCode: 401, code });
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission to access this resource.', code = 'FORBIDDEN') {
    super(message, { statusCode: 403, code });
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found.') {
    super(message, { statusCode: 404, code: 'NOT_FOUND' });
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource conflict or state collision.', code = 'CONFLICT') {
    super(message, { statusCode: 409, code });
  }
}

class ValidationError extends AppError {
  constructor(message = 'Validation failed.', fields = {}) {
    super(message, { statusCode: 422, code: 'VALIDATION_ERROR', fields });
  }
}

class RateLimitError extends AppError {
  constructor(message = 'Too many requests. Please try again later.') {
    super(message, { statusCode: 429, code: 'RATE_LIMITED' });
  }
}

class ServiceUnavailableError extends AppError {
  constructor(message = 'Service temporarily unavailable.') {
    super(message, { statusCode: 503, code: 'SERVICE_UNAVAILABLE' });
  }
}

module.exports = {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  RateLimitError,
  ServiceUnavailableError
};
