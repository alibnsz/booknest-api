import path from 'node:path';

const ROOT_DIR = process.cwd();

/**
 * Application configuration resolved from environment variables with safe defaults.
 */
export const config = Object.freeze({
  env: process.env.NODE_ENV || 'development',
  port: Number.parseInt(process.env.PORT || '3000', 10),
  dataFilePath: path.resolve(
    ROOT_DIR,
    process.env.DATA_FILE_PATH || 'src/data/books.json'
  ),
  logFilePath: path.resolve(
    ROOT_DIR,
    process.env.LOG_FILE_PATH || 'logs/requests.log'
  ),
  jsonBodyLimit: '10kb',
});
