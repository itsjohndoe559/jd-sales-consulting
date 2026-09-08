/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Disable the client-side router cache for dynamic pages. This is a
    // live sales dashboard — freshness matters more than shaving a fetch,
    // and without this, navigating between pages can show stale data for
    // up to 30s after a write (e.g. right after logging a sale).
    staleTimes: {
      dynamic: 0,
      static: 0,
    },
  },
};

module.exports = nextConfig;
