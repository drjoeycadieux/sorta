# Route & Ride

A React and Express taxi reservation dashboard backed by MySQL. Reservations can be added, edited, cancelled, and permanently deleted. The list also supports search and status filtering.

## Run locally

Requirements: Node.js 18+ and MySQL 8+.

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create the database and table:

   ```bash
   mysql -u root -p < db/schema.sql
   ```

3. Copy `.env.example` to `.env` and set the MySQL connection values. The API loads this file automatically. It also accepts these values directly as environment variables.

4. Start the client and API together:

   ```bash
   npm run dev
   ```

Open `http://localhost:5173` for the dashboard. Opening `http://localhost:3001` redirects there as well; port 3001 is the Express API.

Check the local database connection at `http://localhost:3001/api/health`. A connected setup returns `"database": "mysql"`. If it returns `"memory-fallback"`, reservations are temporary and are not being written to MySQL.

## Netlify deployment

Netlify uses `netlify/functions/api.js` for the production API. Add `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME` under Netlify site environment variables, then redeploy. The MySQL server must be externally reachable by Netlify; a local MySQL server is not accessible from a deployed function.

The Vite development server proxies `/api` requests to the same origin in development only when the API is available at port `3001`; the frontend currently uses relative API paths, so run both processes with `npm run dev`.

## API routes

- `GET /api/reservations` - list reservations
- `POST /api/reservations` - create a reservation
- `PUT /api/reservations/:id` - update a reservation
- `PATCH /api/reservations/:id/cancel` - mark a reservation cancelled
- `DELETE /api/reservations/:id` - permanently delete a reservation