import { z } from 'zod';

/** The three urgent-care areas. Patients pick a *situation*; this is what it maps to. */
export const SPECIALTIES = ['trauma', 'pediatrics', 'gp'] as const;
export const specialtySchema = z.enum(SPECIALTIES);
export type Specialty = z.infer<typeof specialtySchema>;

/** Clinic-local calendar date, YYYY-MM-DD. */
export const clinicDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/**
 * Payload of the `availability` NOTIFY channel and SSE stream.
 * Invariant: never carries personal data — clients refetch details.
 */
export const availabilityChangedSchema = z.object({
  specialty: specialtySchema,
  date: clinicDateSchema,
});
export type AvailabilityChanged = z.infer<typeof availabilityChangedSchema>;

/**
 * What subscribers receive. `resync` is emitted after the server's LISTEN
 * connection reconnects (notifications may have been missed), telling every
 * client to refetch.
 */
export type AvailabilityEvent = ({ type: 'changed' } & AvailabilityChanged) | { type: 'resync' };
