import { HTTP_STATUS } from '../constants/book.constants.js';
import {
  validateBookFilters,
  validateBookId,
  validateCreateBook,
  validateUpdateBook,
} from '../validators/book.validator.js';

/**
 * Wraps an async route handler and forwards rejected promises to Express error middleware.
 * @param {Function} fn
 */
export function asyncHandler(fn) {
  return function wrappedHandler(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Creates HTTP controllers for the `Book` resource.
 * Translates HTTP requests into service calls and wraps results in the standard envelope.
 *
 * @param {ReturnType<import('../services/book.service.js').createBookService>} bookService
 */
export function createBookController(bookService) {
  return Object.freeze({
    /**
     * `GET /api/v1/books` — List books with optional query filtering.
     */
    listBooks: asyncHandler(async (req, res) => {
      const filters = validateBookFilters(req.query);
      const books = await bookService.listBooks(filters);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        count: books.length,
        data: books,
      });
    }),

    /**
     * `GET /api/v1/books/:id` — Retrieve a single book by UUID.
     */
    getBookById: asyncHandler(async (req, res) => {
      const id = validateBookId(req.params.id);
      const book = await bookService.getBookById(id);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: book,
      });
    }),

    /**
     * `POST /api/v1/books` — Create a new book record.
     */
    createBook: asyncHandler(async (req, res) => {
      const payload = validateCreateBook(req.body);
      const book = await bookService.createBook(payload);
      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        data: book,
      });
    }),

    /**
     * `PUT /api/v1/books/:id` — Replace mutable fields of an existing book.
     */
    updateBook: asyncHandler(async (req, res) => {
      const id = validateBookId(req.params.id);
      const payload = validateUpdateBook(req.body);
      const book = await bookService.updateBook(id, payload);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: book,
      });
    }),

    /**
     * `DELETE /api/v1/books/:id` — Delete a book by UUID.
     */
    deleteBook: asyncHandler(async (req, res) => {
      const id = validateBookId(req.params.id);
      await bookService.deleteBook(id);
      res.status(HTTP_STATUS.NO_CONTENT).send();
    }),
  });
}
