/**
 * Driven port: a source of "now". Injecting time keeps use cases deterministic
 * and testable; the real adapter is the system clock.
 */
export interface Clock {
  now(): Date;
}
