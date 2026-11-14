/**
 * Valid lending statuses for a book entity.
 */
export const BOOK_STATUS = Object.freeze({
  AVAILABLE: 'available',
  BORROWED: 'borrowed',
});

/**
 * Validation boundaries for book fields.
 */
export const FIELD_LIMITS = Object.freeze({
  TITLE_MIN: 1,
  TITLE_MAX: 200,
  AUTHOR_MIN: 1,
  AUTHOR_MAX: 120,
  CATEGORY_MIN: 1,
  CATEGORY_MAX: 60,
  BORROWED_BY_MIN: 1,
  BORROWED_BY_MAX: 120,
  YEAR_MIN: 0,
});

/**
 * Allowed mutable fields in POST and PUT payloads (strict schema).
 */
export const ALLOWED_BOOK_FIELDS = Object.freeze([
  'title',
  'author',
  'category',
  'year',
  'status',
  'borrowedBy',
]);

/**
 * Allowed query filter fields for GET /api/v1/books.
 */
export const ALLOWED_FILTER_FIELDS = Object.freeze([
  'status',
  'category',
  'author',
]);

/**
 * Standard application error codes returned in error envelopes.
 */
export const ERROR_CODES = Object.freeze({
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_ID: 'INVALID_ID',
  INVALID_JSON: 'INVALID_JSON',
  BOOK_NOT_FOUND: 'BOOK_NOT_FOUND',
  ROUTE_NOT_FOUND: 'ROUTE_NOT_FOUND',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
});

/**
 * HTTP status code constants to avoid magic numbers across layers.
 */
export const HTTP_STATUS = Object.freeze({
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
});
