import { AppError } from './AppError.js';
import { ERROR_CODES, HTTP_STATUS } from '../constants/book.constants.js';

/**
 * Thrown when incoming request parameters, query strings, or body fail validation.
 */
export class ValidationError extends AppError {
  /**
   * @param {string} [message='Request validation failed.']
   * @param {Array<{field: string, message: string}>} [details=[]]
   * @param {string} [code=ERROR_CODES.VALIDATION_ERROR]
   */
  constructor(
    message = 'Request validation failed.',
    details = undefined,
    code = ERROR_CODES.VALIDATION_ERROR
  ) {
    super({
      message,
      statusCode: HTTP_STATUS.BAD_REQUEST,
      code,
      details,
      isOperational: true,
    });
  }
}
