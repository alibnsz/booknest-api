import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';

import { createApp } from '../src/app.js';
import { BOOK_STATUS, ERROR_CODES } from '../src/constants/book.constants.js';
import { createLoggerMiddleware } from '../src/middleware/logger.middleware.js';
import { createBookRepository } from '../src/repositories/book.repository.js';
import { createJsonFileStore } from '../src/repositories/json-file.store.js';
import { createBookService } from '../src/services/book.service.js';

/**
 * Creates a lightweight in-memory mock repository for service unit tests.
 */
function createInMemoryBookRepository(initialBooks = []) {
  let store = [...initialBooks];
  return {
    async findAll() {
      return [...store];
    },
    async findById(id) {
      return store.find((b) => b.id === id) ?? null;
    },
    async create(book) {
      store.push(book);
      return book;
    },
    async update(id, updater) {
      const idx = store.findIndex((b) => b.id === id);
      if (idx === -1) return null;
      store[idx] = updater(store[idx]);
      return store[idx];
    },
    async remove(id) {
      const idx = store.findIndex((b) => b.id === id);
      if (idx === -1) return false;
      store.splice(idx, 1);
      return true;
    },
  };
}

describe('BookService — Unit Tests (In-Memory Mock Repository)', () => {
  it('assigns UUID, default status=available, borrowedBy=null, and timestamps on create', async () => {
    const repo = createInMemoryBookRepository();
    const service = createBookService(repo);

    const created = await service.createBook({
      title: '1984',
      author: 'George Orwell',
      category: 'dystopian',
      year: 1949,
    });

    assert.match(
      created.id,
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
    assert.equal(created.status, BOOK_STATUS.AVAILABLE);
    assert.equal(created.borrowedBy, null);
    assert.equal(created.createdAt, created.updatedAt);
  });

  it('normalizes borrowedBy to null when status is available', async () => {
    const repo = createInMemoryBookRepository();
    const service = createBookService(repo);

    const book = await service.createBook({
      title: 'Dune',
      author: 'Frank Herbert',
      category: 'sci-fi',
      year: 1965,
      status: 'borrowed',
      borrowedBy: 'Mehmet Ali',
    });

    const returned = await service.updateBook(book.id, {
      title: 'Dune',
      author: 'Frank Herbert',
      category: 'sci-fi',
      year: 1965,
      status: 'available',
      borrowedBy: null,
    });

    assert.equal(returned.status, BOOK_STATUS.AVAILABLE);
    assert.equal(returned.borrowedBy, null);
    assert.equal(returned.createdAt, book.createdAt);
  });

  it('throws BOOK_NOT_FOUND when getting, updating, or deleting a missing book', async () => {
    const repo = createInMemoryBookRepository();
    const service = createBookService(repo);
    const missingId = '00000000-0000-4000-8000-000000000000';

    await assert.rejects(() => service.getBookById(missingId), {
      code: ERROR_CODES.BOOK_NOT_FOUND,
      statusCode: 404,
    });

    await assert.rejects(
      () =>
        service.updateBook(missingId, {
          title: 'X',
          author: 'Y',
          category: 'Z',
          year: 2020,
          status: 'available',
          borrowedBy: null,
        }),
      {
        code: ERROR_CODES.BOOK_NOT_FOUND,
        statusCode: 404,
      }
    );

    await assert.rejects(() => service.deleteBook(missingId), {
      code: ERROR_CODES.BOOK_NOT_FOUND,
      statusCode: 404,
    });
  });
});

describe('BookNest API — Integration Tests (HTTP + Atomic JSON Store)', () => {
  let tempDir;
  let tempDataFile;
  let tempLogFile;
  let server;
  let baseUrl;
  let createdBookId;

  before(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'booknest-test-'));
    tempDataFile = path.join(tempDir, 'books.json');
    tempLogFile = path.join(tempDir, 'requests.log');

    const store = createJsonFileStore(tempDataFile);
    const repository = createBookRepository(store);
    const bookService = createBookService(repository);
    const loggerMiddleware = createLoggerMiddleware({
      logFilePath: tempLogFile,
      silentConsole: true,
    });
    const app = createApp({ bookService, loggerMiddleware });

    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const { port } = server.address();
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  it('GET /health returns 200 OK with service status and disables x-powered-by', async () => {
    const res = await fetch(`${baseUrl}/health`);
    const body = await res.json();

    assert.equal(res.status, 200);
    assert.equal(res.headers.get('x-powered-by'), null);
    assert.equal(body.success, true);
    assert.equal(body.data.status, 'ok');
  });

  it('Test Case 1: POST /api/v1/books with valid body returns 201 with id and timestamps', async () => {
    const res = await fetch(`${baseUrl}/api/v1/books`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: '  Les Misérables  ',
        author: 'Victor Hugo',
        category: 'novel',
        year: 1862,
      }),
    });
    const body = await res.json();

    assert.equal(res.status, 201);
    assert.equal(body.success, true);
    assert.equal(body.data.title, 'Les Misérables');
    assert.equal(body.data.author, 'Victor Hugo');
    assert.equal(body.data.category, 'novel');
    assert.equal(body.data.year, 1862);
    assert.equal(body.data.status, 'available');
    assert.equal(body.data.borrowedBy, null);
    assert.ok(body.data.id);
    assert.ok(body.data.createdAt);
    assert.ok(body.data.updatedAt);

    createdBookId = body.data.id;
  });

  it('Test Case 2: POST /api/v1/books with missing title returns 400 VALIDATION_ERROR', async () => {
    const res = await fetch(`${baseUrl}/api/v1/books`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        author: 'Victor Hugo',
        category: 'novel',
        year: 1862,
      }),
    });
    const body = await res.json();

    assert.equal(res.status, 400);
    assert.equal(body.success, false);
    assert.equal(body.error.code, ERROR_CODES.VALIDATION_ERROR);
    assert.ok(body.error.details.some((d) => d.field === 'title'));
  });

  it('POST /api/v1/books with unknown or immutable fields returns 400 VALIDATION_ERROR', async () => {
    const res = await fetch(`${baseUrl}/api/v1/books`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: '3f1c1a7e-6c1d-4a58-9a52-2f6f2b9d7a11',
        title: 'Clean Code',
        author: 'Robert C. Martin',
        category: 'software',
        year: 2008,
        isbn: '978-0132350884',
      }),
    });
    const body = await res.json();

    assert.equal(res.status, 400);
    assert.equal(body.error.code, ERROR_CODES.VALIDATION_ERROR);
    assert.ok(body.error.details.some((d) => d.field === 'id'));
    assert.ok(body.error.details.some((d) => d.field === 'isbn'));
  });

  it('Test Case 3: GET /api/v1/books returns 200 with array and count', async () => {
    const res = await fetch(`${baseUrl}/api/v1/books`);
    const body = await res.json();

    assert.equal(res.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.count, 1);
    assert.equal(Array.isArray(body.data), true);
    assert.equal(body.data[0].id, createdBookId);
  });

  it('Test Case 4: GET /api/v1/books/:id (existing) returns 200 with correct book', async () => {
    const res = await fetch(`${baseUrl}/api/v1/books/${createdBookId}`);
    const body = await res.json();

    assert.equal(res.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.id, createdBookId);
    assert.equal(body.data.title, 'Les Misérables');
  });

  it('Test Case 5: GET /api/v1/books/:id (non-existent UUID) returns 404 BOOK_NOT_FOUND', async () => {
    const missingId = '3f1c1a7e-6c1d-4a58-9a52-000000000000';
    const res = await fetch(`${baseUrl}/api/v1/books/${missingId}`);
    const body = await res.json();

    assert.equal(res.status, 404);
    assert.equal(body.success, false);
    assert.equal(body.error.code, ERROR_CODES.BOOK_NOT_FOUND);
  });

  it('Test Case 6: GET /api/v1/books/abc returns 400 INVALID_ID', async () => {
    const res = await fetch(`${baseUrl}/api/v1/books/abc`);
    const body = await res.json();

    assert.equal(res.status, 400);
    assert.equal(body.success, false);
    assert.equal(body.error.code, ERROR_CODES.INVALID_ID);
  });

  it('Test Case 7: PUT /api/v1/books/:id valid (mark as borrowed) returns 200 and updates updatedAt', async () => {
    await new Promise((r) => setTimeout(r, 5));

    const res = await fetch(`${baseUrl}/api/v1/books/${createdBookId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Les Misérables',
        author: 'Victor Hugo',
        category: 'novel',
        year: 1862,
        status: 'borrowed',
        borrowedBy: 'Ahmet Yılmaz',
      }),
    });
    const body = await res.json();

    assert.equal(res.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.status, 'borrowed');
    assert.equal(body.data.borrowedBy, 'Ahmet Yılmaz');
    assert.notEqual(body.data.updatedAt, body.data.createdAt);
  });

  it('Test Case 8: PUT /api/v1/books/:id borrowed without borrowedBy returns 400 VALIDATION_ERROR', async () => {
    const res = await fetch(`${baseUrl}/api/v1/books/${createdBookId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Les Misérables',
        author: 'Victor Hugo',
        category: 'novel',
        year: 1862,
        status: 'borrowed',
        borrowedBy: null,
      }),
    });
    const body = await res.json();

    assert.equal(res.status, 400);
    assert.equal(body.success, false);
    assert.equal(body.error.code, ERROR_CODES.VALIDATION_ERROR);
    assert.deepEqual(body.error.details, [
      {
        field: 'borrowedBy',
        message: "borrowedBy is required when status is 'borrowed'.",
      },
    ]);
  });

  it('PUT /api/v1/books/:id available with non-null borrowedBy returns 400 VALIDATION_ERROR', async () => {
    const res = await fetch(`${baseUrl}/api/v1/books/${createdBookId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Les Misérables',
        author: 'Victor Hugo',
        category: 'novel',
        year: 1862,
        status: 'available',
        borrowedBy: 'Ahmet Yılmaz',
      }),
    });
    const body = await res.json();

    assert.equal(res.status, 400);
    assert.equal(body.error.code, ERROR_CODES.VALIDATION_ERROR);
    assert.ok(body.error.details.some((d) => d.field === 'borrowedBy'));
  });

  it('GET /api/v1/books supports filtering by status, category, and author', async () => {
    await fetch(`${baseUrl}/api/v1/books`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Clean Code',
        author: 'Robert C. Martin',
        category: 'software',
        year: 2008,
      }),
    });

    const borrowedRes = await fetch(`${baseUrl}/api/v1/books?status=borrowed`);
    const borrowedBody = await borrowedRes.json();
    assert.equal(borrowedRes.status, 200);
    assert.equal(borrowedBody.count, 1);
    assert.equal(borrowedBody.data[0].title, 'Les Misérables');

    const categoryRes = await fetch(`${baseUrl}/api/v1/books?category=SOFTWARE`);
    const categoryBody = await categoryRes.json();
    assert.equal(categoryRes.status, 200);
    assert.equal(categoryBody.count, 1);
    assert.equal(categoryBody.data[0].title, 'Clean Code');

    const authorRes = await fetch(
      `${baseUrl}/api/v1/books?author=${encodeURIComponent('victor hugo')}`
    );
    const authorBody = await authorRes.json();
    assert.equal(authorRes.status, 200);
    assert.equal(authorBody.count, 1);
    assert.equal(authorBody.data[0].author, 'Victor Hugo');
  });

  it('Test Case 9 & 10: DELETE /api/v1/books/:id returns 204 and subsequent GET returns 404', async () => {
    const delRes = await fetch(`${baseUrl}/api/v1/books/${createdBookId}`, {
      method: 'DELETE',
    });
    assert.equal(delRes.status, 204);

    const getRes = await fetch(`${baseUrl}/api/v1/books/${createdBookId}`);
    const getBody = await getRes.json();
    assert.equal(getRes.status, 404);
    assert.equal(getBody.error.code, ERROR_CODES.BOOK_NOT_FOUND);
  });

  it('Test Case 11: GET /unknown returns 404 ROUTE_NOT_FOUND', async () => {
    const res = await fetch(`${baseUrl}/unknown`);
    const body = await res.json();

    assert.equal(res.status, 404);
    assert.equal(body.success, false);
    assert.equal(body.error.code, ERROR_CODES.ROUTE_NOT_FOUND);
  });

  it('Malformed JSON body returns 400 INVALID_JSON', async () => {
    const res = await fetch(`${baseUrl}/api/v1/books`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"title": "Broken JSON"',
    });
    const body = await res.json();

    assert.equal(res.status, 400);
    assert.equal(body.success, false);
    assert.equal(body.error.code, ERROR_CODES.INVALID_JSON);
  });

  it('handles concurrent POST requests safely without data loss', async () => {
    const concurrentCount = 10;
    const creations = Array.from({ length: concurrentCount }, (_, i) =>
      fetch(`${baseUrl}/api/v1/books`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Concurrent Book ${i + 1}`,
          author: 'Author',
          category: 'concurrency',
          year: 2024,
        }),
      })
    );

    const responses = await Promise.all(creations);
    for (const res of responses) {
      assert.equal(res.status, 201);
    }

    const listRes = await fetch(
      `${baseUrl}/api/v1/books?category=concurrency`
    );
    const listBody = await listRes.json();
    assert.equal(listBody.count, concurrentCount);
  });

  it('Logger middleware writes structured log lines to the log file', async () => {
    const logContents = await fs.readFile(tempLogFile, 'utf8');
    const lines = logContents.trim().split('\n');

    assert.ok(lines.length >= 10);
    assert.match(
      lines[0],
      /^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] GET \/health 200 \d+ms$/
    );
  });
});
