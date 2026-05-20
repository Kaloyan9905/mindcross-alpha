import Link from "next/link";

/**
 * Layout for the authentication route group (/login, /register).
 *
 * Deliberately minimal: a plain white full-height background and a centered
 * column, with no global navbar or footer so the sign-in / sign-up flow stays
 * distraction-free. A small "MindCross" wordmark links back home.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center bg-background px-6 py-10">
      <header className="w-full max-w-sm">
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight"
        >
          MindCross
        </Link>
      </header>

      <main className="flex w-full max-w-sm flex-1 flex-col justify-center py-12">
        {children}
      </main>
    </div>
  );
}
