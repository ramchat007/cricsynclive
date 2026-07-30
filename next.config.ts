import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // 1. Webpack config (used if you run standard build or force webpack)
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@mediapipe/pose": path.resolve(__dirname, "mocks/mediapipe.js"),
    };
    return config;
  },

  // 2. Turbopack config (used by default in Next 16 development)
  turbopack: {
    resolveAlias: {
      "@mediapipe/pose": "./mocks/mediapipe.js",
    },
  },
};

export default nextConfig;
