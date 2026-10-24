const cookieParser = require('cookie-parser');
const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const pinoHttp = require('pino-http');
const { errorHandler, notFoundHandler } = require('./middleware/errors');
const { createRateLimiter } = require('./middleware/rate-limit');
const { requestIdMiddleware } = require('./middleware/request-id');
const { createSessionMiddleware, createCsrfProtection } = require('./middleware/auth');
const { createEmailService } = require('./modules/auth/email-service');
const { createAuthController } = require('./modules/auth/auth-controller');
const { createAuthRoutes } = require('./modules/auth/auth-routes');
const { createStorageAdapter } = require('./modules/media/storage-adapter');
const { createMediaService } = require('./modules/media/media-service');
const { createMediaController } = require('./modules/media/media-controller');
const { createMediaRoutes } = require('./modules/media/media-routes');
const { createCatalogService } = require('./modules/catalog/catalog-service');
const { createCatalogController } = require('./modules/catalog/catalog-controller');
const { createCatalogRoutes } = require('./modules/catalog/catalog-routes');
const { createCartService } = require('./modules/cart/cart-service');
const { createCartController } = require('./modules/cart/cart-controller');
const { createCartRoutes } = require('./modules/cart/cart-routes');
const { createOrderService } = require('./modules/orders/order-service');
const { createOrderController } = require('./modules/orders/order-controller');
const { createOrderRoutes } = require('./modules/orders/order-routes');

function createApp({
  config,
  logger,
  dataSource = null,
  emailService = null,
  storageAdapter = null
}) {
  const app = express();

  app.disable('x-powered-by');

  // Request ID middleware must run before logging and other handlers
  app.use(requestIdMiddleware);

  // Request logger with request ID correlation
  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => req.id,
      customAttributeKeys: {
        req: 'request',
        res: 'response',
        err: 'error',
        responseTime: 'durationMs'
      }
    })
  );

  // Security headers
  app.use(helmet());

  // CORS configuration
  const allowedOrigins = [config.CORS_ORIGIN];
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, server-to-server)
        if (!origin || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(new Error('CORS policy: origin not allowed.'));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'x-request-id',
        'Idempotency-Key',
        'x-csrf-token',
        'x-session-token'
      ]
    })
  );

  // Cookie parser
  app.use(cookieParser());

  // Body parser with 100kb payload ceiling to prevent body-inflation DoS
  app.use(express.json({ limit: '100kb' }));

  // Global rate limiter skeleton
  const globalRateLimiter = createRateLimiter({
    windowMs: config.RATE_LIMIT_WINDOW_MS,
    max: config.RATE_LIMIT_MAX_REQUESTS
  });
  app.use(globalRateLimiter);

  // Session and CSRF middleware
  app.use(createSessionMiddleware(dataSource));
  app.use(createCsrfProtection({ config }));

  // Email service wiring
  const activeEmailService = emailService || createEmailService({ config, logger });
  app.locals.emailService = activeEmailService;

  // Liveness health check
  app.get('/health', (req, res) => {
    res.status(200).json({
      data: {
        status: 'ok',
        service: 'pixel-store-api',
        environment: config.NODE_ENV,
        uptime: Math.floor(process.uptime())
      },
      meta: { requestId: req.id }
    });
  });

  // Readiness health check (dependency safe — never leaks credentials)
  app.get('/health/ready', async (req, res) => {
    let databaseStatus = 'not_configured';

    if (dataSource && dataSource.isInitialized) {
      try {
        await dataSource.query('SELECT 1');
        databaseStatus = 'connected';
      } catch (err) {
        if (req.log) {
          req.log.error({ err }, 'Database readiness check failed');
        }
        return res.status(503).json({
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'Database readiness check failed.',
            fields: {}
          },
          meta: { requestId: req.id }
        });
      }
    }

    return res.status(200).json({
      data: {
        status: 'ready',
        service: 'pixel-store-api',
        database: databaseStatus
      },
      meta: { requestId: req.id }
    });
  });

  // Media storage and service wiring
  const activeStorageAdapter = storageAdapter || createStorageAdapter(config);
  const mediaService = createMediaService({
    storageAdapter: activeStorageAdapter,
    dataSource,
    config,
    logger
  });
  const mediaController = createMediaController({
    mediaService,
    storageAdapter: activeStorageAdapter,
    logger
  });
  const mediaRoutes = createMediaRoutes({ mediaController });
  app.use('/api/v1', mediaRoutes);

  // Mount API v1 modules
  if (dataSource && typeof dataSource.getRepository === 'function') {
    const authController = createAuthController({
      dataSource,
      emailService: activeEmailService,
      config,
      logger
    });
    const authRoutes = createAuthRoutes({ authController });
    app.use('/api/v1', authRoutes);

    const catalogService = createCatalogService({
      dataSource,
      mediaService,
      logger
    });
    const catalogController = createCatalogController({
      catalogService,
      mediaService,
      logger
    });
    const catalogRoutes = createCatalogRoutes({ catalogController });
    app.use('/api/v1', catalogRoutes);

    const cartService = createCartService({
      dataSource,
      logger
    });
    const cartController = createCartController({
      cartService,
      logger
    });
    const cartRoutes = createCartRoutes({ cartController });
    app.use('/api/v1', cartRoutes);

    const orderService = createOrderService({
      dataSource,
      config,
      logger
    });
    const orderController = createOrderController({
      orderService,
      logger,
      config
    });
    const orderRoutes = createOrderRoutes({ orderController });
    app.use('/api/v1', orderRoutes);
  }

  // 404 handler for unknown routes
  app.use(notFoundHandler);

  // Central error handler
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
