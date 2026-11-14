import { Router } from 'express';

/**
 * Builds the Express router for `/api/v1/books`.
 *
 * @param {ReturnType<import('../controllers/book.controller.js').createBookController>} bookController
 */
export function createBookRouter(bookController) {
  const router = Router();

  router
    .route('/')
    .get(bookController.listBooks)
    .post(bookController.createBook);

  router
    .route('/:id')
    .get(bookController.getBookById)
    .put(bookController.updateBook)
    .delete(bookController.deleteBook);

  return router;
}
