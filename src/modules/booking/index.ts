/**
 * booking — public API.
 *
 * Booking lifecycle: create / cancel / list. All cross-module consumers must
 * import from here, never from `./actions/*` or `./queries/*` directly.
 */

// Server actions.
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

// Queries.
export { listBookingsForClient } from "./queries/list-bookings-for-client";
export type { ClientBookingRow } from "./queries/list-bookings-for-client";

export { listBookingsAdmin } from "./queries/list-bookings-admin";
export type { AdminBookingRow } from "./queries/list-bookings-admin";

export { getBookingById } from "./queries/get-booking";
export type { BookingDetail } from "./queries/get-booking";

// Schema / table ref + types.
export { bookings, BOOKING_STATUS } from "./db/schema";
export type { Booking, NewBooking, BookingStatus } from "./db/schema";
