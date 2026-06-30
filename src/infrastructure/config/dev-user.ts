// Dev-only "current user" until WorkOS auth lands. The composition root resolves
// the signed-in actor to this fixed id; the seed inserts the matching "You"
// actor with the same id so the two line up. Replace this with a real
// WorkOS-derived identity in a later sprint (see data-model.md §6).
export const DEV_CURRENT_USER_ID = "00000000-0000-4000-8000-000000000005";
