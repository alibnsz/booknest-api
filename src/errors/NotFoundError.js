import { AppError } from './AppError.js';
import { ERROR_CODES, HTTP_STATUS } from '../constants/book.constants.js';

/**
 * Thrown when a requested book resource or route cannot be found.
 */
export class NotFoundError extends AppError {
  /**
   * @param {string} message - Explanation of what resource was not found
   * @param {string} [code=ERROR_CODES.BOOK_NOT_FOUND] - Specific 404 error code
   */
  constructor(message, code = ERROR_CODES.BOOK_NOT_FOUND) {
    super({
      message,
      statusCode: HTTP_STATUS.NOT_FOUND,
      code,
      isOperational: true,
    });
  }
}
