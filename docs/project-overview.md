# BookNest API — Project Overview

## 1. Purpose & Scenario

**BookNest API** is a RESTful backend service designed for libraries to manage their book catalog and track lending statuses (`available` vs. `borrowed`). Instead of tracking inventory with spreadsheets or manual records, BookNest provides a centralized HTTP/JSON service (`/api/v1/books`) for adding, listing, filtering, updating, and removing books.

## 2. Architecture

The project uses a **Layered Architecture** with unidirectional dependencies wired in `src/server.js`:

```text
Client → Logger Middleware → Routes → Validators → Controllers → Services → Repositories → JSON Store
```

- **Middleware (`src/middleware/`):** Logs every incoming request (`method`, `url`, `statusCode`, `duration`) to the console and `logs/requests.log`, handles unknown routes (`404`), and formats errors into a consistent JSON structure.
- **Routes & Controllers (`src/routes/`, `src/controllers/`):** Maps REST endpoints to controller handlers and returns standardized JSON responses.
- **Validators (`src/validators/`):** Validates request fields, UUID parameters, query filters, and lending rules (`borrowed` books require `borrowedBy`; `available` books normalize `borrowedBy` to `null`).
- **Services (`src/services/`):** Implements domain logic, UUID/timestamp assignment, and filtering (`status`, `category`, `author`).
- **Repositories (`src/repositories/`):** Abstracts JSON persistence using atomic writes (temporary file + rename) and a sequential write queue to prevent data corruption.

## 3. Verification

- **Automated Tests:** 20 unit and integration tests using Node's built-in `node:test` runner (`npm test`).
- **Postman Tests:** All CRUD operations and validation cases verified with Postman (`docs/postman/`).
