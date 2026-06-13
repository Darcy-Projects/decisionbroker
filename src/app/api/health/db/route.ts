import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { files } from "@/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// TEMPORARY: proves the deployed app can READ and WRITE production Postgres.
// Remove (or protect) once the foundation is verified.
export async function GET() {
  const startedAt = Date.now();
  try {
    const db = getDb();

    // READ
    const rows = (await db.execute(
      sql`select now() as now`,
    )) as unknown as { now: string }[];
    const now = rows[0]?.now;

    // WRITE — insert then immediately delete, proving write capability without
    // leaving data behind.
    const objectKey = `healthcheck-${Date.now()}-${Math.round(
      Math.random() * 1e9,
    )}`;
    const [inserted] = await db
      .insert(files)
      .values({
        ownerUserId: "health-check",
        objectKey,
        fileName: "healthcheck",
        contentType: "text/plain",
        sizeBytes: 0,
      })
      .returning({ id: files.id });
    await db.delete(files).where(eq(files.id, inserted.id));

    return NextResponse.json({
      ok: true,
      read: { now },
      write: { insertedId: inserted.id, cleanedUp: true },
      latencyMs: Date.now() - startedAt,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
