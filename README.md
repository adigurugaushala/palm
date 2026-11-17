# Guruji Palmistry — full-stack web app

Customer booking, Guruji review and admin management for palmistry consultations, with PayU hosted checkout, MongoDB and Jitsi Meet calls. A Next.js front-end in a premium Indian heritage visual identity (burgundy, maroon, antique gold and ivory; Cormorant Garamond, Playfair Display, DM Sans, Noto Sans Telugu and Devanagari), served by the same Express process that owns the API.

Three portals in one app:

- **Customer** — register with email + password (or Google), book a slot, pay through PayU, fill in details, upload palm photos, chat with their Guruji, join a Jitsi Meet call, download the PDF report.
- **Guruji / reviewer** — see assigned and unassigned cases, claim one, fill the observation checklist, write and publish the report, return or reject cases.
- **Admin** — KPIs and 30-day revenue chart, bookings by stage, team workload, bookings with search, stage/date filters and Guruji assignment, customers, PayU payments with transaction details and refunds, Guruji team, review moderation, price and slot settings, audit log.

## Stack

- **Node.js 20+** · **Express 5** · **helmet** (secure headers) · **cookie-parser**
- **MongoDB** via **Mongoose** 9 (TTL-indexed sessions, atomic slot reservation)
  — `mongodb-memory-server` for local dev when `MONGODB_URI` is empty
- **PayU India Hosted Checkout** (SHA-512 signed request, verified response & webhook)
- **Google Sign-In** (via `google-auth-library`; ID token verified server-side)
- **Jitsi Meet** (public instance by default; swap for self-hosted or JaaS in production)
- **PDFKit** for the consultation report, with Noto Sans Latin / Telugu / Devanagari fonts bundled
- **Next.js 16 (App Router) + React 19** front-end, mounted inside the Express server on one port so cookies and PayU callbacks work unchanged
- **GSAP + ScrollTrigger** for reveals and the intro, **Lenis** for smooth native scrolling (both MIT/standard licences, loaded only on the landing page); no Lottie or Anime.js — the hand-drawn SVG work did not need them
- **bcryptjs** for password hashing, **multer** + **image-size** for uploads

**No SMS or OTP dependency.** No Twilio, Fast2SMS, Razorpay, Firebase Auth, or SQLite in the runtime.

## Run locally

```bash
unzip guruji-fullstack-v2.zip && cd guruji
cp .env.example .env     # fill in SESSION_SECRET and (for real payments) PAYU_MERCHANT_KEY / PAYU_MERCHANT_SALT
npm install
npm run build    # builds the Next.js front-end (needed before npm start in production)
npm start        # or `npm run dev` for hot reload
# → http://localhost:3000
```

Without `MONGODB_URI`, a local in-memory MongoDB is started automatically (downloads a Mongo binary on first run — needs outbound internet). Point `MONGODB_URI` at your Atlas cluster or a local `mongod` for persistent storage.

First launch seeds two staff accounts (shown on the console). The seeded defaults are `admin@guruji.local / changeme123` and `guruji@guruji.local / guruji123` — override with `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `GURUJI_EMAIL`, `GURUJI_PASSWORD` before you start, or change them from **Admin portal → Guruji team → Password**.

## Environment variables

All documented in `.env.example`.

| Variable | Purpose |
|---|---|
| `NODE_ENV` | `development` or `production`. Production disables demo payments and the dev login button, and switches cookies to `Secure`. |
| `PORT`, `APP_BASE_URL` | Server port and the public base URL used in PayU callback URLs. |
| `SESSION_SECRET` | 32+ byte random string — generate a fresh one per environment. |
| `MONGODB_URI`, `MONGODB_DB_NAME` | Leave URI blank in dev to use in-memory Mongo. |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `GURUJI_EMAIL` / `GURUJI_PASSWORD` / `OWNER_EMAILS` | First-run staff seed only. |
| `PAYU_MERCHANT_KEY` / `PAYU_MERCHANT_SALT` / `PAYU_MODE` | PayU credentials. `PAYU_MODE=test` points at `https://test.payu.in`; `live` at `https://secure.payu.in`. |
| `GOOGLE_CLIENT_ID` | Enable Google Sign-In button on the login screen. |
| `MEET_PROVIDER` / `MEET_BASE_URL` | `public` + `https://meet.jit.si` out of the box; change to your own Jitsi deployment for production. |
| `UPLOAD_DIR` / `UPLOAD_MAX_BYTES` | Local upload path (under `DATA_DIR`, default `./data`) and the max upload size. |
| `CORS_ORIGINS` / `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX` | Optional overrides. |

