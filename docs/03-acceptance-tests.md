# Hotline Clinic: Acceptance Tests

> Lesson 01 Deliverable 3, tightened according to lesson 02 Step 3: every statement is something code can pass or fail.
> Default settings used below: 45-minute appointment + 15-minute break, 3-minute hold, 15-minute no-show threshold, booking horizon of today and tomorrow, clinic hours 08:00–20:00 in the clinic's time zone.
> "Phone" means a Playwright mobile context (360×640) with network throttled to *Slow 3G*.

## Core (definition of done)

1. **Emergency first.** On the home screen at 360×640, an emergency notice with a tappable emergency phone number is visible without scrolling, above the three situation buttons.
2. **Nearest slot in two taps.** A visitor with no account who opens the home page and taps *Injury*, *Sick child* or *Feeling unwell* sees the earliest bookable time for the matching specialty, across all doctors of that specialty. The time is shown as a clock time plus a relative time ("14:00 today, in 35 min"). On a phone it appears no later than 5 seconds after the tap.
3. **Anonymous booking end to end.** A visitor with no account enters a name and phone number and submits.
   - The slot is **held** immediately and an SMS code is sent.
   - After the correct code is entered, the booking is **confirmed**.
   - A 6-character confirmation code is shown on screen and sent by SMS. Its alphabet excludes `0 O 1 I L`.
   - A first-time tester completes this in under 90 seconds without help.
4. **Live availability, no polling.** Two browsers are viewing the same specialty. When browser A places a hold, browser B stops showing that slot within 2 seconds, without a reload. The network log of browser B shows **one** long-lived SSE stream and no repeated availability requests.
5. **No double booking.** 50 simultaneous booking requests for the same doctor and slot result in exactly **one** hold. The other 49 get a "just taken" response that offers the next available slot.
6. **Unconfirmed holds and no-shows free the slot.**
   - A hold that isn't confirmed within 3 minutes is released.
   - A confirmed booking that isn't checked in by 15 minutes after its start is marked *no-show* and released.
   - In both cases, other viewers see the slot become available again within 5 seconds of the deadline, if the slot is still within the late-booking window.
7. **Cancel with the code.**
   - A patient who enters their confirmation code and phone number can cancel. The slot becomes available to other viewers within 2 seconds.
   - The code is then rejected at reception check-in.

## Edge cases

- **Clinic closed** (before 08:00 or after 20:00): the screen says *"Closed now, opens 08:00"* and still offers the earliest slot (tomorrow 08:00, or today 08:00 if it's early morning). It never shows an empty list or an endless spinner.
- **No slots left** for a specialty today and tomorrow: the screen says so plainly and shows the clinic's phone number and the emergency notice. It does not show a "booked out" state that looks like an error.
- **Zero wait:** a slot already in progress is free and still inside the late-booking window. It is shown as *"Available now, come in"* and can be booked.
- **Slot lost while filling in the form:** submitting returns "just taken" with a one-tap option to hold the next slot. Nothing the patient typed is lost.
- **Connection lost** (airplane mode for 30 seconds): a "Reconnecting…" indicator appears and availability is marked as possibly out of date. When the connection comes back, availability reloads and the indicator disappears. Booking is always checked on the server, so out-of-date data can't create a booking.
- **Wrong SMS code three times:** the hold is released immediately and the patient can start over.
- **Duplicate booking:** a phone number that already has an active booking in a specialty can't hold a second slot in that same specialty. The response shows the existing booking's time.
- **Rate limits:**
  - at most 3 SMS per phone number per 15 minutes
  - at most 10 hold attempts per IP per 10 minutes

  Going over the limit returns a clear, translated message, not a bare 429 page.
- **Day boundary:** at 23:59 and 00:01 clinic time, "today" and "tomorrow" follow the clinic's time zone, not the device's.

## Accounts

- **Sign-up:** sign-up asks for name and phone (required) and email (optional), and verifies the phone with an SMS code. The account can't be used until the phone is verified. After that, the account's history shows any earlier anonymous bookings made with that phone number. Bookings are linked **only after** the phone is verified.
- **Email:** an email added at sign-up or later in settings shows as *Not confirmed* until its link is opened. Opening it switches the status to *Confirmed*. A "Resend confirmation" action sends a new link and invalidates the old one. An expired or reused link shows a clear message. Changing the email resets the status to *Not confirmed*.
- **Phone changes:** changing the account's phone number requires an SMS code sent to the new number.
- **One-tap booking:** a signed-in patient books the nearest slot with one tap plus a confirm. No SMS code and no hold timer.

## Staff (admin panel)

- **Access:** every `/admin` route requires HTTP Basic auth. Wrong credentials get a 401.
- **Adding a doctor:** the admin adds a doctor with name, specialty, years of experience and working hours. The doctor's slots appear to patients viewing that specialty within 2 seconds.
- **Removing a doctor:** a doctor with future active bookings can't be deactivated until those bookings are cancelled or moved. The panel lists them.
- **Settings:** the admin can change appointment length, break, hold timeout, no-show threshold, late-booking window and clinic hours. Changes apply only to slots that aren't booked yet.
- **Reception:** entering a valid confirmation code for today checks the patient in. A cancelled, expired or wrong-day code is rejected with the reason.

## Seed data

- 2 doctors per specialty: one works 08:00–16:00, the other 12:00–20:00, every day.
- That gives 8 one-hour slots per doctor per day, 48 slots per day across the clinic.
