import type { NextConfig } from "next"
import withPWAInit from "@ducanh2912/next-pwa"

const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  customWorkerSrc: "worker",
  workboxOptions: {
    disableDevLogs: true,
    runtimeCaching: [
      {
        urlPattern: /^\/grocery/,
        handler: "NetworkFirst",
        options: {
          cacheName: "grocery-cache",
          networkTimeoutSeconds: 5,
          expiration: { maxEntries: 5, maxAgeSeconds: 7 * 24 * 60 * 60 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
      {
        urlPattern: /^\/recipes/,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "recipes-cache",
          expiration: { maxEntries: 60, maxAgeSeconds: 7 * 24 * 60 * 60 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
      {
        urlPattern: /^\/plan/,
        handler: "NetworkFirst",
        options: {
          cacheName: "plan-cache",
          networkTimeoutSeconds: 5,
          expiration: { maxEntries: 5, maxAgeSeconds: 24 * 60 * 60 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
      {
        urlPattern: /\/_next\/image/,
        handler: "CacheFirst",
        options: {
          cacheName: "image-cache",
          expiration: { maxEntries: 100, maxAgeSeconds: 30 * 24 * 60 * 60 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
    ],
  },
})

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  allowedDevOrigins: ["0.0.0.0", "localhost", "192.168.8.82", "100.113.96.53"],
  turbopack: {},
}

export default withPWA(nextConfig)
