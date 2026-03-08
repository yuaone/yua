/** @type {import('next').NextConfig} */
const path = require("path");

const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["yua-shared"],
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },

  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@": path.resolve(__dirname, "src"),
    };
    return config;
  },

  async rewrites() {
    return [
      { source: "/api/:path*", destination: "http://127.0.0.1:4000/api/:path*" },
    ];
  },
};

module.exports = nextConfig;
