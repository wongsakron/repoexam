/** @type {import('next').NextConfig} */
const nextConfig = {
  // standalone output keeps the Docker image small (server.js + only the needed node_modules)
  output: 'standalone',
  poweredByHeader: false,
};

export default nextConfig;
