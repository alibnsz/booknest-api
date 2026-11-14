import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Ensures the target JSON storage file exists on disk, initializing it with `[]` if absent.
 * @param {string} filePath
 */
async function ensureFileExists(filePath) {
  try {
    await fs.access(filePath);
  } catch {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, '[]\n', 'utf8');
  }
}

/**
 * Writes JSON atomically by writing to a sibling temporary file and renaming it over the target.
 * Prevents partial/corrupted files on crash.
 * @param {string} filePath
 * @param {unknown} data
 */
async function writeJsonAtomically(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${crypto.randomUUID()}.tmp`;
  const payload = `${JSON.stringify(data, null, 2)}\n`;

  try {
    await fs.writeFile(tempPath, payload, 'utf8');
    await fs.rename(tempPath, filePath);
  } catch (err) {
    await fs.rm(tempPath, { force: true }).catch(() => {});
    throw err;
  }
}

/**
 * Creates a serialized, atomic JSON file store.
 * All read/write and read-modify-write operations run through a sequential promise queue
 * to prevent race conditions across concurrent HTTP requests.
 *
 * @param {string} filePath - Absolute path to the JSON storage file
 */
export function createJsonFileStore(filePath) {
  let queue = Promise.resolve();

  const enqueue = (task) => {
    const next = queue.then(task, task);
    queue = next.catch(() => {});
    return next;
  };

  const readUnsafe = async () => {
    await ensureFileExists(filePath);
    const raw = await fs.readFile(filePath, 'utf8');
    const trimmed = raw.trim();
    if (!trimmed) {
      return [];
    }
    return JSON.parse(trimmed);
  };

  return Object.freeze({
    /**
     * Reads and parses the current array from the JSON file.
     * @returns {Promise<Array<object>>}
     */
    read() {
      return enqueue(() => readUnsafe());
    },

    /**
     * Atomically replaces the JSON file contents with `data`.
     * @param {Array<object>} data
     * @returns {Promise<void>}
     */
    write(data) {
      return enqueue(() => writeJsonAtomically(filePath, data));
    },

    /**
     * Executes a serialized read-modify-write transaction.
     * @template T
     * @param {(currentData: Array<object>) => { nextData: Array<object>, result: T } | Promise<{ nextData: Array<object>, result: T }>} mutator
     * @returns {Promise<T>}
     */
    transact(mutator) {
      return enqueue(async () => {
        const currentData = await readUnsafe();
        const { nextData, result } = await mutator(currentData);
        if (nextData !== undefined) {
          await writeJsonAtomically(filePath, nextData);
        }
        return result;
      });
    },
  });
}
