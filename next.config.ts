import type { NextConfig } from "next";
import path from "path";

// @ts-expect-error - next-pwa does not have official typescript definitions
import withPWAInit from "next-pwa";

// Configure the PWA plugin
const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
});

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

// Wrap your config with the PWA initialization
export default withPWA(nextConfig);