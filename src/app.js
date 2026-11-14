import express from 'express';
import { config } from './config/index.js';
import { HTTP_STATUS } from './constants/book.constants.js';
import { createBookController } from './controllers/book.controller.js';
import { errorHandlerMiddleware } from './middleware/error-handler.middleware.js';
import { createLoggerMiddleware } from './middleware/logger.middleware.js';
import { notFoundMiddleware } from './middleware/not-found.middleware.js';
import { createBookRouter } from './routes/book.routes.js';
import { createApiRouter } from './routes/index.js';

/**
 * Express application factory (without calling `listen` so integration tests can import it).
 *
 * @param {object} dependencies
 * @param {ReturnType<import('./services/book.service.js').createBookService>} dependencies.bookService
 * @param {import('express').RequestHandler} [dependencies.loggerMiddleware]
 */
export function createApp({ bookService, loggerMiddleware }) {
  const app = express();

  app.disable('x-powered-by');

  const requestLogger = loggerMiddleware ?? createLoggerMiddleware();
  app.use(requestLogger);

  app.use(express.json({ limit: config.jsonBodyLimit }));

  app.get('/health', (_req, res) => {
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      },
    });
  });

  const bookController = createBookController(bookService);
  const bookRouter = createBookRouter(bookController);
  app.use('/api/v1', createApiRouter({ bookRouter }));

  app.use(notFoundMiddleware);
  app.use(errorHandlerMiddleware);

  return app;
}
