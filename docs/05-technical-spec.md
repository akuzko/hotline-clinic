# Hotline Clinic: Technical Spec

> Lesson 02 (Description), Step 2. Written in augmentation mode: AI proposed it, the builder pushed back and decided.

## Pieces

- **`apps/web`:** React + Vite single-page app with mobile-first routes: `/` (situation chooser), `/book/:specialty`, `/booking/:code` (view or cancel), `/account`, `/admin/*`. Uses TanStack Query through the tRPC client. JavaScript on the patient route stays under 150 KB gzipped.
- **`apps/api`:** Fastify + tRPC v11. Main procedures:
  - `availability.list({specialty})`
  - `availability.onChange({specialty})`: an **SSE subscription**
  - `booking.hold`, `booking.confirm(otp)`, `booking.cancel(code, phone)`
  - `auth.requestOtp`, `auth.verifyOtp`, `account.signUp`, `account.bookings`, `account.setEmail`, `account.resendEmailConfirmation`, `account.confirmEmail(token)`
  - `admin.*` (doctors, settings) and `reception.checkIn(code)`, behind HTTP Basic auth
- **Postgres:** the only stateful service. It serves as the database, the pub/sub channel, and the source of truth for every rule above.
- **SMS:** a `SmsSender` interface. In development it writes to the console and to a `/dev/sms` inbox page. In production it uses a real provider (to be decided; Twilio is the default candidate). Email uses the same pattern: a `Mailer` interface, with `/dev/mail` in development.

Monorepo with pnpm workspaces. Zod is shared between client and server for input validation.

## Data model (Drizzle ORM, SQL migrations)

- **`doctors`:** `id, name, specialty (trauma|pediatrics|gp), experience_years, work_start, work_end, active`
- **`settings`:** a single row with appointment minutes, break minutes, hold minutes, no-show minutes, late-booking minutes, clinic open/close, time zone, and horizon days.
- **`bookings`:** `id, doctor_id, specialty, starts_at, ends_at, status (held|confirmed|checked_in|cancelled|expired|no_show), hold_expires_at, patient_name, phone (E.164), user_id NULL, code, created_at`
  - **Partial unique index** on `(doctor_id, starts_at) WHERE status IN ('held','confirmed','checked_in')`. This is what makes double booking impossible, whatever the application code does.
  - Partial unique index on `(code, (starts_at AT TIME ZONE tz)::date)` for active bookings.
  - Partial unique index on `(phone, specialty)` for active bookings that haven't ended yet.
- **`users`:** `id, name, phone (unique), phone_verified_at, email NULL, email_verified_at NULL`
- **`email_confirmations`:** hashed one-time token, user_id, expires after 24 h, single use.
- **`otp_challenges`:** hashed 6-digit code, purpose, attempts (at most 3), expires after 5 minutes.

**Slots are not stored.** They are calculated from each doctor's working hours and the settings. Availability is all calculated slots, minus active bookings, limited to the horizon and the late-booking window.

## How realtime works

1. Every booking status change runs in a transaction that ends with `pg_notify('availability', '{"specialty":"gp","date":"2026-11-23"}')`. The payload is tiny and contains no personal data.
2. Each API instance keeps **one dedicated `LISTEN` connection** (a direct connection, not a pooled one) and passes events to its SSE subscribers through an in-memory event emitter.
3. On each event, the client marks its `availability.list` query as out of date and fetches it again. When the SSE connection reconnects, it fetches again too. SSE sends a ping every 15 seconds. No polling at any point.

## Timers

A **sweeper** runs every 5 seconds behind `pg_try_advisory_lock`, so only one runs even with several instances. It moves expired holds to `expired` and late unchecked bookings to `no_show`, and sends a NOTIFY for each. To avoid depending on the sweeper's timing, `booking.hold` also expires any out-of-date hold on its target slot inside the same transaction before inserting.

## Security and abuse

- `@fastify/rate-limit` per IP and per phone number, using the limits in the acceptance tests.
- OTPs are hashed; confirmation codes come from a cryptographically secure random generator.
- Cancelling requires both the code and the phone number.
- Account sessions use a signed, httpOnly cookie.
- Admin credentials come from environment variables.
- No symptom or medical fields exist anywhere in the schema.

## Testing and delivery

- **Vitest:** unit tests and integration tests against real Postgres in Docker, including the 50-request concurrency test.
- **Playwright:** multiple browser contexts for the realtime tests, mobile viewport with throttling.
- **GitHub Actions** runs CI.
- **Docker** image deployed to a **Render** web service with **Render Postgres** (direct connection for `LISTEN`).
