// POST /api/dev/seed — dev-only: (re)load the inbox mock content into Postgres.
// Disabled in production. Goes through the composition root's seedDatabase so
// the interface tier never imports a data-tier adapter directly.

import { seedDatabase } from "@/infra/config/container";
import { errorResponse } from "@/app/lib/api";

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return Response.json({ error: "Not available in production" }, {
      status: 403,
    });
  }
  try {
    const result = await seedDatabase();
    return Response.json({ seeded: true, ...result });
  } catch (error) {
    return errorResponse(error);
  }
}
