import Link from "next/link";

/**
 * Layout for the authentication route group (/login, /register).
 *
 * Deliberately minimal: a soft full-height background and a centered column,
 * with no global navbar or footer so the sign-in / sign-up flow stays
 * distraction-free. A small "MindCross" wordmark links back home.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center bg-secondary/40 px-4 py-10">
      <header className="w-full max-w-md">
        <Link
          href="/"
          className="font-heading text-xl font-bold tracking-tight text-primary"
        >
          MindCross
        </Link>
      </header>

      <main className="flex w-full max-w-md flex-1 flex-col justify-center py-8">
        {children}
      </main>
    </div>
  );
}
