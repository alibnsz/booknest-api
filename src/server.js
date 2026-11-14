import { createApp } from './app.js';
import { config } from './config/index.js';
import { createBookRepository } from './repositories/book.repository.js';
import { createJsonFileStore } from './repositories/json-file.store.js';
import { createBookService } from './services/book.service.js';

/**
 * Composition root: wires persistence, domain service, and HTTP layers, then starts the HTTP server.
 */
function bootstrap() {
  const store = createJsonFileStore(config.dataFilePath);
  const bookRepository = createBookRepository(store);
  const bookService = createBookService(bookRepository);
  const app = createApp({ bookService });

  const server = app.listen(config.port, () => {
    console.log(
      `[BookNest API] Server running on http://localhost:${config.port} (${config.env})`
    );
  });

  const shutdown = (signal) => {
    console.log(`\n[BookNest API] Received ${signal}. Shutting down gracefully...`);
    server.close(() => {
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  return server;
}

bootstrap();
