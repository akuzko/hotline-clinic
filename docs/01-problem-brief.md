# Hotline Clinic: Problem Brief

> Lesson 01 (Delegation), Deliverable 1. One page max.

## Reframe

The client asked for a way for patients to _check wait times_. Put yourself in the patient's place, though: the only time you care about a clinic's wait time is when you have an **urgent** problem. For anything else you just book a normal appointment on another day. A wait-time number is only a means. What the patient actually wants is a **guaranteed place in front of the right doctor, as soon as possible, before leaving the house**.

So Hotline Clinic shows the **nearest bookable time** in three urgent-care areas and lets the patient take it on the spot.

## Who are the users?

- **Patients with an urgent problem that is not an emergency.** That means one of three:
  - an injury (sprain, cut, suspected fracture), which needs a _traumatologist_
  - a sick child, which needs a _pediatrician_
  - feeling unwell and needing a first diagnosis and next steps, which needs a _general practitioner (GP)_

  They are stressed, often on a phone, maybe in a car or holding a child. Most are first-time visitors without an account. A few come back often (parents especially) and would value an account.

- **Caregivers** booking for someone else, such as a parent for a child or an adult child for an elderly parent.
- **Reception staff**, who check arrivals in by confirmation code and keep the day's flow moving.
- **The clinic administrator**, who manages doctors, working hours and booking rules.
- **Doctors**, indirectly. They need their slots filled and no-shows released, not a waiting room full of people with no plan.
- **Not users:** people with life-threatening emergencies. The product must send them to the emergency number, never to a booking form.

## What do they actually need?

- **Patient:** "Tell me how soon I can be seen for _my_ kind of problem. Let me lock that time in now, and give me something to show when I arrive."
- **Clinic:** predictable arrivals, fewer people crowding the waiting room, and no slot wasted when someone cancels or doesn't show up.

## What does a great solution feel like?

I open a link and tap the button that matches my situation: **Injury**, **Sick child** or **Feeling unwell**. I see right away: _"Next available: 14:00 today (in 35 min)"_. If someone else takes that time while I'm looking, the screen updates by itself before I tap. I enter my name and phone number, type the SMS code, and get a short confirmation code that I can show or read out at reception. All of this takes about a minute, one-handed. If my plans change, I cancel with the same code and the time goes back to someone who needs it.

## Real constraints

- **Devices:** basic Android phones on unreliable mobile data. Must work in the browser with no app install and no account.
- **Safety:** must never delay emergency care. An emergency notice is always visible, and long waits are shown honestly.
- **Privacy:** collect the minimum, which is name and phone number. **No symptoms or medical details are stored.** Phone numbers are personal data, so they get a defined retention period.
- **Clinic skills:** low technical skill. Administration is plain forms behind a password.
- **Budget:** one small server plus managed Postgres. SMS costs money per message and is sent only for anonymous bookings and logins.
- **Scope:** one clinic, one time zone, three specialties, six doctors to start. Booking for **today and tomorrow** only, because this is urgent care, not general scheduling.
