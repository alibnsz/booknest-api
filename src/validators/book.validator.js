import {
  ALLOWED_BOOK_FIELDS,
  ALLOWED_FILTER_FIELDS,
  BOOK_STATUS,
  ERROR_CODES,
  FIELD_LIMITS,
} from '../constants/book.constants.js';
import { ValidationError } from '../errors/ValidationError.js';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const VALID_STATUSES = Object.values(BOOK_STATUS);

/**
 * Validates a required trimmed string field within min/max character limits.
 */
function validateTextField(value, field, min, max, errors) {
  if (value === undefined || value === null) {
    errors.push({ field, message: `${field} is required.` });
    return null;
  }
  if (typeof value !== 'string') {
    errors.push({ field, message: `${field} must be a string.` });
    return null;
  }
  const trimmed = value.trim();
  if (trimmed.length < min) {
    errors.push({ field, message: `${field} is required.` });
    return null;
  }
  if (trimmed.length > max) {
    errors.push({
      field,
      message: `${field} must be at most ${max} characters.`,
    });
    return null;
  }
  return trimmed;
}

/**
 * Validates the publication year as an integer between 0 and the current year.
 */
function validateYearField(year, errors) {
  const currentYear = new Date().getFullYear();
  if (year === undefined || year === null) {
    errors.push({ field: 'year', message: 'year is required.' });
    return null;
  }
  if (!Number.isInteger(year) || year < FIELD_LIMITS.YEAR_MIN || year > currentYear) {
    errors.push({
      field: 'year',
      message: `year must be an integer between ${FIELD_LIMITS.YEAR_MIN} and ${currentYear}.`,
    });
    return null;
  }
  return year;
}

/**
 * Validates lending `status` and enforces lending consistency rules on `borrowedBy`.
 */
function validateLendingFields(payload, isUpdate, errors) {
  const rawStatus =
    payload.status === undefined && !isUpdate
      ? BOOK_STATUS.AVAILABLE
      : payload.status;

  if (rawStatus === undefined || rawStatus === null) {
    errors.push({ field: 'status', message: 'status is required.' });
    return { status: null, borrowedBy: null };
  }
  if (!VALID_STATUSES.includes(rawStatus)) {
    errors.push({
      field: 'status',
      message: `status must be one of: ${VALID_STATUSES.join(', ')}.`,
    });
    return { status: null, borrowedBy: null };
  }

  return validateBorrowedByForStatus(rawStatus, payload.borrowedBy, errors);
}

/**
 * Ensures borrowed books specify `borrowedBy` and available books have `null` or omitted `borrowedBy`.
 */
function validateBorrowedByForStatus(status, rawBorrowedBy, errors) {
  if (status === BOOK_STATUS.BORROWED) {
    if (
      typeof rawBorrowedBy !== 'string' ||
      rawBorrowedBy.trim().length < FIELD_LIMITS.BORROWED_BY_MIN
    ) {
      errors.push({
        field: 'borrowedBy',
        message: "borrowedBy is required when status is 'borrowed'.",
      });
      return { status, borrowedBy: null };
    }
    const trimmed = rawBorrowedBy.trim();
    if (trimmed.length > FIELD_LIMITS.BORROWED_BY_MAX) {
      errors.push({
        field: 'borrowedBy',
        message: `borrowedBy must be at most ${FIELD_LIMITS.BORROWED_BY_MAX} characters.`,
      });
      return { status, borrowedBy: null };
    }
    return { status, borrowedBy: trimmed };
  }

  if (rawBorrowedBy !== undefined && rawBorrowedBy !== null) {
    errors.push({
      field: 'borrowedBy',
      message: "borrowedBy must be null when status is 'available'.",
    });
  }
  return { status, borrowedBy: null };
}

/**
 * Checks for unknown or immutable fields in the request body.
 */
function collectUnknownFieldErrors(payload, allowedFields) {
  return Object.keys(payload)
    .filter((key) => !allowedFields.includes(key))
    .map((key) => ({
      field: key,
      message: `Unknown or non-editable field '${key}' is not allowed.`,
    }));
}

/**
 * Shared validator for create and update payloads.
 */
function validateBookPayload(payload, { isUpdate }) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new ValidationError('Request body must be a valid JSON object.', [
      { field: 'body', message: 'Request body must be a JSON object.' },
    ]);
  }

  const errors = collectUnknownFieldErrors(payload, ALLOWED_BOOK_FIELDS);
  const title = validateTextField(
    payload.title,
    'title',
    FIELD_LIMITS.TITLE_MIN,
    FIELD_LIMITS.TITLE_MAX,
    errors
  );
  const author = validateTextField(
    payload.author,
    'author',
    FIELD_LIMITS.AUTHOR_MIN,
    FIELD_LIMITS.AUTHOR_MAX,
    errors
  );
  const category = validateTextField(
    payload.category,
    'category',
    FIELD_LIMITS.CATEGORY_MIN,
    FIELD_LIMITS.CATEGORY_MAX,
    errors
  );
  const year = validateYearField(payload.year, errors);
  const { status, borrowedBy } = validateLendingFields(payload, isUpdate, errors);

  if (errors.length > 0) {
    throw new ValidationError('Request validation failed.', errors);
  }

  return { title, author, category, year, status, borrowedBy };
}

/**
 * Validates the `:id` route parameter as a UUID.
 * @param {string} id
 * @returns {string}
 */
export function validateBookId(id) {
  if (typeof id !== 'string' || !UUID_REGEX.test(id)) {
    throw new ValidationError(
      `Invalid book id '${id}'. Expected a valid UUID.`,
      [{ field: 'id', message: 'id must be a valid UUID.' }],
      ERROR_CODES.INVALID_ID
    );
  }
  return id;
}

/**
 * Validates and sanitizes a `POST /books` payload.
 * @param {unknown} payload
 */
export function validateCreateBook(payload) {
  return validateBookPayload(payload, { isUpdate: false });
}

/**
 * Validates and sanitizes a `PUT /books/:id` payload (full replacement of mutable fields).
 * @param {unknown} payload
 */
export function validateUpdateBook(payload) {
  return validateBookPayload(payload, { isUpdate: true });
}

/**
 * Validates optional query filters (`status`, `category`, `author`) for `GET /books`.
 * @param {Record<string, unknown>} query
 */
export function validateBookFilters(query = {}) {
  const errors = collectUnknownFieldErrors(query, ALLOWED_FILTER_FIELDS);
  const filters = {};

  if (query.status !== undefined) {
    if (typeof query.status !== 'string' || !VALID_STATUSES.includes(query.status)) {
      errors.push({
        field: 'status',
        message: `status filter must be one of: ${VALID_STATUSES.join(', ')}.`,
      });
    } else {
      filters.status = query.status;
    }
  }

  if (query.category !== undefined) {
    filters.category = String(query.category).trim();
  }

  if (query.author !== undefined) {
    filters.author = String(query.author).trim();
  }

  if (errors.length > 0) {
    throw new ValidationError('Invalid query parameters.', errors);
  }

  return filters;
}
