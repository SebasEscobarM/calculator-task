import type { NextConfig } from "next";

// The browser only talks to Next.js: requests to /api/* are proxied to the Go
// backend, so the backend needs no CORS setup and its address never reaches
// the client bundle. Rewrites are resolved when the dev server starts or when
// the app is built, and `next start` keeps the value from the build.
const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8080";

const nextConfig: NextConfig = {
  // This app is its own workspace: don't infer the root from lockfiles found
  // in parent directories.
  turbopack: { root: __dirname },
  // Otherwise `next dev` writes AGENTS.md and CLAUDE.md into the project when
  // it detects an AI coding agent.
  agentRules: false,
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${backendUrl}/api/:path*` }];
  },
};

export default nextConfig;
