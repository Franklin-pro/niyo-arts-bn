# Niyo Arts Backend

Express + TypeScript + PostgreSQL + Sequelize API for the Niyo Arts storefront.

## Setup

1. Install Node.js (LTS) and PostgreSQL.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a PostgreSQL database named `niyo_arts` (or update `.env`).
4. Copy `.env.example` to `.env` and update the database credentials.
5. Configure the admin, SMTP, and Flutterwave values in `.env`. Use real
   provider settings and test credentials; never use example values in
   production.
6. Start the API (it creates missing tables and seeds the initial catalog):

   ```bash
   npm run dev
   ```

## API

The API runs at `http://localhost:4000` by default. Prefix these routes with
`/api` (for example, `GET http://localhost:4000/api/products`). Responses are
JSON. Send `Content-Type: application/json` with JSON request bodies.

### Available routes

| Method | Endpoint | Purpose | Success |
| --- | --- | --- | --- |
| GET | `/api/health` | Check API availability | `200` |
| GET | `/api/products` | Search and filter active artwork | `200` |
| GET | `/api/products/:slug` | Get active artwork details | `200` |
| GET | `/api/artists` | List artists with their active artwork | `200` |
| GET | `/api/artists/:slug` | Get an artist profile and active artwork | `200` |
| GET | `/api/collections` | List active collections and available artwork | `200` |
| GET | `/api/collections/:slug` | Get a collection and available artwork | `200` |
| POST | `/api/auth/register` | Register a customer account | `201` |
| POST | `/api/auth/login` | Log in | `200` |
| GET | `/api/auth/me` | Get the current account | `200` |
| POST | `/api/auth/forgot-password` | Email a password reset link | `200` |
| POST | `/api/auth/reset-password` | Set a new password | `200` |
| POST | `/api/carts` | Create a cart for the logged-in user | `201` |
| GET | `/api/carts/:cartId` | Get a cart | `200` |
| POST | `/api/carts/:cartId/items` | Add artwork quantities to a cart | `200` |
| PUT | `/api/carts/:cartId/items/:productSlug` | Set an artwork's cart quantity | `200` |
| DELETE | `/api/carts/:cartId/items/:productSlug` | Remove an artwork from a cart | `200` |
| DELETE | `/api/carts/:cartId/items` | Empty a cart | `200` |
| DELETE | `/api/carts/:cartId` | Delete a cart | `204` |
| GET | `/api/orders` | List the logged-in user's orders | `200` |
| GET | `/api/orders/:reference` | Get one of the user's orders | `200` |
| POST | `/api/orders` | Create an order from a cart or submitted items | `201` |
| POST | `/api/payments/orders/:reference/flutterwave` | Create hosted Flutterwave checkout | `200` |
| GET | `/api/payments/flutterwave/callback` | Verify checkout return and redirect | `303` |
| POST | `/api/payments/flutterwave/webhook` | Verify a Flutterwave payment webhook | `200` |
| POST | `/api/contact` | Submit a contact message | `201` |

`GET /api/health` returns `{ "status": "ok", "service": "niyo-arts-backend",
"timestamp": "<ISO timestamp>" }`.

### Authentication and roles

Public registration always creates a `user`; clients cannot choose their role.
Protected APIs require `Authorization: Bearer <accessToken>`. Access tokens
expire after one hour. Password reset invalidates previously issued tokens.

Register with `POST /api/auth/register`:

```json
{
  "name": "Alex Collector",
  "email": "alex@example.com",
  "phone": "+250780000000",
  "password": "choose-a-unique-password"
}
```

Login with `POST /api/auth/login` using the same `email` and `password` fields.
Both endpoints return
`{ "data": { "user": { "id": "...", "name": "...", "email": "...", "phone": "...", "role": "user" }, "accessToken": "..." } }`.
Passwords must be 8–128 characters; phone must be 5–40 characters.
`GET /api/auth/me` returns the current user profile.

`POST /api/auth/forgot-password` accepts `{ "email": "alex@example.com" }`.
Its response is identical whether or not an account exists. For an existing
account, the API sends a one-time reset URL that expires after 30 minutes.
`POST /api/auth/reset-password` accepts
`{ "token": "<token from reset URL>", "password": "new-unique-password" }`.

Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` to create the initial administrator
during server startup. The admin password must be at least 12 characters. If
the email already belongs to a user, startup promotes that account to admin
without changing its password. Never expose these environment values or allow
public registration to choose the admin role.

### Catalog

`GET /api/products` accepts these optional query parameters:

| Parameter | Accepted values | Default | Notes |
| --- | --- | --- | --- |
| `q` | Text, up to 120 characters | — | Searches artwork title, category, and artist name |
| `category` | Text, up to 80 characters | — | Exact category match; `all` disables the category filter |
| `sort` | `featured`, `price_asc`, `price_desc` | `featured` | `featured` currently returns the default order (oldest first) |
| `page` | Integer, at least 1 | `1` | One-based page number |
| `limit` | Integer, 1–100 | `24` | Number of products per page |

The product list response includes pagination metadata:

```json
{
  "data": [
    {
      "id": "product-id",
      "slug": "after-the-rain",
      "title": "After the Rain",
      "artist": {
        "slug": "artist-slug",
        "name": "Artist Name",
        "location": "Kigali, Rwanda",
        "medium": "Painting",
        "imageUrl": "https://example.com/artist.jpg"
      },
      "type": "Original",
      "category": "Painting",
      "price": 250,
      "currency": "USD",
      "imageUrl": "https://example.com/artwork.jpg",
      "description": "Artwork description."
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 24,
    "total": 1,
    "pages": 1
  }
}
```

`GET /api/products/:slug` returns `{ "data": <product> }` with the same product
shape. Artist and collection detail endpoints return `{ "data": ... }`:

- Artist: `slug`, `name`, `location`, `medium`, `bio`, `imageUrl`, and
  `products`.
- Collection: `slug`, `title`, `line`, `description`, `imageUrl`, and
  `products`.

`GET /api/artists` returns `{ "data": [...] }`. Each artist includes the detail
fields plus `workCount`, `startingPrice` (or `null` if there is no active work),
and `products`. `GET /api/collections` returns `{ "data": [...] }` with the
collection detail fields and `products`. Product objects within those responses
use the same shape as the product listing. Unavailable or inactive artwork is
omitted from artist and collection product lists.
 
CORS allows the origin configured by `CORS_ORIGIN` (default
`http://localhost:3000`) and credentials. Shipping calculation and refunds are
not implemented. Cart IDs are private identifiers tied to the authenticated
account.

## Notes

- `.env` is ignored by Git. Never commit real secrets.
- Startup uses `sequelize.sync()` to create missing tables and applies
  idempotent additive schema updates for account ownership and payment columns.
  Use versioned migrations for future production schema changes; do not use
  destructive sync options in production.
- Admin bootstrap credentials, JWT secrets, SMTP credentials, and Flutterwave
  secrets must be private, unique, and configured in the deployment
  environment, never committed to source control.
