import { ERROR_CODES } from '../constants/book.constants.js';
import { NotFoundError } from '../errors/NotFoundError.js';

/**
 * Fallback middleware for unmatched HTTP routes.
 */
export function notFoundMiddleware(req, _res, next) {
  next(
    new NotFoundError(
      `Route '${req.method} ${req.originalUrl}' was not found.`,
      ERROR_CODES.ROUTE_NOT_FOUND
    )
  );
}
