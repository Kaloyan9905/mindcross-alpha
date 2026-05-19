export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-white p-8">
      <div className="max-w-xl space-y-6 text-center">
        <div className="space-y-2">
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-900">
            mindcross-alpha
          </h1>
          <p className="text-zinc-500">
            Next.js + Drizzle + PostgreSQL skeleton.
          </p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-left text-sm text-zinc-700">
          <p className="mb-2 font-medium text-zinc-900">Endpoints</p>
          <ul className="space-y-1">
            <li>
              <code className="rounded bg-white px-1.5 py-0.5 text-zinc-800">
                GET /api/health
              </code>{" "}
              — liveness + database readiness
            </li>
          </ul>
        </div>
        <p className="text-xs text-zinc-400">
          Alpha build. No business logic yet.
        </p>
      </div>
    </main>
  );
}
