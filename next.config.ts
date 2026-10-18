import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export for Cloudflare Pages. Dynamic segments are not exportable,
  // so detail routes read their ids from query params instead (see
  // src/lib/routes.ts). /api/* is served by Cloudflare Pages Functions.
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
