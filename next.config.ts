import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `standalone` produces the self-contained server the Docker image runs.
  // Vercel uses its own build pipeline, so skip it there (VERCEL is set in
  // Vercel's build env) to get a native, optimized deployment.
  output: process.env.VERCEL ? undefined : "standalone",
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
