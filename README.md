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
5. Start the development server:

   ```bash
   npm run dev
   ```

6. Start the API with `npm run dev`. On startup it creates any missing tables
   and inserts the frontend's initial artists, artworks, and collections
   without overwriting existing catalog records.

## API

All responses are JSON. Catalog endpoints return a `data` property.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Health status |
| GET | `/api/products?q=&category=&sort=&page=&limit=` | Search/filter artwork; `sort` is `featured`, `price_asc`, or `price_desc` |
| GET | `/api/products/:slug` | Artwork details |
| GET | `/api/artists` | Artists and their active artwork |
| GET | `/api/artists/:slug` | Artist profile and artwork |
| GET | `/api/collections` | Curated collections and their active artwork |
| GET | `/api/collections/:slug` | Collection details |
| POST | `/api/orders` | Create an order from product slugs and quantities |
| POST | `/api/contact` | Submit a contact message |

Example order body:

```json
{
  "customer": {
    "name": "Alex Collector",
    "email": "alex@example.com",
    "phone": "+250780000000"
  },
  "shippingAddress": {
    "address": "12 Gallery Lane",
    "city": "Kigali",
    "country": "Rwanda"
  },
  "items": [{ "productSlug": "after-the-rain", "quantity": 1 }],
  "payment": {
    "method": "mobile_money",
    "provider": "MTN Mobile Money",
    "phone": "+250780000000"
  }
}
```

Order amounts are looked up and calculated from catalog prices by the API; the
client must not submit a price or total. New orders have `pending_payment` and
`pending` statuses. A payment gateway integration must confirm payment before
the order is marked paid or fulfilled. Card checkout should use a payment
provider's hosted/tokenized flow; this API does not accept or store card numbers,
expiry dates, or security codes.

## Notes

- `.env` is ignored by Git. Never commit real secrets.
- Startup uses non-destructive `sequelize.sync()` to create missing tables. Use
  versioned migrations for future production schema changes; do not use
  destructive sync options in production.
- Authentication, admin catalog management, payment gateway processing,
  shipping calculation, and order status/tracking endpoints still need to be
  integrated before production use.
