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
6. Configure `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and
   `CLOUDINARY_API_SECRET` (required for production). Optionally set
   `CLOUDINARY_FOLDER` (defaults to `niyo-arts`).
7. For production, set `NODE_ENV=production`, `DATABASE_URL` (or all of
   `DB_HOST`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD`), `CORS_ORIGIN` to the
   exact frontend origin(s), and a valid `PORT`. Production database TLS
   validates server certificates; use a trusted CA. If deployed behind a
   reverse proxy, set `TRUST_PROXY_HOPS` to the number of trusted proxy hops
   so client IPs and rate limits work as intended.
8. If you need to recreate the database schema independently, run:

   ```bash
   npm run migrate
   ```

   This loads the registered Sequelize models, creates missing tables, and
   applies pending project migrations. It does not restore deleted records.
9. Start the API (it also ensures tables and schema updates are current):

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
| POST | `/api/admin/images` | Upload a catalog image to Cloudinary (admin only) | `201` |
| POST | `/api/admin/products/images` | Upload front, right, and left artwork images to Cloudinary (admin only) | `201` |
| POST | `/api/carts` | Create an account-owned or guest cart | `201` |
| GET | `/api/carts/:cartId` | Get a cart | `200` |
| POST | `/api/carts/:cartId/items` | Add artwork quantities to a cart | `200` |
| PUT | `/api/carts/:cartId/items/:productSlug` | Set an artwork's cart quantity | `200` |
| DELETE | `/api/carts/:cartId/items/:productSlug` | Remove an artwork from a cart | `200` |
| DELETE | `/api/carts/:cartId/items` | Empty a cart | `200` |
| DELETE | `/api/carts/:cartId` | Delete a cart | `204` |
| GET | `/api/orders` | List the logged-in user's orders | `200` |
| GET | `/api/orders/:reference` | Get one of the user's orders | `200` |
| POST | `/api/orders` | Create a guest or account order from a cart or submitted items | `201` |
| POST | `/api/orders/track` | Track an order using its reference and email address | `200` |
| POST | `/api/payments/orders/:reference/flutterwave` | Create hosted Flutterwave checkout | `200` |
| GET | `/api/payments/flutterwave/callback` | Verify checkout return and redirect | `303` |
| POST | `/api/payments/flutterwave/webhook` | Verify a Flutterwave payment webhook | `200` |
| POST | `/api/contact` | Submit a contact message | `201` |
| GET | `/api/admin/dashboard` | Dashboard order, payment, sales, catalog, customer, and contact summary (admin only) | `200` |
| POST/PUT | `/api/admin/cafe/menu` | Upload the cafe menu PDF or replace the current one in Cloudinary (admin only) | `201`/`200` |
| GET | `/api/cafe/menu` | Get the current cafe menu PDF URL | `200` |
| GET | `/api/admin/cafe/gallery` | List cafe gallery images (admin only) | `200` |
| POST | `/api/admin/cafe/gallery` | Upload a cafe gallery image to Cloudinary (admin only) | `201` |
| DELETE | `/api/admin/cafe/gallery/:id` | Remove an image from the cafe gallery (admin only) | `204` |
| GET | `/api/cafe/gallery` | List public cafe gallery images | `200` |
| GET/POST | `/api/admin/events` | List or create Niyo events (admin only) | `200`/`201` |
| PUT/DELETE | `/api/admin/events/:id` | Update or delete a Niyo event (admin only) | `200`/`204` |
| GET | `/api/events` | List public Niyo events | `200` |
| GET | `/api/events/:id` | Get a public Niyo event | `200` |
| GET | `/api/admin/orders` | Search and filter orders (admin only) | `200` |
| GET | `/api/admin/orders/:reference` | View order, history, notes, payments, and email attempts (admin only) | `200` |
| PATCH | `/api/admin/orders/:reference` | Update order status (admin only) | `200` |
| POST | `/api/admin/orders/:reference/notes` | Add an internal order note (admin only) | `201` |
| PATCH | `/api/admin/orders/:reference/shipping` | Save DHL tracking and shipping status (admin only) | `200` |
| PATCH | `/api/admin/orders/:reference/digital-delivery` | Email a digital delivery link (admin only) | `200` |
| GET/POST/DELETE | `/api/admin/notification-recipients` | Manage new-order email recipients (admin only) | `200`/`201`/`204` |

The admin dashboard accepts optional `from` and `to` query parameters in
`YYYY-MM-DD` format (inclusive UTC dates). It defaults to the last 30 days and
returns order and payment totals, sales grouped by currency and day, recent
orders, and current catalog, customer, and new-contact counts. The requested
date range can be up to 366 days.

Upload the cafe menu as multipart form data with a PDF field named `menu` to
`POST /api/admin/cafe/menu` to create the initial menu or `PUT
/api/admin/cafe/menu` to replace it. A POST also replaces the menu if one
already exists. The PDF limit is 20 MB. Upload cafe gallery images using
multipart form data with an
image field named `image` to `POST /api/admin/cafe/gallery`. Gallery images are
limited to JPEG, PNG, WebP, or GIF files up to 10 MB.

Create Niyo events with JSON containing `title`, `imageUrl`, and `description`.
Upload the event image first through `POST /api/admin/images`, then use its
Cloudinary `imageUrl` when creating or updating the event. Event images must
use HTTPS.

