# Hotline Clinic

Urgent same-day clinic booking with live availability. This is a course project for *AI Fluency for Builders*.

## Source of truth

- `docs/05-technical-spec.md`: the stack, data model, how realtime works, timers.
- `docs/03-acceptance-tests.md`: the definition of done. Every acceptance test becomes an automated test (Vitest or Playwright), **written before the code it covers**.
- `docs/README.md`: confirmed decisions and what's out of scope. Out-of-scope items don't get built without asking.
- `docs/01`, `docs/02`, `docs/04`: the problem brief, delegation plan and product requirement. Use them for *why* something is the way it is.

If the code and the docs disagree, stop and ask. Don't quietly change either one.

## Working agreement

- Plan → approve → build → review. Don't start implementing until the plan is approved.
- Use only the stack in the technical spec. **No new dependencies without approval.**
- **No schema change or migration without approval.** The user reviews every migration.
- Commit or push only when asked. Never commit `.local/`: it holds saved course pages with personal data and auth tokens.

## Rules that must always hold

Never "simplify" these away. If a task seems to need one of them broken, stop and ask.

1. **Double booking is prevented by Postgres**, through the partial unique index on `bookings(doctor_id, starts_at)` for active statuses. Application checks are only for nicer error messages, never the guarantee.
2. **No symptom, diagnosis or other medical fields** anywhere: not in the schema, logs, analytics or free-text inputs.
3. **Every submission that involves a phone number requires an SMS code:** anonymous booking, sign-up, sign-in, changing the phone, and linking history to an account.
4. **NOTIFY and SSE payloads never contain personal data.** They carry only `{specialty, date}`, and clients fetch the details again.
5. **No polling.** Live updates arrive over the tRPC SSE subscription. Refetching on reconnect is fine. Refetching on a timer is not.
6. **The emergency notice** stays visible without scrolling on the patient home screen.
7. **All dates and times are in the clinic's time zone** (from `settings`). Never use the server's or the device's local time.
8. **Secrets come only from environment variables.** Seed data is obviously fake (for example, `+1 555 01xx` numbers).

## Commands

To be filled in once the project is scaffolded.
