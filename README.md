# BookNest API

A RESTful backend service for managing library book inventory and lending status, built with **Node.js** and **Express.js**.

## Quick Start

Requires **Node.js >= 20**.

```bash
git clone https://github.com/alibnsz/booknest-api.git
cd booknest-api
npm install
npm start
```

Server starts at `http://localhost:3000`.

### Scripts

| Command | Description |
|---|---|
| `npm start` | Start the server |
| `npm run dev` | Start with auto-reload (`nodemon`) |
| `npm test` | Run automated tests (`node:test`) |

## API Endpoints

Base URL: `http://localhost:3000/api/v1`

| Method | Endpoint | Description | Status |
|---|---|---|---|
| `GET` | `/health` | Health check *(root)* | `200` |
| `POST` | `/books` | Create a new book | `201` |
| `GET` | `/books` | List all books *(supports `?status=`, `?category=`, `?author=`)* | `200` |
| `GET` | `/books/:id` | Get a book by ID | `200` |
| `PUT` | `/books/:id` | Update a book (including lending status) | `200` |
| `DELETE` | `/books/:id` | Delete a book | `204` |

### Sample Payload (`POST /api/v1/books` & `PUT /api/v1/books/:id`)

```json
{
  "title": "Les Misérables",
  "author": "Victor Hugo",
  "category": "novel",
  "year": 1862,
  "status": "borrowed",
  "borrowedBy": "Ahmet Yılmaz"
}
```

## Documentation & Postman

- **Project Overview:** [`docs/project-overview.md`](docs/project-overview.md)
- **Postman Collection:** [`docs/postman/BookNest.postman_collection.json`](docs/postman/BookNest.postman_collection.json)
- **Postman Screenshots:** [`docs/postman/screenshots/`](docs/postman/screenshots/)

## Author

**Mehmet Ali Bunsuz** — MIT License
