export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-950 px-6 text-center font-sans text-zinc-50">
      <main className="flex flex-col items-center gap-6">
        <span className="rounded-full border border-white/15 px-4 py-1 text-xs font-medium uppercase tracking-widest text-zinc-400">
          Coming Soon
        </span>
        <h1 className="text-5xl font-semibold tracking-tight sm:text-6xl">
          DecisionBroker
        </h1>
        <p className="max-w-md text-lg leading-8 text-zinc-400">
          Smarter decisions, brokered for you. We&apos;re building something
          worth the wait — check back soon.
        </p>
      </main>
      <footer className="absolute bottom-8 text-sm text-zinc-600">
        &copy; {new Date().getFullYear()} DecisionBroker
      </footer>
    </div>
  );
}
