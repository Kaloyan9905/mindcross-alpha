/**
 * booking — public API.
 *
 * Booking lifecycle: create / cancel / list. All cross-module consumers must
 * import from here, never from `./actions/*` or `./queries/*` directly.
 */

// Server actions (session-bound — identity resolved from the session).
export { createBookingAction } from "./actions/create-booking";
export type {
  CreateBookingInput,
  CreateBookingResult,
} from "./actions/create-booking";

export { cancelBookingAction } from "./actions/cancel-booking";
export type {
  CancelBookingInput,
  CancelBookingResult,
} from "./actions/cancel-booking";

export { rescheduleBookingAction } from "./actions/reschedule-booking";
export type {
  RescheduleBookingInput,
  RescheduleBookingResult,
} from "./actions/reschedule-booking";

export { setBookingOutcomeAction } from "./actions/set-booking-outcome";
export type {
  SetBookingOutcomeInput,
  SetBookingOutcomeResult,
} from "./actions/set-booking-outcome";

// Group-session actions (host invites friends to co-join a booking).
export {
  setGroupCapacityAction,
  inviteToBookingAction,
  respondToBookingInviteAction,
  leaveBookingAction,
  listGuestsForHostAction,
} from "./actions/group";

// Trusted, server-only cores (callers must supply an already-authenticated
// id). The actions above are the public entry points; these are for internal
// server use and integration tests.
export { createBooking } from "./lib/create-booking";
export { cancelBooking } from "./lib/cancel-booking";
export { rescheduleBooking } from "./lib/reschedule-booking";
export { setBookingOutcome } from "./lib/set-booking-outcome";
export { setGroupCapacity } from "./lib/set-group-capacity";
export { inviteToBooking } from "./lib/invite-to-booking";
export { respondToBookingInvite } from "./lib/respond-to-booking-invite";
export { leaveBooking } from "./lib/leave-booking";
export { MAX_GROUP_CAPACITY, type GroupResult } from "./lib/group-result";

// Background job: idempotent 24h-reminder scan (driven by a cron trigger).
export { sendDueReminders } from "./lib/send-due-reminders";
export type {
  SendDueRemindersOptions,
  SendDueRemindersResult,
} from "./lib/send-due-reminders";

// Queries.
export { listBookingsForClient } from "./queries/list-bookings-for-client";
export type { ClientBookingRow } from "./queries/list-bookings-for-client";

export { listBookingsAdmin } from "./queries/list-bookings-admin";
export type { AdminBookingRow } from "./queries/list-bookings-admin";

export { listBookingsForTherapist } from "./queries/list-bookings-for-therapist";
export type { TherapistBookingRow } from "./queries/list-bookings-for-therapist";

export { listBookingInvites } from "./queries/list-booking-invites";
export type { BookingInviteRow } from "./queries/list-booking-invites";

export {
  listParticipantsForTherapist,
  listGuestsForHost,
} from "./queries/list-booking-participants";
export type { ParticipantRow } from "./queries/list-booking-participants";

// Schema / table ref + types.
export { bookings, bookingParticipants, BOOKING_STATUS } from "./db/schema";
export type {
  Booking,
  NewBooking,
  BookingStatus,
  BookingParticipant,
  NewBookingParticipant,
  ParticipantRole,
  ParticipantStatus,
} from "./db/schema";
