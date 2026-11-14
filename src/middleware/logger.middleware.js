import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config/index.js';

/**
 * Initializes an append write stream for request logs.
 * Failures are swallowed so logging issues never prevent the server or requests from working.
 */
function createLogStream(logFilePath) {
  try {
    fs.mkdirSync(path.dirname(logFilePath), { recursive: true });
    const stream = fs.createWriteStream(logFilePath, { flags: 'a', encoding: 'utf8' });
    stream.on('error', () => {
      // Never crash the process on log stream errors
    });
    return stream;
  } catch {
    return null;
  }
}

/**
 * Formats a single structured request log line:
 * `[2026-11-14T10:00:00.123Z] GET /api/v1/books 200 4ms`
 */
function formatLogLine(timestamp, method, url, statusCode, durationMs) {
  return `[${timestamp}] ${method} ${url} ${statusCode} ${durationMs}ms`;
}

/**
 * Creates the request logging middleware.
 * Logs every incoming HTTP request on response finish to both stdout and the configured log file.
 *
 * @param {object} [options]
 * @param {string} [options.logFilePath]
 * @param {boolean} [options.silentConsole=false]
 */
export function createLoggerMiddleware({
  logFilePath = config.logFilePath,
  silentConsole = false,
} = {}) {
  const stream = createLogStream(logFilePath);

  return function loggerMiddleware(req, res, next) {
    const startTime = process.hrtime.bigint();
    const timestamp = new Date().toISOString();

    res.on('finish', () => {
      try {
        const elapsedNs = process.hrtime.bigint() - startTime;
        const durationMs = Math.round(Number(elapsedNs) / 1_000_000);
        const line = formatLogLine(
          timestamp,
          req.method,
          req.originalUrl || req.url,
          res.statusCode,
          durationMs
        );

        if (!silentConsole) {
          console.log(line);
        }
        if (stream && !stream.destroyed) {
          stream.write(`${line}\n`);
        }
      } catch {
        // Logging failures must never break the HTTP lifecycle
      }
    });

    next();
  };
}
