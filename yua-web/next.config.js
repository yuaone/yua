/** @type {import('next').NextConfig} */
const path = require("path");

const nextConfig = {
  // deploy-web.sh sets this to ".next-build" for zero-downtime deploys
  distDir: process.env.NEXT_BUILD_DIR || ".next",
  /* ==================================================
   * Core
   * ================================================== */
  reactStrictMode: true,

  transpilePackages: ["yua-shared"],

  eslint: {
    ignoreDuringBuilds: true,
  },

  typescript: {
    ignoreBuildErrors: true,
  },

  /* ==================================================
   * DEV Origin (GCP / IP / Web Preview)
   * ================================================== */
  allowedDevOrigins: [
    "34.50.27.221",
    "ssh.cloud.google.com",
    "www.yuaone.com",
    "yuaone.com",
  ],

  /* ==================================================
   * Experimental
   * ================================================== */
  experimental: {
    typedRoutes: true,
    missingSuspenseWithCSRBailout: false,
    optimizePackageImports: ["react", "next"],

    serverActions: {
      allowedOrigins: [
        "http://127.0.0.1:3000",
        "http://localhost:3000",
        "http://34.50.27.221:3000",
        "https://www.yuaone.com",
        "https://yuaone.com",
      ],
    },
  },

  /* ==================================================
   * Webpack Alias
   * ================================================== */
  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,

      "@": path.resolve(__dirname, "src"),
      "@components": path.resolve(__dirname, "src/components"),
      "@hooks": path.resolve(__dirname, "src/hooks"),
      "@lib": path.resolve(__dirname, "src/lib"),
      "@terminal": path.resolve(__dirname, "src/terminal"),
      "@console": path.resolve(__dirname, "src/console"),
      "@styles": path.resolve(__dirname, "src/styles"),
      "@types": path.resolve(__dirname, "src/types"),
    };

    return config;
  },

  /* ==================================================
   * 🔥 REWRITES — API → ENGINE
   * ================================================== */
  async rewrites() {
    return [
      {
        source: "/me",
        destination: "http://127.0.0.1:4000/me",
      },
      {
        source: "/api/:path*",
        destination: "http://127.0.0.1:4000/api/:path*",
      },
    ];
  },

  /* ==================================================
   * 🔐 SECURITY HEADERS + CSP
   * ================================================== */
  async headers() {
    const csp = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",

      "img-src 'self' data: https:",
      "font-src 'self' data: https:",

      "style-src 'self' 'unsafe-inline'",

      /* Next dev needs unsafe-eval */
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://accounts.google.com",
      "script-src-elem 'self' 'unsafe-inline' https://apis.google.com https://accounts.google.com",
      "frame-src https://accounts.google.com https://yua-ai-console.firebaseapp.com",

      /* 🔥 핵심: Firebase + API */
      [
        "connect-src",
        "'self'",
        "https://www.yuaone.com",
        "http://127.0.0.1:4000",
        "http://34.50.27.221:4000",
        "wss://www.yuaone.com",
        "ws://127.0.0.1:4000",
        "ws://34.50.27.221:4000",
        "https://securetoken.googleapis.com",
        "https://identitytoolkit.googleapis.com",
        "https://www.googleapis.com",
        "https://firestore.googleapis.com",
        "https://firebase.googleapis.com",
        "https://accounts.google.com",
        "https://oauth2.googleapis.com",
      ].join(" "),
    ].join("; ");

    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Permissions-Policy", value: "camera=(), geolocation=()" },

          /* HTTPS에서만 의미 있음 */
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },

          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
          { key: "X-DNS-Prefetch-Control", value: "off" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
