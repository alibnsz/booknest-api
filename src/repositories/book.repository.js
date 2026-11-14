/**
 * Creates a book repository backed by an injected storage adapter.
 * Swapping from JSON file storage to a relational/NoSQL database requires
 * only a new implementation of this contract.
 *
 * @param {ReturnType<import('./json-file.store.js').createJsonFileStore>} store
 */
export function createBookRepository(store) {
  return Object.freeze({
    /**
     * Returns all stored books.
     * @returns {Promise<Array<object>>}
     */
    async findAll() {
      return store.read();
    },

    /**
     * Finds a single book by its unique ID, or returns `null` if not found.
     * @param {string} id
     * @returns {Promise<object | null>}
     */
    async findById(id) {
      const books = await store.read();
      return books.find((book) => book.id === id) ?? null;
    },

    /**
     * Persists a newly created book record.
     * @param {object} book
     * @returns {Promise<object>}
     */
    async create(book) {
      return store.transact((books) => ({
        nextData: [...books, book],
        result: book,
      }));
    },

    /**
     * Replaces an existing book by ID, or returns `null` if no book matches.
     * @param {string} id
     * @param {(existing: object) => object} updater
     * @returns {Promise<object | null>}
     */
    async update(id, updater) {
      return store.transact((books) => {
        const index = books.findIndex((book) => book.id === id);
        if (index === -1) {
          return { nextData: undefined, result: null };
        }
        const updatedBook = updater(books[index]);
        const nextBooks = [...books];
        nextBooks[index] = updatedBook;
        return { nextData: nextBooks, result: updatedBook };
      });
    },

    /**
     * Removes a book by ID. Returns `true` if deleted, `false` if not found.
     * @param {string} id
     * @returns {Promise<boolean>}
     */
    async remove(id) {
      return store.transact((books) => {
        const index = books.findIndex((book) => book.id === id);
        if (index === -1) {
          return { nextData: undefined, result: false };
        }
        const nextBooks = books.filter((book) => book.id !== id);
        return { nextData: nextBooks, result: true };
      });
    },
  });
}
