import crypto from 'node:crypto';
import { BOOK_STATUS, ERROR_CODES } from '../constants/book.constants.js';
import { NotFoundError } from '../errors/NotFoundError.js';

/**
 * Checks if a book matches the optional filter criteria.
 * `status` is exact match; `category` and `author` are case-insensitive exact match.
 */
function matchesFilters(book, filters) {
  if (filters.status && book.status !== filters.status) {
    return false;
  }
  if (
    filters.category &&
    book.category.toLowerCase() !== filters.category.toLowerCase()
  ) {
    return false;
  }
  if (
    filters.author &&
    book.author.toLowerCase() !== filters.author.toLowerCase()
  ) {
    return false;
  }
  return true;
}

/**
 * Normalizes lending state (`available` always has `borrowedBy: null`).
 */
function normalizeLendingState(input) {
  const status = input.status ?? BOOK_STATUS.AVAILABLE;
  const borrowedBy =
    status === BOOK_STATUS.AVAILABLE ? null : input.borrowedBy ?? null;
  return { status, borrowedBy };
}

/**
 * Creates the Book domain service with an injected repository.
 * Contains business logic and domain rules without any HTTP knowledge.
 *
 * @param {ReturnType<import('../repositories/book.repository.js').createBookRepository>} bookRepository
 */
export function createBookService(bookRepository) {
  return Object.freeze({
    /**
     * Lists all books matching the provided filter criteria.
     * @param {{ status?: string, category?: string, author?: string }} [filters={}]
     */
    async listBooks(filters = {}) {
      const books = await bookRepository.findAll();
      return books.filter((book) => matchesFilters(book, filters));
    },

    /**
     * Retrieves a single book by ID or throws `NotFoundError` (`BOOK_NOT_FOUND`).
     * @param {string} id
     */
    async getBookById(id) {
      const book = await bookRepository.findById(id);
      if (!book) {
        throw new NotFoundError(
          `Book with id '${id}' was not found.`,
          ERROR_CODES.BOOK_NOT_FOUND
        );
      }
      return book;
    },

    /**
     * Creates a new book with server-generated UUID and timestamps.
     * @param {object} bookInput
     */
    async createBook(bookInput) {
      const now = new Date().toISOString();
      const { status, borrowedBy } = normalizeLendingState(bookInput);
      const newBook = {
        id: crypto.randomUUID(),
        title: bookInput.title,
        author: bookInput.author,
        category: bookInput.category,
        year: bookInput.year,
        status,
        borrowedBy,
        createdAt: now,
        updatedAt: now,
      };
      return bookRepository.create(newBook);
    },

    /**
     * Replaces mutable fields on an existing book while preserving `id` and `createdAt`
     * and refreshing `updatedAt`.
     * @param {string} id
     * @param {object} bookInput
     */
    async updateBook(id, bookInput) {
      const { status, borrowedBy } = normalizeLendingState(bookInput);
      const updated = await bookRepository.update(id, (existing) => ({
        id: existing.id,
        title: bookInput.title,
        author: bookInput.author,
        category: bookInput.category,
        year: bookInput.year,
        status,
        borrowedBy,
        createdAt: existing.createdAt,
        updatedAt: new Date().toISOString(),
      }));

      if (!updated) {
        throw new NotFoundError(
          `Book with id '${id}' was not found.`,
          ERROR_CODES.BOOK_NOT_FOUND
        );
      }
      return updated;
    },

    /**
     * Deletes a book by ID or throws `NotFoundError` (`BOOK_NOT_FOUND`).
     * @param {string} id
     */
    async deleteBook(id) {
      const removed = await bookRepository.remove(id);
      if (!removed) {
        throw new NotFoundError(
          `Book with id '${id}' was not found.`,
          ERROR_CODES.BOOK_NOT_FOUND
        );
      }
    },
  });
}
