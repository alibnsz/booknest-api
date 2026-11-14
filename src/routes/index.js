import { Router } from 'express';

/**
 * Mounts all versioned API resource routers under `/api/v1`.
 *
 * @param {object} dependencies
 * @param {import('express').Router} dependencies.bookRouter
 */
export function createApiRouter({ bookRouter }) {
  const apiRouter = Router();

  apiRouter.use('/books', bookRouter);

  return apiRouter;
}
