import type { Clock } from "@/core/ports/clock";

/** Real-time adapter for the Clock port. */
export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}