For artwork, send product details and three image files as multipart form data
directly to `POST /api/admin/products`, using image field names `front`,
`right`, and `left` (one image per field; each can be up to 10 MB). The API
uploads these files to Cloudinary and stores all three URLs on the product.
The `front` URL is used as the main image automatically; do not send an
`imageUrl` field. To replace the views, send the same three files to
`PUT /api/admin/products/:slug`. Clients that already have Cloudinary URLs may
instead send an `images` object in a JSON request.

```json
{
  "slug": "example-artwork",
  "title": "Example Artwork",
  "artistId": "00000000-0000-4000-8000-000000000000",
  "type": "Painting",
  "category": "Art",
  "size": "30 x 40 cm",
  "price": "120",
  "currency": "USD",
  "description": "Artwork description"
}
```

For multipart requests, submit those values as text fields and attach one image
file to each of `front`, `right`, and `left`. Do not send `imageUrl` or an
`images` field when uploading the files directly.

Product `size` is optional and accepts a text value up to 120 characters, such
as `"30 x 40 cm"`. The public product API returns the size and the same
`images` object. Existing products without a size or additional views continue
to return `size: null` and `images: null`.

For Flutterwave, configure `FLW_SECRET_KEY` and a random `FLW_SECRET_HASH` in
the backend environment. Set `API_BASE_URL` to the public API origin that
Flutterwave can reach (HTTPS in production; use a tunnel URL for local
Flutterwave testing). The checkout return is verified by
`/api/payments/flutterwave/callback`. Also set the webhook URL in the
Flutterwave dashboard to
`https://<api-host>/api/payments/flutterwave/webhook` and enable charge
notifications. To ensure the API's per-order payment choice is honored, turn
off **Enable Dashboard Payment Options** in the Flutterwave account settings.
Hosted card checkout uses `card`; hosted mobile-money checkout uses
`mobilemoney` and requires orders to be priced in RWF. The customer selects
the available network on Flutterwave's hosted page.

### Guest checkout and fulfillment

Cart endpoints support both authenticated customers and guests. A cart ID is a
bearer identifier, so keep it private. `POST /api/orders` accepts either a
`cartId` or submitted `items`, plus `customer` contact details when they are
not available on the signed-in account. Physical artwork requires a
`shippingAddress`; digital artwork does not. A submitted-items checkout must
include an `Idempotency-Key` header. Cart checkouts use the cart ID as their
idempotency key unless a header is provided.

Shipping defaults to zero when no rate is configured. To configure rates, set
`SHIPPING_RATES_JSON` to country (or `DEFAULT`) keys with currency amounts,
for example:

```env
SHIPPING_RATES_JSON={"RW":{"RWF":5000},"DEFAULT":{"USD":25,"RWF":10000}}
```

Products default to `kind: "physical"`; administrators can set
`kind: "digital"` when creating or updating artwork. After payment, an
administrator can provide an HTTPS delivery URL through the digital-delivery
endpoint. Physical orders can be advanced with the admin status and DHL
tracking endpoints. Order tracking requires both the order reference and the
customer email; it does not expose a digital delivery URL.

Order confirmation and order-manager email attempts are logged. Configure
`ORDER_NOTIFICATION_EMAILS` as a comma-separated list when notifications
should go to people other than the bootstrap administrator. Optional
`BRAND_LOGO_URL` must be an HTTPS URL.

Customers can track their account orders through the authenticated order
endpoints or use `POST /api/orders/track` with `{ "reference": "...",
"email": "..." }`. Public tracking is rate-limited.

### Admin image uploads

Send a `multipart/form-data` request to `POST /api/admin/images` with the
administrator's access token and a file field named `image`. JPEG, PNG, WebP,
and GIF files up to 10 MB are accepted. The response includes the Cloudinary
URL to pass as `imageUrl` when creating or updating a product, artist, or
collection:

```json
{
  "data": {
    "imageUrl": "https://res.cloudinary.com/your-cloud/image/upload/...",
    "publicId": "niyo-arts/example"
  }
}
```

For artwork, upload three image files as multipart form data to
`POST /api/admin/products/images`, using the field names `front`, `right`, and
`left` (one image per field; each can be up to 10 MB). The response contains an
`images` object with the Cloudinary URLs. Send that object as the product's
`images` value when creating or updating the product. When creating a product
with `images`, its front URL is automatically used as the main `imageUrl`:

```json
{
  "images": {
    "front": "https://res.cloudinary.com/example/image/upload/front.jpg",
    "right": "https://res.cloudinary.com/example/image/upload/right.jpg",
    "left": "https://res.cloudinary.com/example/image/upload/left.jpg"
  }
}
```

The public product API returns the same `images` object. Existing products
without additional views continue to return `images: null`.

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
`http://localhost:3000`) and credentials. Refund processing is not yet exposed
through this API; an order cannot be marked refunded through the admin status
endpoint.

## Notes

- `.env` is ignored by Git. Never commit real secrets.
- Startup uses `sequelize.sync()` to create missing tables, then applies the
  versioned, additive order-fulfillment migration for existing tables. Do not
  use destructive sync options in production. Review and back up the production
  database before deploying schema changes.
- The built-in rate limiter uses in-memory state. It is suitable for a
  single API instance; use a shared rate-limit store before running multiple
  instances so limits are consistent across them.
- Admin bootstrap credentials, JWT secrets, SMTP credentials, and Flutterwave
  secrets must be private, unique, and configured in the deployment
  environment, never committed to source control.
