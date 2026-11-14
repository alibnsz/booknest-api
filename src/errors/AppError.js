import { ERROR_CODES, HTTP_STATUS } from '../constants/book.constants.js';

/**
 * Base class for all operational application errors.
 * Keeps HTTP mapping centralized in the error-handling middleware.
 */
export class AppError extends Error {
  /**
   * @param {object} options
   * @param {string} options.message - Human-readable error message
   * @param {number} [options.statusCode=500] - HTTP status code
   * @param {string} [options.code='INTERNAL_ERROR'] - Machine-readable error code
   * @param {Array<{field: string, message: string}>} [options.details] - Optional field-level error details
   * @param {boolean} [options.isOperational=true] - Marks expected domain/validation errors
   */
  constructor({
    message,
    statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR,
    code = ERROR_CODES.INTERNAL_ERROR,
    details = undefined,
    isOperational = true,
  }) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}
