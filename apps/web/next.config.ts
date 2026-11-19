import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@blueprint/domain",
    "@blueprint/validation",
    "@blueprint/database",
    "@blueprint/ai-providers",
    "@blueprint/ui",
  ],
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