The `PAYU_MERCHANT_SALT` must never reach the browser — keep it server-side only and never commit `.env`.

## PayU integration

Hosted Checkout, following the official PayU spec ([docs.payu.in](https://docs.payu.in/docs/prebuilt-checkout-page-integration)):

1. Customer picks a slot and the server creates the booking + a `Payment` with a `txnid`.
2. `/api/bookings` returns the signed form fields; the SPA builds a hidden form and submits it to `${PAYU_BASE_URL}/_payment`.
3. Request hash: `sha512(key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||SALT)`.
4. PayU redirects back to `/api/payu/success` or `/api/payu/failure` (both urlencoded form POSTs).
5. The server verifies the reverse hash: `sha512(SALT|status||||||udf5|…|txnid|key)`, matches `txnid` and `amount`, and only then marks the payment paid.
6. `/api/payu/webhook` is a server-to-server backstop in case the browser never came back — idempotent, same hash verification.
7. `/api/payu/verify/:bookingId` is polled by the SPA after the redirect for a server-confirmed state.

A `PAYMENT_MODE=demo` fallback (no money moves) runs when PayU keys are blank and `NODE_ENV=development` — the production build refuses bookings instead.

### Refunds

Admin → **Payments → Refund** records the refund request and cancels the booking. Calling PayU's refund Webservice API (`cancel_refund_transaction`) requires the live Merchant Salt and the payment's `mihpayid`; the hook and audit trail are in place, swap in the live call in `server/routes/staff.js` once refunds are enabled on your merchant account.

### Testing PayU locally

Use the PayU test merchant key (`PAYU_MODE=test`) and the published test card numbers from the PayU docs. The hash formulas are covered by unit tests — `npm test`.

## MongoDB

Collections (see `server/db.js`):

- **users** — `role`, `email`, `mobile`, `googleSub`, `passwordHash`, `active`
- **bookings** — `bookingId` (public, unique), `userId`, `appointmentDate/Slot`, `status`, `assignedGurujiId`, `form`, `questions`, `hand`, `checklist`, `reportNotes`, `meetRoom`
- **payments** — `paymentId`, `bookingId`, `txnid`, `mihpayid`, `amount`, `status`, `provider`
- **photos** — one doc per uploaded palm image (binary stored on disk under `DATA_DIR/uploads/`)
- **messages** — chat between customer and Guruji
- **sessions** — hashed tokens with a TTL index (auto-expire)
- **settings** — single `global` doc with price, GST%, slots, hold time
- **audits** — staff and payment actions

Atomic slot reservation is done inside `/api/bookings`: the customer's existing unpaid hold is cancelled, availability is re-checked, and the new booking is written in the same request. The `bookings_slot` compound index keeps the availability query fast.

## Jitsi Meet

Default `MEET_PROVIDER=public` uses the free `https://meet.jit.si`. Room IDs are long random strings and are only exposed to the authenticated customer and the assigned Guruji. The server-stored `meetRoom` never includes any PII.

**For production** switch to:

- **Self-hosted Jitsi** — set `MEET_BASE_URL` to your own `https://meet.yourdomain.com`.
- **Jitsi as a Service (JaaS)** — swap `MEET_PROVIDER` and sign the JWT server-side (`POST /api/bookings/:id/meet-token` is the place to add this).

The current public integration is fine for development and small traffic but has no application-side access control.

## Security

- Passwords: bcryptjs, cost 11.
- Sessions: HttpOnly, `SameSite=lax`, `Secure` in production, 30-day expiry, hashed server-side.
- **CSRF** defence: every state-changing API call requires a custom `x-guruji: 1` header.
- Rate limits on sign-in, OTP (none — removed), and messages.
- Photos: content-sniffed server-side, served only to the case's participants (customer, assigned Guruji, admin).
- PayU hash verification on both the browser-return callback and the webhook, with amount-match check.
- `helmet` adds standard security headers; `X-Frame-Options: SAMEORIGIN`, strict referrer, locked-down `Permissions-Policy`.

## API

All endpoints live under `/api`. Non-GET requests need the `x-guruji: 1` header. See `server/routes/` for the full source.

| Method | Path | Notes |
|---|---|---|
| GET | `/auth/me` | current user or `null` |
| POST | `/auth/register` | email + password |
| POST | `/auth/login` | customer email + password |
| POST | `/auth/google` | ID token verification |
| POST | `/auth/staff` | staff email + password |
| POST | `/auth/logout` | destroys the session |
| PUT | `/auth/profile` | name, mobile |
| POST | `/auth/password/change` | current + next |
| GET | `/config`, `/slots` | public config and slot availability |
| POST | `/bookings` | reserve and get PayU form fields |
| GET | `/bookings`, `/bookings/:id` | customer's bookings |
| PUT | `/bookings/:id/details` | step-by-step intake form |
| POST | `/bookings/:id/submit` | submit for review |
| POST / DELETE | `/bookings/:id/photos/:idx` | palm photo upload / delete |
| GET | `/photos/:pid` | private file serve |
| GET / POST | `/bookings/:id/messages` | chat |
| GET | `/bookings/:id/report` / `report.pdf` | published report |
| POST | `/payu/success`, `/payu/failure` | PayU browser callbacks |
| POST | `/payu/webhook` | server-to-server backstop |
| GET | `/payu/verify/:id` | SPA status poll |
| GET | `/staff/cases`, `/staff/cases/:id` | reviewer case list and detail |
| POST | `/staff/cases/:id/claim`, `/action` | claim and transition |
| PUT | `/staff/cases/:id` | checklist + notes (autosaved) |
| GET | `/admin/overview`, `/orders`, `/payments`, `/staff`, `/settings`, `/audit` | admin reads |
| PUT | `/admin/orders/:id/assign`, `/admin/settings`, `/admin/staff/:id` | admin writes |
| POST | `/admin/payments/:id/refund`, `/admin/staff` | refunds, staff creation |

## Testing

- `npm test` runs the unit tests (`node --test`) for the PayU hash formulas, bcrypt round-trip, and IST slot parsing.
- Visual QA without a database: `npm run build`, then `node tests/visual/fixture-server.js 3200` (the real front-end against sample data; switch role with the `mock_role` cookie) and `npm run test:visual` — screenshots every screen at 1440, 820 and 390 px into `/tmp/shots` and reports console errors, failed requests and horizontal overflow. `npm run test:motion` scrolls the animated landing page and checks every section finishes visible.
- Playwright scaffolding is included for browser tests; install it with `npm run test:e2e:install`, then `npm run test:e2e`.

A `.github/workflows/ci.yml` runs the unit tests and the Next.js build on push. Add the Playwright e2e matrix once the staging URL is set up.

## Backups

Mongo stores everything except uploaded palm photos. `mongodump --uri "$MONGODB_URI"` gives a complete logical backup; rsync `data/uploads/` for the images. Hot backups work because Mongo supports concurrent `mongodump`.

## Production checklist

- [ ] Rotate all secrets in `.env` — especially `SESSION_SECRET` and `PAYU_MERCHANT_SALT`.
- [ ] Set `NODE_ENV=production`, `APP_BASE_URL=https://yourdomain.com`.
- [ ] Run `npm ci && npm run build` on the server (or in your deploy step) before `npm start`.
- [ ] Point `MONGODB_URI` at your Atlas cluster or a managed Mongo.
- [ ] Set `PAYU_MODE=live` only after a full test-mode run.
- [ ] Register the PayU success / failure URLs on the merchant dashboard — they are `${APP_BASE_URL}/api/payu/success` and `/api/payu/failure`; webhook is `/api/payu/webhook`.
- [ ] Set `GOOGLE_CLIENT_ID` and add your origin to the OAuth client.
- [ ] Swap Jitsi for a self-hosted or JaaS deployment.
- [ ] Put the app behind HTTPS (cookies go `Secure` when `NODE_ENV=production`).
- [ ] Back up `data/uploads/` and `mongodump` on a schedule.

## What was removed from the earlier prototype

- SQLite (`better-sqlite3`) → MongoDB (`mongoose`)
- Razorpay → PayU
- Twilio / SMS OTP → email + password + Google Sign-In
- Firebase Auth / Admin SDK — not used; Google Sign-In verifies ID tokens directly via `google-auth-library`
- Cloudinary — uploads stay on disk (plug in GridFS or S3 later from a single adapter function in `routes/bookings.js`)
