import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `standalone` produces the self-contained server the Docker image runs.
  // Vercel uses its own build pipeline, so skip it there (VERCEL is set in
  // Vercel's build env) to get a native, optimized deployment. The e2e suite
  // serves the app with `next start`, which doesn't support standalone output —
  // PLAYWRIGHT=1 (set by the e2e build) disables it for that run too.
  output:
    process.env.VERCEL || process.env.PLAYWRIGHT ? undefined : "standalone",
  // Friendly aliases for the registration page. "Sign up" is common wording, so
  // anyone landing on /signup (typed URL, old link, bookmark) is sent to the
  // real /register route instead of hitting a 404.
  async redirects() {
    return [
      { source: "/signup", destination: "/register", permanent: true },
      { source: "/sign-up", destination: "/register", permanent: true },
      { source: "/signin", destination: "/login", permanent: true },
      { source: "/sign-in", destination: "/login", permanent: true },
    ];
  },
};

export default nextConfig;
