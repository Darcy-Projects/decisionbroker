import { InboxShell } from "@/app/components/inbox/InboxShell";
import { loadInboxData } from "@/app/lib/inbox-data";

// The inbox read path: load from Postgres (through the application services)
// on the server and hand the view models to the client shell.
export default async function Page() {
  const data = await loadInboxData();
  console.log("data", data);
  return <InboxShell initial={data} />;
}
