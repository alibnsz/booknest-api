import { ERROR_CODES, HTTP_STATUS } from '../constants/book.constants.js';
import { AppError } from '../errors/AppError.js';

/**
 * Checks whether an error came from `express.json()` failing to parse malformed JSON.
 */
function isMalformedJsonError(err) {
  return (
    err instanceof SyntaxError &&
    err.status === HTTP_STATUS.BAD_REQUEST &&
    'body' in err
  );
}

/**
 * Builds the standard error response envelope.
 */
function buildErrorEnvelope(code, message, details) {
  const error = { code, message };
  if (Array.isArray(details) && details.length > 0) {
    error.details = details;
  }
  return { success: false, error };
}

/**
 * Centralized Express error-handling middleware.
 * Maps operational `AppError` instances and malformed JSON to structured 4xx responses,
 * while hiding internal details and stack traces on unexpected 500 errors.
 */
export function errorHandlerMiddleware(err, _req, res, _next) {
  if (isMalformedJsonError(err)) {
    return res
      .status(HTTP_STATUS.BAD_REQUEST)
      .json(
        buildErrorEnvelope(
          ERROR_CODES.INVALID_JSON,
          'Malformed JSON in request body.'
        )
      );
  }

  if (err instanceof AppError && err.isOperational) {
    return res
      .status(err.statusCode)
      .json(buildErrorEnvelope(err.code, err.message, err.details));
  }

  console.error('[Unhandled Error]', err);
  return res
    .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
    .json(
      buildErrorEnvelope(
        ERROR_CODES.INTERNAL_ERROR,
        'An unexpected internal server error occurred.'
      )
    );
}
