/** @type {import('next').NextConfig} */
const path = require("path");

const nextConfig = {
  reactStrictMode: true,

  // 🔥 dev에서 외부 Origin 허용
  //  - 34.50.27.221: 직접 IP 접속
  //  - ssh.cloud.google.com: GCP 브라우저 SSH/Web Preview
  allowedDevOrigins: [
    "34.50.27.221",
    "ssh.cloud.google.com",
  ],

  experimental: {
    optimizePackageImports: ["react", "next"],
    serverActions: { allowedOrigins: ["*"] },
  },

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

  async rewrites() {
  return [
    {
      source: "/me",
      destination: "http://127.0.0.1:4000/me",
    },
    {
      source: "/stream/:path*",
      destination: "http://127.0.0.1:5000/:path*",
    },
    {
      source: "/api/:path*",
      destination: "http://127.0.0.1:4000/:path*",
    },
    {
      source: "/kernel/:path*",
      destination: "http://127.0.0.1:7000/:path*",
      },
    ];
  },
};

module.exports = nextConfig;
