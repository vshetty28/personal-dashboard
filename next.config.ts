import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prisma's query engine is a native .node binary, loaded via a dynamic
  // require() based on detected platform — Next's static file tracer can miss
  // it, especially with a custom generator `output` path like ours
  // (src/generated/prisma instead of the default node_modules/.prisma/client).
  // Without this, the binary can be generated during build but not actually
  // get bundled into the deployed serverless function.
  outputFileTracingIncludes: {
    "/*": ["./src/generated/prisma/**/*"],
  },
};

export default nextConfig;
