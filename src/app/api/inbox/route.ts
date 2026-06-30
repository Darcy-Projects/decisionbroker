// GET /api/inbox — the inbox read contract. Returns boards, archived boards,
// people, and all decisions as view models. Thin: delegate to the server read
// path, serialize. (Mutations live under /api/decisions.)

import { loadInboxData } from "@/app/lib/inbox-data";
import { errorResponse } from "@/app/lib/api";

export async function GET() {
  try {
    const data = await loadInboxData();
    return Response.json(data);
  } catch (error) {
    return errorResponse(error);
  }
}
