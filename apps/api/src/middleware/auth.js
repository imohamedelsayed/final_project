const { UnauthorizedError, ForbiddenError } = require('../shared/errors');
const { validateSession } = require('../modules/auth/session-service');

function createSessionMiddleware(dataSource) {
  return async function sessionMiddleware(req, res, next) {
    req.session = null;
    req.user = null;
    req.sessionToken = null;

    if (!dataSource || !dataSource.isInitialized) {
      return next();
    }

    const token =
      (req.cookies && req.cookies.pixel_store_session) ||
      req.headers['x-session-token'] ||
      (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')
        ? req.headers.authorization.slice(7)
        : null);

    if (!token) {
      return next();
    }

    try {
      const result = await validateSession(dataSource, token);
      if (result) {
        req.session = result.session;
        req.user = result.user;
        req.sessionToken = token;
      } else {
        // Clear invalid/expired cookie
        res.clearCookie('pixel_store_session', { path: '/' });
      }
    } catch (err) {
      if (req.log) {
        req.log.error({ err }, 'Error during session validation');
      }
    }

    return next();
  };
}

function requireAuth(req, res, next) {
  if (!req.user) {
    return next(new UnauthorizedError('Authentication required.'));
  }
  return next();
}

function requireVerifiedEmail(req, res, next) {
  if (!req.user) {
    return next(new UnauthorizedError('Authentication required.'));
  }
  if (!req.user.email_verified_at) {
    return res.status(403).json({
      error: {
        code: 'EMAIL_UNVERIFIED',
        message: 'Please verify your email before proceeding.',
        fields: {}
      },
      meta: { requestId: req.id }
    });
  }
  return next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required.'));
    }
    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError('You do not have permission to access this resource.'));
    }
    return next();
  };
}

function createCsrfProtection({ config }) {
  const safeMethods = new Set(['GET', 'HEAD', 'OPTIONS']);

  return function csrfProtection(req, res, next) {
    if (safeMethods.has(req.method)) {
      return next();
    }

    // Only enforce CSRF if cookie-authenticated
    const hasSessionCookie = req.cookies && req.cookies.pixel_store_session;
    if (!hasSessionCookie) {
      return next();
    }

    // Validate Origin header if present
    const origin = req.headers.origin;
    if (origin && config.CORS_ORIGIN && origin !== config.CORS_ORIGIN) {
      return next(
        new ForbiddenError('CSRF protection: request origin does not match configured origin.')
      );
    }

    // Double submit cookie validation
    const headerToken = req.headers['x-csrf-token'];
    const cookieToken = req.cookies && req.cookies.pixel_store_csrf;

    if (headerToken && cookieToken && headerToken === cookieToken) {
      return next();
    }

    // If Origin is present and trusted, permit
    if (origin && origin === config.CORS_ORIGIN) {
      return next();
    }

    return next(new ForbiddenError('CSRF token missing or mismatch.'));
  };
}

module.exports = {
  createSessionMiddleware,
  requireAuth,
  requireVerifiedEmail,
  requireRole,
  createCsrfProtection
};
