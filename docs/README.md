# Hotline Clinic: docs

**Hotline** = *HOTfix* + *onLINE*. This is the course project for Anthropic's *AI Fluency for Builders* (the Clinic Wait Time Project), reframed as **urgent same-day booking**.

> The exercise prompts these docs answer come from *AI Fluency for Builders*, © 2026 Anthropic, developed with CodePath and based on the AI Fluency Framework by Prof. Rick Dakan and Prof. Joseph Feller. The course is licensed [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/). Course materials themselves are not included in this repo.

| # | Doc | Lesson |
|---|---|---|
| 01 | [Problem Brief](01-problem-brief.md) | 01 Delegation: Deliverable 1 |
| 02 | [Delegation Plan](02-delegation-plan.md) | 01 Delegation: Deliverable 2 |
| 03 | [Acceptance Tests](03-acceptance-tests.md) | 01 Deliverable 3, tightened in 02 Step 3 |
| 04 | [Product Requirement](04-product-requirement.md) | 02 Description: Step 1 |
| 05 | [Technical Spec](05-technical-spec.md) | 02 Description: Step 2 |

## Decisions confirmed (2026-11-23)

- **Late-booking window: 20 min** after a slot's start. That's longer than the 15-minute no-show threshold, so a slot freed by a no-show can still be booked for the remaining ~25 minutes.
- **Registration and sign-in** use phone + SMS code only. **Email is optional.** It can be added at registration or later in account settings, and has its own `email_verified_at` flag. The UI shows whether it's verified and offers "resend confirmation email".
- **Every submission that involves a phone number requires SMS code verification**: anonymous booking, registration, sign-in, changing the phone number, and linking history.
- **Signed-in one-tap booking** goes straight to *confirmed*, with no hold and no SMS.
- **One active booking per phone number per specialty.** A parent can still book a pediatrician for a child and a GP for themselves.
- **Overlapping situations:** an injured child goes to *Sick child* (the pediatrician decides on referral). The button text says so.
- **Doctors work every day.** Per-weekday schedules are out of scope for the MVP.
- **No-show / check-in:** reception marks arrival with the code. Without a check-in, the sweeper marks the booking as a no-show automatically.

## Out of scope (for now)

- "Doctor running late" broadcasts
- a doctor-facing UI
- multiple clinics
- payments
- reminders
- localisation beyond English
