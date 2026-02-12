/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  webpack: (config) => {
    config.externals.push("better-sqlite3");
    return config;
  },
};

export default nextConfig;
